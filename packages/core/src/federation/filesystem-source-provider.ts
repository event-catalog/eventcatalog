/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/src/federation/LICENSE
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import createSDK from '@eventcatalog/sdk';
import type { FederationSourceConfig } from '../eventcatalog.config';
import type { FederationSourceProvider } from './types';

const FILESYSTEM_SOURCE_PREFIX = 'file:';

const isWithinDirectory = (directory: string, target: string) => {
  const relativePath = path.relative(directory, target);
  return (
    relativePath === '' || (!relativePath.startsWith(`..${path.sep}`) && relativePath !== '..' && !path.isAbsolute(relativePath))
  );
};

const assertPortableRelativePath = (filePath: string, label: string, allowRoot = true) => {
  const portablePath = filePath.replaceAll('\\', '/');
  const normalizedPath = path.posix.normalize(portablePath);
  const isUnsafe =
    filePath.includes('\\') ||
    filePath.includes('\0') ||
    path.posix.isAbsolute(normalizedPath) ||
    /^[a-zA-Z]:\//.test(normalizedPath) ||
    normalizedPath === '..' ||
    normalizedPath.startsWith('../') ||
    (!allowRoot && (normalizedPath === '.' || normalizedPath === ''));

  if (isUnsafe) throw new Error(`${label} "${filePath}" escapes its filesystem source`);
  return normalizedPath;
};

const getSourceRoot = (projectDirectory: string, source: FederationSourceConfig) => {
  if (!source.source.startsWith(FILESYSTEM_SOURCE_PREFIX)) {
    throw new Error(`Unsupported federation source "${source.source}". Expected file:path/to/catalog.`);
  }

  const locator = source.source.slice(FILESYSTEM_SOURCE_PREFIX.length);
  if (!locator.trim()) throw new Error(`Filesystem federation source "${source.id}" requires a path after "file:".`);
  return path.resolve(projectDirectory, locator);
};

const getCatalogDirectory = async (projectDirectory: string, source: FederationSourceConfig) => {
  if (source.ref) throw new Error(`Filesystem federation source "${source.id}" does not support "ref".`);

  const sourceRoot = getSourceRoot(projectDirectory, source);
  const catalogPath = assertPortableRelativePath(source.path ?? '.', 'Catalog path');
  const catalogDirectory = path.resolve(sourceRoot, ...catalogPath.split('/'));
  if (!isWithinDirectory(sourceRoot, catalogDirectory)) {
    throw new Error(`Catalog path "${source.path}" escapes source "${source.id}"`);
  }

  try {
    const [realSourceRoot, realCatalogDirectory] = await Promise.all([fs.realpath(sourceRoot), fs.realpath(catalogDirectory)]);
    if (!isWithinDirectory(realSourceRoot, realCatalogDirectory)) {
      throw new Error(`Catalog path "${source.path}" escapes source "${source.id}"`);
    }
    if (!(await fs.stat(realCatalogDirectory)).isDirectory()) {
      throw new Error(`Filesystem federation source "${source.id}" is not a directory: ${catalogDirectory}`);
    }
    return realCatalogDirectory;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Filesystem federation source "${source.id}" does not exist: ${catalogDirectory}`, { cause: error });
    }
    throw error;
  }
};

const getArtifactPath = async (catalogDirectory: string, source: FederationSourceConfig, artifactPath: string) => {
  const normalizedPath = assertPortableRelativePath(artifactPath, 'Federated artifact path', false);
  const filePath = path.resolve(catalogDirectory, ...normalizedPath.split('/'));
  if (!isWithinDirectory(catalogDirectory, filePath)) {
    throw new Error(`Federated artifact path "${artifactPath}" escapes source "${source.id}"`);
  }

  try {
    const realFilePath = await fs.realpath(filePath);
    if (!isWithinDirectory(catalogDirectory, realFilePath)) {
      throw new Error(`Federated artifact path "${artifactPath}" escapes source "${source.id}"`);
    }
    return realFilePath;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Federated artifact not found for "${source.id}": ${artifactPath}`, { cause: error });
    }
    throw error;
  }
};

export const createFileSystemSourceProvider = (projectDirectory: string): FederationSourceProvider => ({
  async resolve(source) {
    const catalogDirectory = await getCatalogDirectory(projectDirectory, source);
    const localIndex = await createSDK(catalogDirectory).buildIndex({
      source: source.id,
      commit: 'local',
      includeFederated: false,
    });
    const snapshot = createHash('sha256').update(JSON.stringify(localIndex)).digest('hex').slice(0, 12);
    const index = { ...localIndex, commit: `local:${snapshot}` };
    const bytes = Buffer.from(JSON.stringify(index));
    return { bytes, index, commit: index.commit, generated: true };
  },

  async fetchContent({ source, path: artifactPath }) {
    const catalogDirectory = await getCatalogDirectory(projectDirectory, source);
    return fs.readFile(await getArtifactPath(catalogDirectory, source, artifactPath));
  },
});
