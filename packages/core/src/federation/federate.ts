import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import createSDK, { hydrate, resolve, type Conflict, type HydrateResult, type ResolvedGraph } from '@eventcatalog/sdk';
import type { FederationSourceConfig } from '../eventcatalog.config';
import { getEventCatalogConfigFile } from '../eventcatalog-config-file-utils.js';
import { createFederationContentCache } from './content-cache';
import { composePublicAssets, type FederatedPublicFiles, type PublicAssetCompositionResult } from './public-assets';
import { createFederationSourceProvider } from './source-provider';
import type { FederationSourceProvider, ResolvedFederationSource } from './types';

export type FederationProgressEvent =
  | { type: 'configured'; sources: number }
  | { type: 'cleanup:complete'; federated: boolean; publicFiles: number; lock: boolean }
  | { type: 'cache:disabled' }
  | { type: 'source:start'; source: FederationSourceConfig; current: number; total: number }
  | {
      type: 'source:complete';
      source: FederationSourceConfig;
      current: number;
      total: number;
      commit: string;
      resources: number;
      generated: boolean;
    }
  | { type: 'local:start' }
  | { type: 'local:complete'; resources: number }
  | { type: 'resolving'; resources: number; localResources: number }
  | { type: 'resolved'; graph: ResolvedGraph }
  | { type: 'hydrating'; outDir: string }
  | { type: 'hydrate:cache'; files: number }
  | { type: 'hydrate:file'; files: number; source: string; path: string }
  | { type: 'public:complete'; result: PublicAssetCompositionResult }
  | { type: 'complete'; result: FederateCatalogResult };

export type FederateCatalogResult = {
  sources: number;
  resources: number;
  graph: ResolvedGraph;
  hydrate: HydrateResult;
  public: PublicAssetCompositionResult;
  outDir: string;
  lockPath: string;
};

type FederationLock = {
  lockVersion: 1;
  sources: {
    id: string;
    digest: string;
    commit: string;
    resolvedAt: string;
  }[];
  publicFiles?: FederatedPublicFiles;
};

type FederateCatalogOptions = {
  provider?: FederationSourceProvider;
  onProgress?: (event: FederationProgressEvent) => void;
  now?: () => Date;
  useCache?: boolean;
  isFederationEnabled?: () => Promise<boolean>;
};

export class FederationConflictError extends Error {
  conflicts: Conflict[];

  constructor(conflicts: Conflict[]) {
    const details = conflicts.map((conflict) => `${conflict.id}: ${conflict.sources.join(', ')}`).join('\n');
    super(`Federation conflicts prevent hydration:\n${details}`);
    this.name = 'FederationConflictError';
    this.conflicts = conflicts;
  }
}

const validateSources = (sources: FederationSourceConfig[]) => {
  const ids = new Set<string>();
  for (const source of sources) {
    if (!source.id?.trim()) throw new Error('Every federation source requires a stable id.');
    if (ids.has(source.id)) throw new Error(`Federation source id "${source.id}" is configured more than once.`);
    ids.add(source.id);
  }
};

