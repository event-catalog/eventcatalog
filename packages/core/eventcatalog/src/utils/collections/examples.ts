import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import { getResourceBasePath } from '@utils/resource-files';

/**
 * A usage example for a message: any text file inside the message's `examples/` folder.
 */
export interface MessageExample {
  /** File path relative to the `examples/` folder, for example `basic-order.json`. */
  fileName: string;
  /** Display title: frontmatter `title`, else the first level-one heading, else the file name. */
  title: string;
  /** File extension without the leading dot. */
  extension: string;
  /** Markdown is rendered as prose; other formats and unsupported MDX are rendered as source. */
  renderMode: 'markdown' | 'code';
  /** Optional short description from frontmatter `summary`. */
  summary?: string;
  /** Optional usage instructions from the legacy examples config. */
  usage?: string;
  /** File contents. Markdown frontmatter is removed. */
  content: string;
}

interface ExampleConfig {
  name?: string;
  summary?: string;
  usage?: string;
}

const CONFIG_FILES = new Set(['examples.config.yaml', 'examples.config.yml', 'examples.config.json']);
const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx']);
const CLIENT_RENDERED_MDX_COMPONENTS = new Set(['Column', 'Columns', 'CodeGroup']);

const loadConfig = (examplesDir: string): Record<string, ExampleConfig> => {
  const configPath = ['examples.config.yaml', 'examples.config.yml', 'examples.config.json']
    .map((fileName) => path.join(examplesDir, fileName))
    .find(fs.existsSync);
  if (!configPath) return {};

  const raw = fs.readFileSync(configPath, 'utf-8');
  return configPath.endsWith('.json') ? JSON.parse(raw) || {} : (yaml.load(raw) as Record<string, ExampleConfig>) || {};
};

const humanizeFileName = (fileName: string) =>
  path
    .parse(fileName)
    .name.replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (character) => character.toUpperCase());

const collectExampleFiles = (dir: string, baseDir: string): string[] => {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectExampleFiles(fullPath, baseDir));
    } else if (entry.isFile() && !CONFIG_FILES.has(entry.name)) {
      results.push(path.relative(baseDir, fullPath));
    }
  }

  return results;
};

const hasUnsupportedMdxComponent = (content: string) =>
  [...content.matchAll(/<([A-Z][A-Za-z0-9.]*)\b/g)].some((match) => !CLIENT_RENDERED_MDX_COMPONENTS.has(match[1]));

/**
 * Splits an example file into its title and Markdown body. The title comes from frontmatter,
 * else the leading level-one heading, else the file name. The body is left as written.
 */
export const parseExampleFile = (fileName: string, raw: string): MessageExample => {
  const { data, content } = matter(raw);
  const body = content.replace(/^\s*\n/, '');
  let title = typeof data.title === 'string' && data.title.trim() ? data.title.trim() : undefined;
  const extension = path.extname(fileName).slice(1).toLowerCase();

  const headingMatch = body.match(/^#[ \t]+(.+)(?:\r?\n|$)/);
  if (headingMatch) title = title ?? headingMatch[1].trim();

  return {
    fileName: fileName.replace(/\\/g, '/'),
    title: title ?? humanizeFileName(fileName),
    extension,
    renderMode: extension === 'mdx' && hasUnsupportedMdxComponent(body) ? 'code' : 'markdown',
    ...(typeof data.summary === 'string' && data.summary.trim() ? { summary: data.summary.trim() } : {}),
    content: body.trim(),
  };
};

const parseRawExampleFile = (fileName: string, raw: string, config: ExampleConfig = {}): MessageExample => ({
  fileName: fileName.replace(/\\/g, '/'),
  title: config.name?.trim() || humanizeFileName(fileName),
  extension: path.extname(fileName).slice(1).toLowerCase(),
  renderMode: 'code',
  ...(config.summary?.trim() ? { summary: config.summary.trim() } : {}),
  ...(config.usage?.trim() ? { usage: config.usage.trim() } : {}),
  content: raw,
});

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
 * Reads usage examples stored in the `examples/` folder next to a message.
 */
export function getExamplesForResource(resource: { filePath?: string }): MessageExample[] {
  const basePath = getResourceBasePath(resource);
  if (!basePath) return [];

  const examplesDir = path.join(basePath, 'examples');
  if (!fs.existsSync(examplesDir)) return [];
  const config = loadConfig(examplesDir);

  return collectExampleFiles(examplesDir, examplesDir)
    .sort((a, b) => a.localeCompare(b))
    .map((fileName) => {
      const raw = fs.readFileSync(path.join(examplesDir, fileName), 'utf-8');
      const normalizedFileName = fileName.replace(/\\/g, '/');
      const extension = path.extname(fileName).toLowerCase();
      if (MARKDOWN_EXTENSIONS.has(extension)) {
        const example = parseExampleFile(fileName, raw);
        const metadata = config[normalizedFileName];
        return {
          ...example,
          ...(metadata?.name?.trim() ? { title: metadata.name.trim() } : {}),
          ...(metadata?.summary?.trim() ? { summary: metadata.summary.trim() } : {}),
          ...(metadata?.usage?.trim() ? { usage: metadata.usage.trim() } : {}),
        };
      }
      return parseRawExampleFile(fileName, raw, config[normalizedFileName]);
    });
}
