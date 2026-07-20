import { maxSatisfying, validRange } from 'semver';
import { getAdrs } from './adrs';
import { getAgents } from './agents';
import { getChannels } from './channels';
import { getCommands } from './commands';
import { getDataProducts } from './data-products';
import { getDataStores } from './data-stores';
import { getDomains } from './domains';
import { getEntities } from './entities';
import { getEvents } from './events';
import { getFlows } from './flows';
import { getQueries } from './queries';
import { getServices } from './services';
import { getSystems } from './systems';
import type {
  BaseSchema,
  CatalogGraph,
  CatalogGraphNode,
  CatalogGraphOptions,
  CatalogGraphResource,
  CatalogGraphResourceType,
  CatalogGraphRoot,
  GetCatalogGraph,
  ResourcePointer,
} from './types';

type CatalogResource = BaseSchema & {
  hidden?: boolean;
  [key: string]: any;
};

type ResourceCollectionLoader = (options?: { latestOnly?: boolean }) => Promise<CatalogResource[] | undefined>;

type ResourceIndex = {
  byId: Map<string, CatalogResource[]>;
  byVersion: Map<string, CatalogResource>;
};

type ResolvedResource = {
  type: CatalogGraphResourceType;
  resource: CatalogResource;
};

type AncestorPath = {
  key: string;
  parent?: AncestorPath;
};

type AdrTarget = {
  pointer: ResourcePointer;
  resource: CatalogResource;
};

const DEFAULT_DEPTH = Number.POSITIVE_INFINITY;

const RESOURCE_TYPE_ORDER: CatalogGraphResourceType[] = [
  'domain',
  'system',
  'service',
  'agent',
  'event',
  'command',
  'query',
  'channel',
  'entity',
  'container',
  'data-product',
  'flow',
  'adr',
];

const typeOrder = new Map(RESOURCE_TYPE_ORDER.map((type, index) => [type, index]));
const NON_ADR_RESOURCE_TYPES = RESOURCE_TYPE_ORDER.filter((type) => type !== 'adr');
const NESTED_TRAVERSAL_CONCURRENCY = 16;

const RESOURCE_TYPE_ALIASES: Record<string, CatalogGraphResourceType> = {
  domains: 'domain',
  systems: 'system',
  services: 'service',
  agents: 'agent',
  events: 'event',
  commands: 'command',
  queries: 'query',
  channels: 'channel',
  entities: 'entity',
  containers: 'container',
  'data-products': 'data-product',
  flows: 'flow',
  adrs: 'adr',
};

const resourceKey = (resource: CatalogGraphResource) => `${resource.type}:${resource.id}:${resource.version}`;

const toGraphResource = (type: CatalogGraphResourceType, resource: CatalogResource): CatalogGraphResource => ({
  type,
  id: resource.id,
  version: resource.version,
});

const sortResources = (left: CatalogGraphResource, right: CatalogGraphResource) => {
  const typeComparison = (typeOrder.get(left.type) || 0) - (typeOrder.get(right.type) || 0);
  if (typeComparison !== 0) return typeComparison;

  const idComparison = left.id.localeCompare(right.id);
  return idComparison !== 0 ? idComparison : left.version.localeCompare(right.version);
};

const normalizeResourceType = (type: string | undefined): CatalogGraphResourceType | undefined => {
  if (!type) return undefined;
  if (RESOURCE_TYPE_ORDER.includes(type as CatalogGraphResourceType)) return type as CatalogGraphResourceType;
  return RESOURCE_TYPE_ALIASES[type];
};

const indexResources = (resources: CatalogResource[]): ResourceIndex => {
  const byId = new Map<string, CatalogResource[]>();
  const byVersion = new Map<string, CatalogResource>();

  for (const resource of resources) {
    const versions = byId.get(resource.id);
    if (versions) versions.push(resource);
    else byId.set(resource.id, [resource]);
    byVersion.set(`${resource.id}:${resource.version}`, resource);
  }

  return { byId, byVersion };
};

const pathIncludes = (path: AncestorPath, key: string) => {
  let current: AncestorPath | undefined = path;
  while (current) {
    if (current.key === key) return true;
    current = current.parent;
  }
  return false;
};

