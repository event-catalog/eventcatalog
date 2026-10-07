import path from 'node:path';
import { invalidateFileCache, readMdxFile } from './internal/utils';
import type { CustomDoc } from './types';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import matter from 'gray-matter';
import { getResources } from './internal/resources';
import slugify from 'slugify';

const customDocEscapeError = (filePath: string) => new Error(`Custom doc path "${filePath}" escapes the catalog docs directory`);

// Custom doc paths are catalog-relative. A leading slash (`/guides/foo`) is that convention.
// Drive-letter paths, UNC paths, and null bytes are filesystem-absolute or otherwise unsafe.
const toRelativeCatalogSegment = (segment: string, label: string): string => {
  if (segment.includes('\0')) {
    throw customDocEscapeError(label);
  }

  const portable = segment.replace(/\\/g, '/');
  if (/^[a-zA-Z]:/.test(portable) || portable.startsWith('//')) {
    throw customDocEscapeError(label);
  }

  return portable.replace(/^\/+/, '');
};

const isInsideDirectory = (root: string, candidate: string) => candidate === root || candidate.startsWith(`${root}${path.sep}`);

class CustomDocPathEscape extends Error {
  constructor() {
    super('Custom doc path escapes the catalog docs directory');
    this.name = 'CustomDocPathEscape';
  }
}

// lstat, not stat: a dangling symlink exists even when its target does not.
const readSymlinkTarget = (linkPath: string): string | undefined => {
  try {
    if (!fsSync.lstatSync(linkPath).isSymbolicLink()) return undefined;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }

  return path.resolve(path.dirname(linkPath), fsSync.readlinkSync(linkPath));
};

// Resolve through the nearest existing ancestor so missing files are still symlink-checked.
// realpath reports ENOENT for a dangling symlink. Do not treat that link as a missing component:
// write and delete would follow it and create or remove the external target.
const resolveRealPath = (target: string): string => {
  const missing: string[] = [];
  let current = target;
  const seen = new Set<string>();

  while (true) {
    if (seen.has(current)) throw new CustomDocPathEscape();
    seen.add(current);

    try {
      return path.resolve(fsSync.realpathSync(current), ...missing);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;

      const linkTarget = readSymlinkTarget(current);
      if (linkTarget) {
        current = path.resolve(linkTarget, ...missing);
        missing.length = 0;
        continue;
      }

      const parent = path.dirname(current);
      if (parent === current) return path.resolve(current, ...missing);
      missing.unshift(path.basename(current));
      current = parent;
    }
  }
};

const assertInsideDocsRoot = (docsDirectory: string, candidate: string, label: string): string => {
  const root = path.resolve(docsDirectory);
  const resolved = path.resolve(candidate);

  if (!isInsideDirectory(root, resolved)) {
    throw customDocEscapeError(label);
  }

  let realRoot: string;
  let realCandidate: string;
  try {
    realRoot = resolveRealPath(root);
    realCandidate = resolveRealPath(resolved);
  } catch (error) {
    if (error instanceof CustomDocPathEscape) throw customDocEscapeError(label);
    throw error;
  }

  if (!isInsideDirectory(realRoot, realCandidate)) {
    throw customDocEscapeError(label);
  }

  return resolved;
};

const resolveCustomDocFile = (docsDirectory: string, filePath: string): string => {
  const root = path.resolve(docsDirectory);
  const base = path.resolve(root, toRelativeCatalogSegment(filePath, filePath));
  const candidate = base.endsWith('.mdx') ? base : `${base}.mdx`;
  return assertInsideDocsRoot(docsDirectory, candidate, filePath);
};

const resolveCustomDocWritePath = (docsDirectory: string, directoryPath: string, fileName: string): string => {
  const root = path.resolve(docsDirectory);
  const label = [directoryPath, fileName].filter((segment) => segment.length > 0).join('/');
  const candidate = path.resolve(
    root,
    ...[directoryPath, fileName]
      .map((segment) => toRelativeCatalogSegment(segment, label))
      .filter((segment) => segment.length > 0)
  );
  return assertInsideDocsRoot(docsDirectory, candidate, label);
};

