import path, { dirname } from 'node:path';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import matter from 'gray-matter';
import { findFileById, invalidateFileCache } from './internal/utils';
import type { Changelog } from './types';

/**
 * Writes a changelog entry to a resource in EventCatalog.
 *
 * The changelog file (`changelog.mdx`) is written to the same directory as the resource's `index.mdx`.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { writeChangelog } = utils('/path/to/eventcatalog');
 *
 * // Write a changelog to a resource
 * await writeChangelog('OrderCreated', {
 *   createdAt: '2024-08-01',
 *   markdown: '### Added support for JSON Schema\n\nOrderCreated now supports JSON Draft 7.',
 *   badges: [{ content: '⭐️ JSON Schema', backgroundColor: 'purple', textColor: 'purple' }],
 * });
 *
 * // Write a changelog to a specific version
 * await writeChangelog('OrderCreated', {
 *   createdAt: '2024-08-01',
 *   markdown: '### Breaking change\n\nRemoved `gender` field from schema.',
 * }, { version: '1.0.0' });
 * ```
 */
export const writeChangelog =
  (catalogDir: string) =>
  async (id: string, changelog: Changelog, options: { version?: string; format?: 'md' | 'mdx' } = {}): Promise<void> => {
    const { version, format = 'mdx' } = options;

    const resourceFile = await findFileById(catalogDir, id, version);
    if (!resourceFile) {
      throw new Error(`No resource found with id: ${id}${version ? ` and version: ${version}` : ''}`);
    }

    const resourceDir = dirname(resourceFile);
    const changelogPath = path.join(resourceDir, `changelog.${format}`);

    const { markdown, ...frontmatter } = changelog;

    // Ensure createdAt is serialized correctly for gray-matter
    const fm: Record<string, any> = { ...frontmatter };
    if (fm.createdAt instanceof Date) {
      fm.createdAt = fm.createdAt;
    }

    // Remove undefined/empty values from frontmatter
    if (!fm.badges || fm.badges.length === 0) {
      delete fm.badges;
    }

    fsSync.mkdirSync(resourceDir, { recursive: true });
    const document = matter.stringify(markdown.trim(), fm);
    fsSync.writeFileSync(changelogPath, document);
    invalidateFileCache();
  };

/**
 * Appends a changelog entry to an existing changelog for a resource.
 * If no changelog exists, one is created.
 *
 * New entries are prepended to the top of the existing content, separated by `---`.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { appendChangelog } = utils('/path/to/eventcatalog');
 *
 * // Append to an existing changelog (or create if none exists)
 * await appendChangelog('OrderCreated', {
 *   createdAt: '2024-09-01',
 *   markdown: '### New field added\n\nAdded `priority` field.',
 * });
 *
 * // Append to a specific version's changelog
 * await appendChangelog('OrderCreated', {
 *   createdAt: '2024-09-01',
 *   markdown: '### Bugfix\n\nFixed validation.',
 * }, { version: '1.0.0' });
 * ```
 */
export const appendChangelog =
  (catalogDir: string) =>
  async (id: string, changelog: Changelog, options: { version?: string; format?: 'md' | 'mdx' } = {}): Promise<void> => {
    const { version, format = 'mdx' } = options;

    const resourceFile = await findFileById(catalogDir, id, version);
    if (!resourceFile) {
      throw new Error(`No resource found with id: ${id}${version ? ` and version: ${version}` : ''}`);
    }

    const resourceDir = dirname(resourceFile);

    // Find existing changelog file
    const mdxPath = path.join(resourceDir, 'changelog.mdx');
    const mdPath = path.join(resourceDir, 'changelog.md');
    const existingPath = fsSync.existsSync(mdxPath) ? mdxPath : fsSync.existsSync(mdPath) ? mdPath : undefined;

    if (!existingPath) {
      // No existing changelog — delegate to writeChangelog
      return writeChangelog(catalogDir)(id, changelog, options);
    }

    const existing = matter.read(existingPath);
    const existingContent = existing.content.trim();

    // Build the new entry markdown
    const newEntry = changelog.markdown.trim();

    // Prepend new entry, separated by ---
    const combined = `${newEntry}\n\n---\n\n${existingContent}`;

    // Merge frontmatter: use the new createdAt, merge badges
    const fm: Record<string, any> = { ...existing.data };
    fm.createdAt = changelog.createdAt;

    if (changelog.badges && changelog.badges.length > 0) {
      fm.badges = changelog.badges;
    } else {
      delete fm.badges;
    }

    const document = matter.stringify(combined, fm);
    fsSync.writeFileSync(existingPath, document);
    invalidateFileCache();
  };

/**
 * Returns the changelog for a resource in EventCatalog.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { getChangelog } = utils('/path/to/eventcatalog');
 *
 * // Get the changelog for a resource
 * const changelog = await getChangelog('OrderCreated');
 *
 * // Get the changelog for a specific version
 * const changelog = await getChangelog('OrderCreated', { version: '1.0.0' });
 * ```
 */
export const getChangelog =
  (catalogDir: string) =>
  async (id: string, options: { version?: string } = {}): Promise<Changelog | undefined> => {
    const { version } = options;

    const resourceFile = await findFileById(catalogDir, id, version);
    if (!resourceFile) return undefined;

    const resourceDir = dirname(resourceFile);

    // Try .mdx first, then .md
    const mdxPath = path.join(resourceDir, 'changelog.mdx');
    const mdPath = path.join(resourceDir, 'changelog.md');

    const changelogPath = fsSync.existsSync(mdxPath) ? mdxPath : fsSync.existsSync(mdPath) ? mdPath : undefined;

    if (!changelogPath) return undefined;

    const { data, content } = matter.read(changelogPath);
    return { ...data, markdown: content.trim() } as Changelog;
  };

/**
 * Removes the changelog for a resource in EventCatalog.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { rmChangelog } = utils('/path/to/eventcatalog');
 *
 * // Remove the changelog for a resource
 * await rmChangelog('OrderCreated');
 *
 * // Remove the changelog for a specific version
 * await rmChangelog('OrderCreated', { version: '1.0.0' });
 * ```
 */
export const rmChangelog =
  (catalogDir: string) =>
  async (id: string, options: { version?: string } = {}): Promise<void> => {
    const { version } = options;

    const resourceFile = await findFileById(catalogDir, id, version);
    if (!resourceFile) {
      throw new Error(`No resource found with id: ${id}${version ? ` and version: ${version}` : ''}`);
    }

    const resourceDir = dirname(resourceFile);

    const mdxPath = path.join(resourceDir, 'changelog.mdx');
    const mdPath = path.join(resourceDir, 'changelog.md');

    if (fsSync.existsSync(mdxPath)) {
      await fs.rm(mdxPath);
    }
    if (fsSync.existsSync(mdPath)) {
      await fs.rm(mdPath);
    }

    invalidateFileCache();
  };
