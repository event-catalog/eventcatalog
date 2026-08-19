import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { ResolvedAsset } from '@eventcatalog/sdk';

export type FederatedPublicFile = {
  source: string;
  hash: string;
};

export type FederatedPublicFiles = Record<string, FederatedPublicFile>;

export type PublicAssetCompositionResult = {
  files: FederatedPublicFiles;
  copied: number;
  skipped: number;
  overwritten: number;
  removed: number;
};

type ComposePublicAssetsOptions = {
  projectDirectory: string;
  federatedDirectory: string;
  assets: ResolvedAsset[];
  previousFiles?: FederatedPublicFiles;
  collisionPaths?: Set<string>;
};

const getContentHash = (content: Buffer) => `sha256:${createHash('sha256').update(content).digest('hex')}`;

const getFileHash = async (filePath: string) => {
  try {
    const stat = await fs.lstat(filePath);
    return stat.isFile() ? getContentHash(await fs.readFile(filePath)) : undefined;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
};

const getSafePath = (directory: string, relativePath: string) => {
  const normalizedPath = path.posix.normalize(relativePath);
  const unsafe =
    relativePath.length === 0 ||
    relativePath.includes('\0') ||
    relativePath.includes('\\') ||
    path.posix.isAbsolute(relativePath) ||
    /^[a-zA-Z]:\//.test(relativePath) ||
    normalizedPath !== relativePath ||
    normalizedPath === '..' ||
    normalizedPath.startsWith('../');

  if (unsafe) return undefined;

  const resolvedDirectory = path.resolve(directory);
  const resolvedPath = path.resolve(resolvedDirectory, relativePath);
  const relativeResolvedPath = path.relative(resolvedDirectory, resolvedPath);

  if (
    relativeResolvedPath === '' ||
    relativeResolvedPath === '..' ||
    relativeResolvedPath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeResolvedPath)
  ) {
    return undefined;
  }

  return resolvedPath;
};

const listFiles = async (directory: string, relativeDirectory = ''): Promise<string[]> => {
  let entries;

  try {
    entries = await fs.readdir(path.join(directory, relativeDirectory), { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }

  const files = await Promise.all(
    entries.map(async (entry): Promise<string[]> => {
      const relativePath = path.join(relativeDirectory, entry.name);
      if (entry.isDirectory()) return listFiles(directory, relativePath);
      return entry.isFile() ? [relativePath.split(path.sep).join('/')] : [];
    })
  );

  return files.flat().sort();
};

const pathExists = async (filePath: string) => {
  try {
    await fs.lstat(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
};

const hasBlockingParent = async (publicDirectory: string, destinationPath: string) => {
  let currentPath = path.dirname(destinationPath);

  while (currentPath !== publicDirectory) {
    try {
      if (!(await fs.lstat(currentPath)).isDirectory()) return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    currentPath = path.dirname(currentPath);
  }

  return false;
};

const pruneEmptyDirectories = async (publicDirectory: string, filePath: string) => {
  let currentPath = path.dirname(filePath);

  while (currentPath !== publicDirectory) {
    try {
      await fs.rmdir(currentPath);
    } catch (error) {
      if (!['ENOENT', 'ENOTEMPTY'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error;
      if ((error as NodeJS.ErrnoException).code === 'ENOTEMPTY') return;
    }
    currentPath = path.dirname(currentPath);
  }
};

export const composePublicAssets = async ({
  projectDirectory,
  federatedDirectory,
  assets,
  previousFiles = {},
  collisionPaths = new Set(),
}: ComposePublicAssetsOptions): Promise<PublicAssetCompositionResult> => {
  const publicDirectory = path.resolve(projectDirectory, 'public');
  const federatedPublicDirectory = path.resolve(federatedDirectory, 'public');
  const sourceFiles = await listFiles(federatedPublicDirectory);
  const sourceFileSet = new Set(sourceFiles);
  const managedFiles = new Set<string>();

  for (const [relativePath, previousFile] of Object.entries(previousFiles)) {
    const destinationPath = getSafePath(publicDirectory, relativePath);
    if (destinationPath && (await getFileHash(destinationPath)) === previousFile.hash) managedFiles.add(relativePath);
  }

  let removed = 0;
  for (const relativePath of managedFiles) {
    if (sourceFileSet.has(relativePath)) continue;
    const destinationPath = getSafePath(publicDirectory, relativePath);
    if (!destinationPath) continue;
    await fs.rm(destinationPath, { force: true });
    await pruneEmptyDirectories(publicDirectory, destinationPath);
    removed += 1;
  }

  const publicAssetsByPath = new Map(
    assets.filter((asset) => asset.path.startsWith('public/')).map((asset) => [asset.path.slice('public/'.length), asset])
  );
  const files: FederatedPublicFiles = {};
  let copied = 0;
  let skipped = 0;
  let overwritten = 0;

  for (const relativePath of sourceFiles) {
    const sourcePath = getSafePath(federatedPublicDirectory, relativePath);
    const destinationPath = getSafePath(publicDirectory, relativePath);
    if (!sourcePath || !destinationPath) throw new Error(`Unsafe federated public asset path "${relativePath}"`);

    const mainCatalogOwnsPath =
      ((await pathExists(destinationPath)) && !managedFiles.has(relativePath)) ||
      (await hasBlockingParent(publicDirectory, destinationPath));

    if (mainCatalogOwnsPath) {
      skipped += 1;
      continue;
    }

    const asset = publicAssetsByPath.get(relativePath);
    if (!asset) throw new Error(`Cannot identify the source of federated public asset "${relativePath}"`);

    const content = await fs.readFile(sourcePath);
    await fs.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.writeFile(destinationPath, content);
    files[relativePath] = { source: asset.resolvedFrom.source, hash: getContentHash(content) };
    copied += 1;
    if (collisionPaths.has(`public/${relativePath}`)) overwritten += 1;
  }

  await fs.rm(federatedPublicDirectory, { recursive: true, force: true });

  return { files, copied, skipped, overwritten, removed };
};