/**
 * Returns a custom doc from EventCatalog by the given file path.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { getCustomDoc } = utils('/path/to/eventcatalog');
 *
 * // Gets the custom doc by the given file path
 * const customDoc = await getCustomDoc('/guides/inventory-management.mdx');
 * ```
 */
export const getCustomDoc =
  (directory: string) =>
  async (filePath: string): Promise<CustomDoc | undefined> => {
    const fullPath = resolveCustomDocFile(directory, filePath);
    if (!fsSync.existsSync(fullPath)) {
      return undefined;
    }
    return readMdxFile(fullPath) as Promise<CustomDoc>;
  };

/**
 * Returns all custom docs for the project.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { getCustomDocs } = utils('/path/to/eventcatalog');
 *
 * // Gets all custom docs from the catalog
 * const customDocs = await getCustomDocs();
 *
 * // Gets all custom docs from the given path
 * const customDocs = await getCustomDocs({ path: '/guides' });
 * ```
 */
export const getCustomDocs =
  (directory: string) =>
  async (options?: { path?: string }): Promise<CustomDoc[]> => {
    if (options?.path) {
      const root = path.resolve(directory);
      const target = assertInsideDocsRoot(
        directory,
        path.resolve(root, toRelativeCatalogSegment(options.path, options.path)),
        options.path
      );
      return getResources(directory, { type: 'docs', pattern: `${target}/**/*.{md,mdx}` }) as Promise<CustomDoc[]>;
    }
    return getResources(directory, { type: 'docs', pattern: `${directory}/**/*.{md,mdx}` }) as Promise<CustomDoc[]>;
  };

/**
 * Write a custom doc to EventCatalog.
 *
 * You can optionally override the path of the custom doc.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { writeCustomDoc } = utils('/path/to/eventcatalog');
 *
 * // Write a custom doc to the catalog
 * // Custom doc would be written to docs/inventory-management.mdx
 * await writeCustomDoc({
 *   title: 'Inventory Management',
 *   summary: 'This is a summary',
 *   owners: ['John Doe'],
 *   badges: [{ content: 'Badge', backgroundColor: 'red', textColor: 'white' }],
 *   markdown: '# Hello world',
 *   fileName: 'inventory-management',
 * });
 *
 * // Write a custom doc to the catalog but override the path
 * // Custom doc would be written to docs/guides/inventory-management/introduction.mdx
 * await writeCustomDoc({
 *   title: 'Inventory Management',
 *   summary: 'This is a summary',
 *   owners: ['John Doe'],
 *   badges: [{ content: 'Badge', backgroundColor: 'red', textColor: 'white' }],
 *   markdown: '# Hello world',
 *   fileName: 'introduction',
 * }, { path: "/guides/inventory-management"});
 * ```
 */
export const writeCustomDoc =
  (directory: string) =>
  async (customDoc: CustomDoc, options: { path?: string } = { path: '' }): Promise<void> => {
    const { fileName, ...rest } = customDoc;
    const name = fileName || slugify(customDoc.title, { lower: true });
    const withExtension = name.endsWith('.mdx') ? name : `${name}.mdx`;
    const fullPath = resolveCustomDocWritePath(directory, options.path || '', withExtension);

    fsSync.mkdirSync(path.dirname(fullPath), { recursive: true });
    const document = matter.stringify(customDoc.markdown.trim(), rest);
    fsSync.writeFileSync(fullPath, document);
    invalidateFileCache();
  };

/**
 * Delete a custom doc by its' path
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { rmCustomDoc } = utils('/path/to/eventcatalog');
 *
 * // removes a custom doc at the given path
 * // Removes the custom doc at docs/guides/inventory-management/introduction.mdx
 * await rmCustomDoc('/guides/inventory-management/introduction');
 * ```
 */
export const rmCustomDoc = (directory: string) => async (filePath: string) => {
  const fullPath = resolveCustomDocFile(directory, filePath);
  await fs.rm(fullPath, { recursive: true });
  invalidateFileCache();
};