const mapWithConcurrency = async <Input, Output>(
  items: Input[],
  concurrency: number,
  transform: (item: Input) => Promise<Output>
) => {
  const results = new Array<Output>(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await transform(items[index]);
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, worker);
  await Promise.all(workers);
  return results;
};

const validateDepth = (depth: number) => {
  if (!Number.isInteger(depth) || depth < 0) {
    throw new Error('Graph depth must be a non-negative integer');
  }
};

/**
 * Returns the resources reachable from a catalog resource.
 *
 * Depth zero returns only the root, depth one includes its direct children,
 * and each additional level traverses the relationships of those children.
 * When depth is omitted, every reachable relationship is traversed. Nested
 * output is returned by default. Pass `flat: true` to return one deduplicated
 * resource list instead.
 */
export const getGraph = (directory: string): GetCatalogGraph => {
  const graph = async (root: CatalogGraphRoot, options: CatalogGraphOptions = {}): Promise<CatalogGraph | undefined> => {
    const depth = options.depth ?? DEFAULT_DEPTH;
    if (options.depth !== undefined) validateDepth(depth);

    const collectionLoaders: Record<CatalogGraphResourceType, ResourceCollectionLoader> = {
      domain: getDomains(directory),
      system: getSystems(directory),
      service: getServices(directory),
      agent: getAgents(directory),
      event: getEvents(directory),
      command: getCommands(directory),
      query: getQueries(directory),
      flow: getFlows(directory),
      channel: getChannels(directory),
      entity: getEntities(directory),
      container: getDataStores(directory),
      'data-product': getDataProducts(directory),
      adr: getAdrs(directory),
    };

    const latestIndexCache = new Map<CatalogGraphResourceType, Promise<ResourceIndex>>();
    const allVersionsIndexCache = new Map<CatalogGraphResourceType, Promise<ResourceIndex>>();
    const adjacencyCache = new Map<string, Promise<ResolvedResource[]>>();

    const loadLatestIndex = (type: CatalogGraphResourceType) => {
      const cachedIndex = latestIndexCache.get(type);
      if (cachedIndex) return cachedIndex;

      const index = collectionLoaders[type]({ latestOnly: true }).then((resources) => indexResources(resources || []));
      latestIndexCache.set(type, index);
      return index;
    };

    const loadAllVersionsIndex = (type: CatalogGraphResourceType) => {
      const cachedIndex = allVersionsIndexCache.get(type);
      if (cachedIndex) return cachedIndex;

      const latestIndex = latestIndexCache.get(type);
      const index = Promise.all([collectionLoaders[type](), latestIndex]).then(([resources, loadedLatestIndex]) => {
        const allVersionsIndex = indexResources(resources || []);

        // Reuse latest resource objects when the all-versions query contains
        // the same id and version, avoiding duplicate retained markdown data.
        for (const [id, latestResources] of loadedLatestIndex?.byId || []) {
          const latestResource = latestResources[0];
          if (!latestResource) continue;

          const key = `${id}:${latestResource.version}`;
          if (!allVersionsIndex.byVersion.has(key)) continue;

          allVersionsIndex.byVersion.set(key, latestResource);
          const versions = allVersionsIndex.byId.get(id);
          const matchingVersion = versions?.findIndex((resource) => resource.version === latestResource.version) ?? -1;
          if (versions && matchingVersion !== -1) versions[matchingVersion] = latestResource;
        }

        return allVersionsIndex;
      });
      allVersionsIndexCache.set(type, index);
      return index;
    };

    const read = async (type: CatalogGraphResourceType, pointer: ResourcePointer) => {
      const latestIndex = await loadLatestIndex(type);
      const latestResource = latestIndex.byId.get(pointer.id)?.[0];

      if (!pointer.version || pointer.version === 'latest') {
        return latestResource;
      }

      if (latestResource?.version === pointer.version) return latestResource;

      const allVersionsIndex = await loadAllVersionsIndex(type);
      const exactMatch = allVersionsIndex.byVersion.get(`${pointer.id}:${pointer.version}`);
      if (exactMatch) return exactMatch;

      const range = validRange(pointer.version);
      if (!range) return undefined;

      const candidates = allVersionsIndex.byId.get(pointer.id) || [];
      const version = maxSatisfying(
        candidates.map((resource) => resource.version),
        range
      );
      return candidates.find((resource) => resource.version === version);
    };

    const resolvePointer = async (pointer: ResourcePointer, candidateTypes: CatalogGraphResourceType[]) => {
      const explicitType = normalizeResourceType(pointer.type);
      if (pointer.type && !explicitType) return [];

      const types = explicitType ? [explicitType] : candidateTypes;
      const resolved = await Promise.all(
        types.map(async (type) => {
          const resource = await read(type, pointer);
          return resource && resource.hidden !== true ? { type, resource } : undefined;
        })
      );

      return resolved.filter((resource): resource is ResolvedResource => resource !== undefined);
    };

    const resolvePointers = async (pointers: ResourcePointer[], candidateTypes: CatalogGraphResourceType[]) => {
      const resolved = await Promise.all(pointers.map((pointer) => resolvePointer(pointer, candidateTypes)));
      return resolved.flat();
    };

    let adrTargetIndex: Promise<Map<string, AdrTarget[]>> | undefined;
    const loadAdrTargetIndex = () => {
      if (adrTargetIndex) return adrTargetIndex;

      adrTargetIndex = loadAllVersionsIndex('adr').then((adrIndex) => {
        const targets = new Map<string, AdrTarget[]>();

        for (const adr of adrIndex.byVersion.values()) {
          if (adr.hidden === true) continue;

          for (const pointer of adr.appliesTo || []) {
            const type = normalizeResourceType(pointer.type);
            if (!type || type === 'adr') continue;

            const key = `${type}:${pointer.id}`;
            const entries = targets.get(key);
            const target = { pointer, resource: adr };
            if (entries) entries.push(target);
            else targets.set(key, [target]);
          }
        }

        return targets;
      });
      return adrTargetIndex;
    };

    const pointerMatchesVersion = (pointer: ResourcePointer, version: string) => {
      if (!pointer.version || pointer.version === 'latest') return true;
      if (pointer.version === version) return true;

      const range = validRange(pointer.version);
      return range ? maxSatisfying([version], range) === version : false;
    };

    const getAdrsForResource = async (type: CatalogGraphResourceType, resource: CatalogResource) => {
      if (type === 'adr') return [];

      const targets = (await loadAdrTargetIndex()).get(`${type}:${resource.id}`) || [];
      return targets
        .filter(({ pointer }) => pointerMatchesVersion(pointer, resource.version))
        .map(({ resource }) => ({ type: 'adr' as const, resource }));
    };

    const resolveChildren = async (type: CatalogGraphResourceType, resource: CatalogResource): Promise<ResolvedResource[]> => {
      const children: ResolvedResource[] = [];
      const addPointers = async (pointers: ResourcePointer[], candidateTypes: CatalogGraphResourceType[]) => {
        children.push(...(await resolvePointers(pointers, candidateTypes)));
      };

      if (type === 'domain') {
        await addPointers(resource.domains || [], ['domain']);
        await addPointers(resource.systems || [], ['system']);
        await addPointers(resource.services || [], ['service']);
        await addPointers(resource.agents || [], ['agent']);
        await addPointers(resource.entities || [], ['entity']);
        await addPointers(resource.flows || [], ['flow']);
        await addPointers([...(resource.dataProducts || []), ...(resource['data-products'] || [])], ['data-product']);
        await addPointers([...(resource.sends || []), ...(resource.receives || [])], ['event', 'command', 'query']);
      } else if (type === 'system') {
        await addPointers(resource.relationships || [], ['system']);
        await addPointers(resource.services || [], ['service']);
        await addPointers(resource.flows || [], ['flow']);
        await addPointers(resource.entities || [], ['entity']);
        await addPointers(resource.containers || [], ['container']);
      } else if (type === 'service' || type === 'agent') {
        await addPointers([...(resource.sends || []), ...(resource.receives || [])], ['event', 'command', 'query']);
        await addPointers(resource.entities || [], ['entity']);
        await addPointers(resource.flows || [], ['flow']);
        await addPointers([...(resource.writesTo || []), ...(resource.readsFrom || [])], ['container']);
      } else if (type === 'event' || type === 'command' || type === 'query') {
        await addPointers([...(resource.channels || []), ...(resource.messageChannels || [])], ['channel']);
      } else if (type === 'channel') {
        await addPointers(resource.routes || [], ['channel']);
      } else if (type === 'data-product') {
        await addPointers(
          [...(resource.inputs || []), ...(resource.outputs || [])],
          ['event', 'command', 'query', 'channel', 'container', 'service']
        );
      } else if (type === 'flow') {
        for (const step of resource.steps || []) {
          if (step.message) await addPointers([step.message], ['event', 'command', 'query']);
          if (step.agent) await addPointers([step.agent], ['agent']);
          if (step.service) await addPointers([step.service], ['service']);
          if (step.flow) await addPointers([step.flow], ['flow']);
          if (step.container) await addPointers([step.container], ['container']);
          if (step.dataProduct) await addPointers([step.dataProduct], ['data-product']);
        }
      } else if (type === 'adr') {
        await addPointers(resource.appliesTo || [], NON_ADR_RESOURCE_TYPES);
        await addPointers(
          [
            ...(resource.supersedes || []),
            ...(resource.supersededBy || []),
            ...(resource.amends || []),
            ...(resource.amendedBy || []),
            ...(resource.related || []),
          ],
          ['adr']
        );
      }

      children.push(...(await getAdrsForResource(type, resource)));

      const uniqueChildren = new Map<string, ResolvedResource>();
      for (const child of children) {
        const graphResource = toGraphResource(child.type, child.resource);
        uniqueChildren.set(resourceKey(graphResource), child);
      }

      return Array.from(uniqueChildren.values()).sort((left, right) =>
        sortResources(toGraphResource(left.type, left.resource), toGraphResource(right.type, right.resource))
      );
    };

    const getChildren = (type: CatalogGraphResourceType, resource: CatalogResource) => {
      const key = resourceKey(toGraphResource(type, resource));
      const cachedChildren = adjacencyCache.get(key);
      if (cachedChildren) return cachedChildren;

      const children = resolveChildren(type, resource);
      adjacencyCache.set(key, children);
      return children;
    };

    const buildNode = async (
      type: CatalogGraphResourceType,
      resource: CatalogResource,
      remainingDepth: number,
      ancestors?: AncestorPath
    ): Promise<CatalogGraphNode> => {
      const graphResource = toGraphResource(type, resource);
      const key = resourceKey(graphResource);
      if (remainingDepth === 0) return { ...graphResource, children: [] };

      const nextAncestors = { key, parent: ancestors };
      const resolvedChildren = await getChildren(type, resource);
      const children = await mapWithConcurrency(
        resolvedChildren,
        NESTED_TRAVERSAL_CONCURRENCY,
        ({ type: childType, resource: childResource }) => {
          const child = toGraphResource(childType, childResource);
          if (pathIncludes(nextAncestors, resourceKey(child))) return Promise.resolve({ ...child, children: [] });
          return buildNode(childType, childResource, remainingDepth - 1, nextAncestors);
        }
      );

      return { ...graphResource, children };
    };

    const rootResource = await read(root.type, root);
    if (!rootResource || rootResource.hidden === true) return undefined;

    const flatRoot = toGraphResource(root.type, rootResource);
    if (!options.flat) {
      const nestedRoot = await buildNode(root.type, rootResource, depth);
      return { root: nestedRoot };
    }

    const flatRootKey = resourceKey(flatRoot);
    const resources = new Map<string, CatalogGraphResource>([[flatRootKey, flatRoot]]);
    const visited = new Set<string>([flatRootKey]);
    const queue: Array<ResolvedResource & { remainingDepth: number }> = [
      { type: root.type, resource: rootResource, remainingDepth: depth },
    ];

    for (let index = 0; index < queue.length; index++) {
      const current = queue[index];
      if (current.remainingDepth === 0) continue;

      const children = await getChildren(current.type, current.resource);
      for (const child of children) {
        const graphResource = toGraphResource(child.type, child.resource);
        const key = resourceKey(graphResource);
        if (visited.has(key)) continue;

        visited.add(key);
        resources.set(key, graphResource);
        queue.push({ ...child, remainingDepth: current.remainingDepth - 1 });
      }
    }

    const relatedResources = Array.from(resources.values())
      .filter((resource) => resourceKey(resource) !== flatRootKey)
      .sort(sortResources);

    return {
      root: flatRoot,
      resources: [flatRoot, ...relatedResources],
    };
  };

  return graph as GetCatalogGraph;
};
