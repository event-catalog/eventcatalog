import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import ignore from 'ignore';
import { rcompare, valid } from 'semver';
import { getAdrs } from './adrs';
import { getAgents } from './agents';
import { getChannels } from './channels';
import { getCommands } from './commands';
import { getDataProducts } from './data-products';
import { getDataStores } from './data-stores';
import { getDiagrams } from './diagrams';
import { getDomains } from './domains';
import { getEntities } from './entities';
import { getEvents } from './events';
import { getFlows } from './flows';
import type { Index, IndexAsset, IndexResource, IndexResourceType, IndexSidecar } from './index-types';
import { getResourcePath } from './internal/resources';
import { getFiles } from './internal/utils';
import { getQueries } from './queries';
import { getServices } from './services';
import { getSystems } from './systems';
import { getTeams } from './teams';
import type {
  Adr,
  BaseSchema,
  Channel,
  ChannelPointer,
  Container,
  DataProductOutputPointer,
  FlowStep,
  ReceivesPointer,
  ResourcePointer,
  SchemaPointer,
  SendsPointer,
  Specification,
  Specifications,
  SystemActorRelationship,
  SystemRelationshipPointer,
  Team,
} from './types';
import { getUsers } from './users';

type BuildIndexOptions = {
  source: string;
  commit: string;
  hashContent?: boolean;
};

type IndexableResource = {
  id: string;
  version?: string;
  name: string;
  draft?: BaseSchema['draft'];
  deprecated?: BaseSchema['deprecated'];
  owners?: string[];
  schemaPath?: string;
  schemas?: SchemaPointer[];
  specifications?: Specifications | Specification[];
  container_type?: Container['container_type'];
  steps?: FlowStep[];
  status?: Adr['status'];
  appliesTo?: Adr['appliesTo'];
  supersedes?: Adr['supersedes'];
  supersededBy?: Adr['supersededBy'];
  amends?: Adr['amends'];
  amendedBy?: Adr['amendedBy'];
  related?: Adr['related'];
  members?: Team['members'];
  diagrams?: ResourcePointer[];
  sends?: SendsPointer[];
  receives?: ReceivesPointer[];
  channels?: ChannelPointer[];
  address?: Channel['address'];
  protocols?: Channel['protocols'];
  deliveryGuarantee?: Channel['deliveryGuarantee'];
  routes?: Channel['routes'];
  parameters?: Channel['parameters'];
  services?: ResourcePointer[];
  agents?: ResourcePointer[];
  domains?: ResourcePointer[];
  systems?: ResourcePointer[];
  entities?: ResourcePointer[];
  dataProducts?: ResourcePointer[];
  flows?: ResourcePointer[];
  writesTo?: ResourcePointer[];
  readsFrom?: ResourcePointer[];
  containers?: ResourcePointer[];
  relationships?: SystemRelationshipPointer[];
  actors?: SystemActorRelationship[];
  inputs?: ResourcePointer[];
  outputs?: DataProductOutputPointer[];
};

type IndexableResourceEntry = {
  type: IndexResourceType;
  resource: IndexableResource;
  sourcePath?: string;
};

const normalizeSpecifications = async (resource: IndexableResource, resourcePath: string, hashContent: boolean) => {
  if (resource.specifications === undefined) return undefined;

  const specifications: Specification[] = Array.isArray(resource.specifications)
    ? resource.specifications
    : [
        { type: 'asyncapi' as const, path: resource.specifications.asyncapiPath },
        { type: 'openapi' as const, path: resource.specifications.openapiPath },
        { type: 'graphql' as const, path: resource.specifications.graphqlPath },
      ].flatMap(({ type, path }) => (path ? [{ type, path }] : []));

  return Promise.all(
    specifications.map(async (specification) => ({
      ...specification,
      ...(hashContent
        ? {
            hash: `sha256:${createHash('sha256')
              .update(await fs.readFile(path.join(path.dirname(resourcePath), specification.path)))
              .digest('hex')}`,
          }
        : {}),
    }))
  );
};

