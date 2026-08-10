import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { ResolvedGraph } from './index-types';

export type Fetcher = (request: { source: string; commit: string; path: string }) => Promise<Buffer>;

export type Cache = {
  get(key: string): Promise<Buffer | undefined>;
  set(key: string, value: Buffer): Promise<void>;
};

export type HydrateOptions = {
  outDir: string;
  localSource: string;
  fetch: Fetcher;
  modes?: Record<string, 'hydrate' | 'reference'>;
  cache?: Cache;
};

export type HydrateResult = {
  fetched: number;
  written: number;
  referenced: number;
};

type Artifact = {
  source: string;
  commit: string;
  path: string;
  hash?: string;
  target: string;
  shared?: boolean;
};

const getSourceDirectory = (source: string) => {
  const slug = source.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'source';
  const digest = createHash('sha256').update(source).digest('hex').slice(0, 12);
  return `${slug}--${digest}`;
};

const getContentHash = (content: Buffer) => `sha256:${createHash('sha256').update(content).digest('hex')}`;

const getArtifactOutputPath = (artifact: Artifact, outDir: string) => {
  const allowedDirectory = path.resolve(artifact.shared ? outDir : path.join(outDir, getSourceDirectory(artifact.source)));
  const portableTarget = artifact.target.replaceAll('\\', '/');
  const normalizedTarget = path.posix.normalize(portableTarget);
  const hasUnsafePathSyntax =
    artifact.target.length === 0 ||
    artifact.target.includes('\0') ||
    artifact.target.includes('\\') ||
    path.posix.isAbsolute(portableTarget) ||
    /^[a-zA-Z]:\//.test(portableTarget) ||
    normalizedTarget === '..' ||
    normalizedTarget.startsWith('../');
  const outputPath = path.resolve(allowedDirectory, artifact.target);
  const relativeOutputPath = path.relative(allowedDirectory, outputPath);
  const escapesAllowedDirectory =
    relativeOutputPath === '' ||
    relativeOutputPath === '..' ||
    relativeOutputPath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeOutputPath);

  if (hasUnsafePathSyntax || escapesAllowedDirectory) {
    throw new Error(`Artifact path "${artifact.target}" escapes its allowed output directory`);
  }

  return outputPath;
};

const replaceDirectory = async (stagingDirectory: string, outDir: string) => {
  const backupDirectory = `${outDir}.backup-${randomUUID()}`;
  let hasBackup = false;

  try {
    await fs.rename(outDir, backupDirectory);
    hasBackup = true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  try {
    await fs.rename(stagingDirectory, outDir);
  } catch (error) {
    if (hasBackup) await fs.rename(backupDirectory, outDir);
    throw error;
  }

  if (hasBackup) await fs.rm(backupDirectory, { recursive: true, force: true });
};

export async function hydrate(graph: ResolvedGraph, options: HydrateOptions): Promise<HydrateResult> {
  const result: HydrateResult = {
    fetched: 0,
    written: 0,
    referenced: 0,
  };
  const artifacts: Artifact[] = [];

  for (const entity of graph.entities) {
    const { source, commit } = entity.resolvedFrom;
    if (source === options.localSource) continue;

    if (options.modes?.[source] === 'reference') {
      result.referenced++;
      continue;
    }

    if (!entity.contentPath) continue;

    artifacts.push({
      source,
      commit,
      path: entity.contentPath,
      hash: entity.contentHash,
      target: entity.contentPath,
    });

    const entityDirectory = path.posix.dirname(entity.contentPath);

    for (const schema of entity.schemas ?? []) {
      if (!schema.path) continue;
      const artifactPath = path.posix.join(entityDirectory, schema.path);
      artifacts.push({ source, commit, path: artifactPath, hash: schema.hash, target: artifactPath });
    }

    for (const specification of entity.specifications ?? []) {
      const artifactPath = path.posix.join(entityDirectory, specification.path);
      artifacts.push({ source, commit, path: artifactPath, hash: specification.hash, target: artifactPath });
    }

    for (const sidecar of entity.sidecars ?? []) {
      artifacts.push({ source, commit, path: sidecar.path, hash: sidecar.hash, target: sidecar.path });
    }
  }

  for (const asset of graph.assets) {
    const { source, commit } = asset.resolvedFrom;
    if (source === options.localSource || options.modes?.[source] === 'reference') continue;

    artifacts.push({
      source,
      commit,
      path: asset.path,
      hash: asset.hash,
      target: asset.path,
      shared: true,
    });
  }

  for (const artifact of artifacts) getArtifactOutputPath(artifact, options.outDir);

  if (artifacts.length === 0) {
    await fs.rm(options.outDir, { recursive: true, force: true });
    return result;
  }

  const resolvedOutDir = path.resolve(options.outDir);
  const outDirParent = path.dirname(resolvedOutDir);
  await fs.mkdir(outDirParent, { recursive: true });
  const stagingDirectory = await fs.mkdtemp(path.join(outDirParent, `.${path.basename(resolvedOutDir)}.staging-`));

  try {
    for (const artifact of artifacts) {
      let content: Buffer | undefined = artifact.hash ? await options.cache?.get(artifact.hash) : undefined;

      if (content !== undefined && artifact.hash && getContentHash(content) !== artifact.hash) {
        content = undefined;
      }

      if (content === undefined) {
        content = await options.fetch({
          source: artifact.source,
          commit: artifact.commit,
          path: artifact.path,
        });
        result.fetched++;

        if (artifact.hash) {
          const actualHash = getContentHash(content);

          if (actualHash !== artifact.hash) {
            throw new Error(
              `Content hash mismatch for "${artifact.source}/${artifact.path}": expected "${artifact.hash}", received "${actualHash}"`
            );
          }

          await options.cache?.set(artifact.hash, content);
        }
      }

      const outputPath = getArtifactOutputPath(artifact, stagingDirectory);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, content);
      result.written++;
    }

    await replaceDirectory(stagingDirectory, resolvedOutDir);
  } catch (error) {
    await fs.rm(stagingDirectory, { recursive: true, force: true });
    throw error;
  }

  return result;
}
