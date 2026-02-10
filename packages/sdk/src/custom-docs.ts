import path, { join } from 'node:path';
import { readMdxFile } from './internal/utils';
import type { CustomDoc } from './types';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import matter from 'gray-matter';
import { getResources } from './internal/resources';
import slugify from 'slugify';

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
    const fullPath = path.join(directory, filePath);
    const fullPathWithExtension = fullPath.endsWith('.mdx') ? fullPath : `${fullPath}.mdx`;
    const fileExists = fsSync.existsSync(fullPathWithExtension);
    if (!fileExists) {
      return undefined;
    }
    return readMdxFile(fullPathWithExtension) as Promise<CustomDoc>;
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
      const pattern = `${directory}/${options.path}/**/*.{md,mdx}`;
      return getResources(directory, { type: 'docs', pattern }) as Promise<CustomDoc[]>;
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
    const fullPath = path.join(directory, options.path || '', withExtension);

    fsSync.mkdirSync(path.dirname(fullPath), { recursive: true });
    const document = matter.stringify(customDoc.markdown.trim(), rest);
    fsSync.writeFileSync(fullPath, document);
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
  const withExtension = filePath.endsWith('.mdx') ? filePath : `${filePath}.mdx`;
  await fs.rm(join(directory, withExtension), { recursive: true });
};