const getFlowReferences = (steps: FlowStep[]) =>
  steps.flatMap((step) => [
    ...(step.service ? [{ kind: 'service' as const, ...step.service }] : []),
    ...(step.message ? [{ kind: 'message' as const, ...step.message }] : []),
    ...(step.agent ? [{ kind: 'agent' as const, ...step.agent }] : []),
    ...(step.container ? [{ kind: 'container' as const, ...step.container }] : []),
    ...(step.dataProduct ? [{ kind: 'data-product' as const, ...step.dataProduct }] : []),
    ...(step.flow ? [{ kind: 'flow' as const, ...step.flow }] : []),
  ]);

const compareText = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);

const compareVersions = (left?: string, right?: string) => {
  if (left === right) return 0;
  if (left === undefined) return 1;
  if (right === undefined) return -1;
  if (valid(left) && valid(right)) return rcompare(left, right);
  return compareText(right, left);
};

const compareIndexResources = (
  left: { type: string; id: string; version?: string },
  right: { type: string; id: string; version?: string }
) => compareText(left.type, right.type) || compareText(left.id, right.id) || compareVersions(left.version, right.version);

const toCatalogPath = (directory: string, filePath: string) => path.relative(directory, filePath).split(path.sep).join('/');

const loadIgnoreRules = async (directory: string) => {
  try {
    return ignore().add(await fs.readFile(path.join(directory, '.eventcatalogignore'), 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
};

const getFederatedDirectoryResources = async (
  directory: string,
  type: 'team' | 'user',
  resourceDirectory: 'teams' | 'users',
  ignoreRules?: ignore.Ignore
): Promise<IndexableResourceEntry[]> => {
  const files = await getFiles(path.join(directory, 'federated', '**', resourceDirectory, '*.{md,mdx}'));
  const resourcePathPattern = new RegExp(`^(?:federated/[^/]+/)+${resourceDirectory}/[^/]+\\.mdx?$`, 'i');

  return files
    .filter((file) => {
      const catalogPath = toCatalogPath(directory, file);
      return resourcePathPattern.test(catalogPath) && !ignoreRules?.ignores(catalogPath);
    })
    .map((sourcePath) => {
      const { data } = matter.read(sourcePath);
      return { type, resource: data as IndexableResource, sourcePath };
    });
};

const normalizeAssets = async (directory: string, hashContent: boolean, ignoreRules?: ignore.Ignore) => {
  const collectFiles = async (currentDirectory: string): Promise<string[]> => {
    let entries;

    try {
      entries = await fs.readdir(currentDirectory, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }

    const files = await Promise.all(
      entries
        .sort((left, right) => compareText(left.name, right.name))
        .map(async (entry): Promise<string[]> => {
          const entryPath = path.join(currentDirectory, entry.name);
          const catalogPath = toCatalogPath(directory, entryPath);

          if (entry.isDirectory()) return ignoreRules?.ignores(`${catalogPath}/`) ? [] : collectFiles(entryPath);
          return entry.isFile() && !ignoreRules?.ignores(catalogPath) ? [entryPath] : [];
        })
    );

    return files.flat();
  };
  const assetPaths = (
    await Promise.all(['components', 'public'].map((assetDirectory) => collectFiles(path.join(directory, assetDirectory))))
  )
    .flat()
    .sort(compareText);
  const assets: IndexAsset[] = await Promise.all(
    assetPaths.map(async (assetPath) => ({
      path: toCatalogPath(directory, assetPath),
      ...(hashContent
        ? {
            hash: `sha256:${createHash('sha256')
              .update(await fs.readFile(assetPath))
              .digest('hex')}`,
          }
        : {}),
    }))
  );

  return assets.length === 0 ? undefined : assets;
};

const normalizeSchemas = async (resource: IndexableResource, resourcePath: string, hashContent: boolean) => {
  const schemas = resource.schemas ?? (resource.schemaPath ? [{ path: resource.schemaPath, default: true }] : undefined);

  if (schemas === undefined) return undefined;

  return Promise.all(
    schemas.map(async ({ file, ...schema }) => {
      const schemaPath = file ?? schema.path;

      return {
        ...schema,
        ...(schemaPath === undefined ? {} : { path: schemaPath }),
        ...(hashContent && schemaPath
          ? {
              hash: `sha256:${createHash('sha256')
                .update(await fs.readFile(path.join(path.dirname(resourcePath), schemaPath)))
                .digest('hex')}`,
            }
          : {}),
      };
    })
  );
};

const IGNORED_SIDECAR_FILES = new Set(['.DS_Store', '.gitignore', '.gitkeep', '.npmignore', 'Thumbs.db', 'desktop.ini']);
const IGNORED_SIDECAR_DIRECTORIES = new Set(['.git', '.hg', '.svn', 'node_modules']);

const normalizeSidecars = async (
  directory: string,
  resourcePath: string,
  resourceDirectories: Set<string>,
  representedPaths: Set<string>,
  hashContent: boolean,
  ignoreRules?: ignore.Ignore
) => {
  // Teams and users are individual files in shared directories. Only resources
  // backed by their own index file own the surrounding directory tree.
  if (!/^index\.mdx?$/i.test(path.basename(resourcePath))) return undefined;

  const collectFiles = async (currentDirectory: string): Promise<string[]> => {
    let entries;

    try {
      entries = await fs.readdir(currentDirectory, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }

    const files = await Promise.all(
      entries
        .sort((left, right) => compareText(left.name, right.name))
        .map(async (entry): Promise<string[]> => {
          const entryPath = path.join(currentDirectory, entry.name);
          const resolvedEntryPath = path.resolve(entryPath);
          const catalogPath = toCatalogPath(directory, entryPath);

          if (entry.isDirectory()) {
            if (IGNORED_SIDECAR_DIRECTORIES.has(entry.name) || resourceDirectories.has(resolvedEntryPath)) return [];
            if (ignoreRules?.ignores(`${catalogPath}/`)) return [];
            return collectFiles(entryPath);
          }
          if (!entry.isFile()) return [];
          if (IGNORED_SIDECAR_FILES.has(entry.name) || representedPaths.has(resolvedEntryPath)) return [];
          if (entry.name.endsWith('~') || /^\..*\.sw[op]$/.test(entry.name)) return [];
          if (ignoreRules?.ignores(catalogPath)) return [];

          return [entryPath];
        })
    );

    return files.flat();
  };
  const sidecarPaths = (await collectFiles(path.dirname(resourcePath))).sort(compareText);
  const sidecars: IndexSidecar[] = await Promise.all(
    sidecarPaths.map(async (sidecarPath) => ({
      path: toCatalogPath(directory, sidecarPath),
      ...(hashContent
        ? {
            hash: `sha256:${createHash('sha256')
              .update(await fs.readFile(sidecarPath))
              .digest('hex')}`,
          }
        : {}),
    }))
  );

  return sidecars.length === 0 ? undefined : sidecars;
};

const toIndexResource = async (
  directory: string,
  type: IndexResourceType,
  resource: IndexableResource,
  hashContent: boolean,
  sourcePath: string,
  resourceDirectories: Set<string>,
  ignoreRules?: ignore.Ignore
): Promise<IndexResource> => {
  const { id, version, name } = resource;
  const schemas = await normalizeSchemas(resource, sourcePath, hashContent);
  const specifications = await normalizeSpecifications(resource, sourcePath, hashContent);
  const representedPaths = new Set(
    [
      sourcePath,
      ...(schemas ?? []).flatMap((schema) => (schema.path ? [path.join(path.dirname(sourcePath), schema.path)] : [])),
      ...(specifications ?? []).map((specification) => path.join(path.dirname(sourcePath), specification.path)),
    ].map((representedPath) => path.resolve(representedPath))
  );
  const sidecars = await normalizeSidecars(
    directory,
    sourcePath,
    resourceDirectories,
    representedPaths,
    hashContent,
    ignoreRules
  );

  return {
    type,
    id,
    ...(version === undefined ? {} : { version }),
    name,
    contentPath: toCatalogPath(directory, sourcePath),
    ...(hashContent
      ? {
          contentHash: `sha256:${createHash('sha256')
            .update(await fs.readFile(sourcePath))
            .digest('hex')}`,
        }
      : {}),
    ...(resource.draft === undefined ? {} : { draft: resource.draft }),
    ...(resource.deprecated === undefined ? {} : { deprecated: resource.deprecated }),
    ...(resource.owners === undefined ? {} : { owners: resource.owners }),
    ...(resource.diagrams === undefined ? {} : { diagrams: resource.diagrams }),
    ...(schemas === undefined ? {} : { schemas }),
    ...(specifications === undefined ? {} : { specifications }),
    ...(sidecars === undefined ? {} : { sidecars }),
    ...(resource.container_type === undefined ? {} : { container_type: resource.container_type }),
    ...(resource.steps === undefined ? {} : { references: getFlowReferences(resource.steps) }),
    ...(resource.sends === undefined ? {} : { sends: resource.sends }),
    ...(resource.receives === undefined ? {} : { receives: resource.receives }),
    ...(resource.channels === undefined ? {} : { channels: resource.channels }),
    ...(resource.address === undefined ? {} : { address: resource.address }),
    ...(resource.protocols === undefined ? {} : { protocols: resource.protocols }),
    ...(resource.deliveryGuarantee === undefined ? {} : { deliveryGuarantee: resource.deliveryGuarantee }),
    ...(resource.routes === undefined ? {} : { routes: resource.routes }),
    ...(resource.parameters === undefined ? {} : { parameters: resource.parameters }),
    ...(resource.services === undefined ? {} : { services: resource.services }),
    ...(resource.agents === undefined ? {} : { agents: resource.agents }),
    ...(resource.domains === undefined ? {} : { domains: resource.domains }),
    ...(resource.systems === undefined ? {} : { systems: resource.systems }),
    ...(resource.entities === undefined ? {} : { entities: resource.entities }),
    ...(resource.dataProducts === undefined ? {} : { dataProducts: resource.dataProducts }),
    ...(resource.flows === undefined ? {} : { flows: resource.flows }),
    ...(resource.writesTo === undefined ? {} : { writesTo: resource.writesTo }),
    ...(resource.readsFrom === undefined ? {} : { readsFrom: resource.readsFrom }),
    ...(resource.containers === undefined ? {} : { containers: resource.containers }),
    ...(resource.relationships === undefined ? {} : { relationships: resource.relationships }),
    ...(resource.actors === undefined ? {} : { actors: resource.actors }),
    ...(resource.inputs === undefined ? {} : { inputs: resource.inputs }),
    ...(resource.outputs === undefined ? {} : { outputs: resource.outputs }),
    ...(resource.status === undefined ? {} : { status: resource.status }),
    ...(resource.appliesTo === undefined ? {} : { appliesTo: resource.appliesTo }),
    ...(resource.supersedes === undefined ? {} : { supersedes: resource.supersedes }),
    ...(resource.supersededBy === undefined ? {} : { supersededBy: resource.supersededBy }),
    ...(resource.amends === undefined ? {} : { amends: resource.amends }),
    ...(resource.amendedBy === undefined ? {} : { amendedBy: resource.amendedBy }),
    ...(resource.related === undefined ? {} : { related: resource.related }),
    ...(resource.members === undefined ? {} : { members: resource.members }),
  };
};

export const buildIndex =
  (directory: string) =>
  async ({ source, commit, hashContent = true }: BuildIndexOptions): Promise<Index> => {
    const ignoreRules = await loadIgnoreRules(directory);
    const [
      domains,
      channels,
      events,
      commands,
      queries,
      services,
      systems,
      dataProducts,
      dataStores,
      entities,
      flows,
      adrs,
      agents,
      teams,
      users,
      diagrams,
    ] = await Promise.all([
      getDomains(directory)(),
      getChannels(directory)(),
      getEvents(directory)(),
      getCommands(directory)(),
      getQueries(directory)(),
      getServices(directory)(),
      getSystems(directory)(),
      getDataProducts(directory)(),
      getDataStores(directory)(),
      getEntities(directory)(),
      getFlows(directory)(),
      getAdrs(directory)(),
      getAgents(directory)(),
      getTeams(path.join(directory, 'teams'))(),
      getUsers(directory)(),
      getDiagrams(directory)(),
    ]);
    const federatedDirectoryResources = await Promise.all([
      getFederatedDirectoryResources(directory, 'team', 'teams', ignoreRules),
      getFederatedDirectoryResources(directory, 'user', 'users', ignoreRules),
    ]);
    const indexableResources: IndexableResourceEntry[] = [
      ...(domains ?? []).map((resource) => ({ type: 'domain' as const, resource })),
      ...(channels ?? []).map((resource) => ({ type: 'channel' as const, resource })),
      ...(events ?? []).map((resource) => ({ type: 'event' as const, resource })),
      ...(commands ?? []).map((resource) => ({ type: 'command' as const, resource })),
      ...(queries ?? []).map((resource) => ({ type: 'query' as const, resource })),
      ...(services ?? []).map((resource) => ({ type: 'service' as const, resource })),
      ...(systems ?? []).map((resource) => ({ type: 'system' as const, resource })),
      ...(dataProducts ?? []).map((resource) => ({ type: 'data-product' as const, resource })),
      ...(dataStores ?? []).map((resource) => ({ type: 'container' as const, resource })),
      ...(entities ?? []).map((resource) => ({ type: 'entity' as const, resource })),
      ...(flows ?? []).map((resource) => ({ type: 'flow' as const, resource })),
      ...(adrs ?? []).map((resource) => ({ type: 'adr' as const, resource })),
      ...(agents ?? []).map((resource) => ({ type: 'agent' as const, resource })),
      ...(teams ?? []).map((resource) => ({
        type: 'team' as const,
        resource,
        sourcePath: path.join(directory, 'teams', `${resource.id}.mdx`),
      })),
      ...(users ?? []).map((resource) => ({
        type: 'user' as const,
        resource,
        sourcePath: path.join(directory, 'users', `${resource.id}.mdx`),
      })),
      ...federatedDirectoryResources.flat(),
      ...(diagrams ?? []).map((resource) => ({ type: 'diagram' as const, resource })),
    ];
    const locatedResources = await Promise.all(
      indexableResources.map(async (entry) => {
        const sourcePath =
          entry.sourcePath ?? (await getResourcePath(directory, entry.resource.id, entry.resource.version))?.fullPath;

        if (!sourcePath) throw new Error(`Cannot find ${entry.type} ${entry.resource.id} (${entry.resource.version})`);
        return { ...entry, sourcePath };
      })
    );
    const resourceDirectories = new Set(
      locatedResources
        .filter(({ sourcePath }) => /^index\.mdx?$/i.test(path.basename(sourcePath)))
        .map(({ sourcePath }) => path.resolve(path.dirname(sourcePath)))
    );
    const resources = await Promise.all(
      locatedResources.map(({ type, resource, sourcePath }) =>
        toIndexResource(directory, type, resource, hashContent, sourcePath, resourceDirectories, ignoreRules)
      )
    );
    const assets = await normalizeAssets(directory, hashContent, ignoreRules);

    return {
      indexVersion: 1 as const,
      source,
      commit,
      resources: resources.sort(compareIndexResources),
      ...(assets === undefined ? {} : { assets }),
    };
  };