const writeLock = async (lockPath: string, lock: FederationLock) => {
  const temporaryPath = `${lockPath}.tmp-${process.pid}`;
  try {
    await fs.writeFile(temporaryPath, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
    await fs.rename(temporaryPath, lockPath);
  } finally {
    await fs.rm(temporaryPath, { force: true });
  }
};

const readLock = async (lockPath: string): Promise<FederationLock | undefined> => {
  try {
    return JSON.parse(await fs.readFile(lockPath, 'utf8')) as FederationLock;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw new Error(`Cannot read federation lock at "${lockPath}"`, { cause: error });
  }
};

const pathExists = async (filePath: string) => {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
};

const cleanupPreviousFederation = async (projectDirectory: string, onProgress?: FederateCatalogOptions['onProgress']) => {
  const outDir = path.join(projectDirectory, 'federated');
  const lockPath = path.join(projectDirectory, 'eventcatalog.lock');
  const previousLock = await readLock(lockPath);
  const hadFederatedOutput = await pathExists(outDir);
  const hadLock = previousLock !== undefined;

  if (!hadFederatedOutput && !hadLock) return;

  await fs.rm(outDir, { recursive: true, force: true });
  const publicResult = await composePublicAssets({
    projectDirectory,
    federatedDirectory: outDir,
    assets: [],
    previousFiles: previousLock?.publicFiles,
  });
  await fs.rm(lockPath, { force: true });
  onProgress?.({
    type: 'cleanup:complete',
    federated: hadFederatedOutput,
    publicFiles: publicResult.removed,
    lock: hadLock,
  });
};

export const federateCatalog = async (
  projectDirectory: string,
  options: FederateCatalogOptions = {}
): Promise<FederateCatalogResult | null> => {
  const config = await getEventCatalogConfigFile(projectDirectory);
  const sources: FederationSourceConfig[] = config.federation?.sources ?? [];
  options.onProgress?.({ type: 'configured', sources: sources.length });
  if (sources.length === 0) {
    await cleanupPreviousFederation(projectDirectory, options.onProgress);
    return null;
  }
  if (options.isFederationEnabled && !(await options.isFederationEnabled())) {
    throw new Error(
      'Cannot federate catalogs: EventCatalog federation is an Enterprise feature. Visit https://www.eventcatalog.dev/pricing to enable federation.'
    );
  }
  validateSources(sources);
  if (options.useCache === false) options.onProgress?.({ type: 'cache:disabled' });

  const provider = options.provider ?? createFederationSourceProvider(projectDirectory);
  const resolvedSources: { config: FederationSourceConfig; resolved: ResolvedFederationSource }[] = [];

  for (const [index, source] of sources.entries()) {
    const current = index + 1;
    options.onProgress?.({ type: 'source:start', source, current, total: sources.length });
    try {
      const resolved = await provider.resolve(source);
      resolvedSources.push({ config: source, resolved });
      options.onProgress?.({
        type: 'source:complete',
        source,
        current,
        total: sources.length,
        commit: resolved.commit,
        resources: resolved.index.resources.length,
        generated: resolved.generated,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to federate source "${source.id}": ${message}`, { cause: error });
    }
  }

  const outDir = path.join(projectDirectory, 'federated');
  const lockPath = path.join(projectDirectory, 'eventcatalog.lock');
  const previousLock = await readLock(lockPath);
  const resources = resolvedSources.reduce((total, source) => total + source.resolved.index.resources.length, 0);
  const remoteIndexes = resolvedSources.map(({ resolved }) => resolved.index);
  options.onProgress?.({ type: 'local:start' });
  const localIndex = await createSDK(projectDirectory).buildIndex({
    source: config.cId,
    commit: 'local',
    hashContent: false,
    includeFederated: false,
  });
  options.onProgress?.({ type: 'local:complete', resources: localIndex.resources.length });
  options.onProgress?.({ type: 'resolving', resources, localResources: localIndex.resources.length });
  const ownershipGraph = resolve([localIndex, ...remoteIndexes]);
  if (ownershipGraph.conflicts.length > 0) {
    options.onProgress?.({ type: 'resolved', graph: ownershipGraph });
    throw new FederationConflictError(ownershipGraph.conflicts);
  }

  const graph = resolve(remoteIndexes);
  options.onProgress?.({ type: 'resolved', graph });

  const sourcesById = new Map(sources.map((source) => [source.id, source]));
  options.onProgress?.({ type: 'hydrating', outDir });
  let hydratedFiles = 0;
  let cachedFiles = 0;
  const hydrateResult = await hydrate(graph, {
    outDir,
    cache: createFederationContentCache(projectDirectory, {
      read: options.useCache !== false,
      onHit: () => {
        cachedFiles += 1;
        options.onProgress?.({ type: 'hydrate:cache', files: cachedFiles });
      },
    }),
    fetch: async ({ source: sourceId, commit, path: artifactPath }) => {
      const source = sourcesById.get(sourceId);
      if (!source) throw new Error(`Cannot fetch content for unconfigured source "${sourceId}"`);
      const content = await provider.fetchContent({ source, commit, path: artifactPath });
      hydratedFiles += 1;
      options.onProgress?.({ type: 'hydrate:file', files: hydratedFiles, source: sourceId, path: artifactPath });
      return content;
    },
  });

  const publicResult = await composePublicAssets({
    projectDirectory,
    federatedDirectory: outDir,
    assets: graph.assets,
    previousFiles: previousLock?.publicFiles,
    collisionPaths: new Set(
      graph.warnings.filter((warning) => warning.kind === 'asset-collision').map((warning) => warning.path)
    ),
  });
  options.onProgress?.({ type: 'public:complete', result: publicResult });

  const resolvedAt = (options.now ?? (() => new Date()))().toISOString();
  await writeLock(lockPath, {
    lockVersion: 1,
    sources: resolvedSources
      .map(({ config: source, resolved }) => ({
        id: source.id,
        digest: `sha256:${createHash('sha256').update(resolved.bytes).digest('hex')}`,
        commit: resolved.commit,
        resolvedAt,
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    publicFiles: publicResult.files,
  });

  const result = {
    sources: sources.length,
    resources,
    graph,
    hydrate: hydrateResult,
    public: publicResult,
    outDir,
    lockPath,
  };
  options.onProgress?.({ type: 'complete', result });
  return result;
};
