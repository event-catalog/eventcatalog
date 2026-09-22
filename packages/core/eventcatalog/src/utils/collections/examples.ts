import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getResourceBasePath } from '@utils/resource-files';

/**
 * A usage example for a message: a Markdown file inside the message's `examples/` folder.
 */
export interface MessageExample {
  /** File path relative to the `examples/` folder, for example `basic-order.md`. */
  fileName: string;
  /** Display title: frontmatter `title`, else the first level-one heading, else the file name. */
  title: string;
  /** Optional short description from frontmatter `summary`. */
  summary?: string;
  /** Markdown body with the frontmatter removed. Rendered as written, heading included. */
  content: string;
}

const EXAMPLE_EXTENSIONS = new Set(['.md', '.mdx']);

const humanizeFileName = (fileName: string) =>
  path
    .parse(fileName)
    .name.replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (character) => character.toUpperCase());

const collectMarkdownFiles = (dir: string, baseDir: string): string[] => {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMarkdownFiles(fullPath, baseDir));
    } else if (entry.isFile() && EXAMPLE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      results.push(path.relative(baseDir, fullPath));
    }
  }

  return results;
};

/**
 * Splits an example file into its title and Markdown body. The title comes from frontmatter,
 * else the leading level-one heading, else the file name. The body is left as written.
 */
export const parseExampleFile = (fileName: string, raw: string): MessageExample => {
  const { data, content } = matter(raw);
  const body = content.replace(/^\s*\n/, '');
  let title = typeof data.title === 'string' && data.title.trim() ? data.title.trim() : undefined;

  const headingMatch = body.match(/^#[ \t]+(.+)(?:\r?\n|$)/);
  if (headingMatch) title = title ?? headingMatch[1].trim();

  return {
    fileName: fileName.replace(/\\/g, '/'),
    title: title ?? humanizeFileName(fileName),
    ...(typeof data.summary === 'string' && data.summary.trim() ? { summary: data.summary.trim() } : {}),
    content: body.trim(),
  };
};

/** The parts of an `examples` collection entry the schema pages need. */
export interface ExampleEntryLike {
  id: string;
  filePath?: string;
  body?: string;
  data: { title?: string; summary?: string };
}

const normalize = (value: string) => path.resolve(value).replace(/\\/g, '/');

/**
 * Selects the example entries that belong to a message: the files under the `examples/`
 * folder beside the message file, sorted by path.
 */
export function getExampleEntriesForMessage<T extends ExampleEntryLike>(entries: T[], messageFilePath?: string): T[] {
  if (!messageFilePath) return [];
  const examplesDir = `${normalize(path.dirname(messageFilePath))}/examples/`;

  return entries
    .filter((entry) => entry.filePath && normalize(entry.filePath).startsWith(examplesDir))
    .sort((a, b) => (a.filePath as string).localeCompare(b.filePath as string));
}

/**
 * Display details for a collection entry, mirroring `parseExampleFile`: frontmatter title,
 * else the first level-one heading, else the file name.
 */
export function getExampleEntryDetails(entry: ExampleEntryLike, examplesDir?: string) {
  const fileName =
    entry.filePath && examplesDir
      ? path.relative(examplesDir, entry.filePath).replace(/\\/g, '/')
      : path.basename(entry.filePath ?? entry.id);
  const parsed = parseExampleFile(fileName, entry.body ?? '');

  return {
    fileName,
    title: entry.data.title?.trim() || parsed.title,
    summary: entry.data.summary?.trim() || parsed.summary,
  };
}

/**
 * Reads the Markdown examples stored in the `examples/` folder next to a message.
 */
export function getExamplesForResource(resource: { filePath?: string }): MessageExample[] {
  const basePath = getResourceBasePath(resource);
  if (!basePath) return [];

  const examplesDir = path.join(basePath, 'examples');
  if (!fs.existsSync(examplesDir)) return [];

  return collectMarkdownFiles(examplesDir, examplesDir)
    .sort((a, b) => a.localeCompare(b))
    .map((fileName) => parseExampleFile(fileName, fs.readFileSync(path.join(examplesDir, fileName), 'utf-8')));
}
