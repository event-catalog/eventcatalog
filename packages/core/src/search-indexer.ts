import fs from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';
import matter from 'gray-matter';
import type { Config } from './eventcatalog.config';

type SearchRecord = {
  url: string;
  title: string;
  content: string;
  type: string;
  collection: string;
  id?: string;
  version?: string;
  summary?: string;
};

type BuildSearchIndexOptions = {
  projectDir: string;
  outDir: string;
  config: Config;
  isServer: boolean;
  searchOutputPath?: string;
};

const RESOURCE_COLLECTIONS: Record<string, { docsPath: string; type: string }> = {
  adrs: { docsPath: 'adrs', type: 'Architecture Decision' },
  agents: { docsPath: 'agents', type: 'Agent' },
  channels: { docsPath: 'channels', type: 'Channel' },
  commands: { docsPath: 'commands', type: 'Command' },
  containers: { docsPath: 'containers', type: 'Container' },
  'data-products': { docsPath: 'data-products', type: 'Data Product' },
  domains: { docsPath: 'domains', type: 'Domain' },
  entities: { docsPath: 'entities', type: 'Entity' },
  events: { docsPath: 'events', type: 'Event' },
  flows: { docsPath: 'flows', type: 'Flow' },
  queries: { docsPath: 'queries', type: 'Query' },
  services: { docsPath: 'services', type: 'Service' },
  subdomains: { docsPath: 'domains', type: 'Domain' },
};

const IGNORED_GLOBS = [
  '**/.git/**',
  '**/.eventcatalog-core/**',
  '**/dist/**',
  '**/node_modules/**',
  '**/public/**',
  '**/snippets/**',
  '**/chat-prompts/**',
];

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, '');

const normalizePath = (value: string) => value.replace(/\\/g, '/');

const removeExtension = (value: string) => value.replace(/\.(md|mdx)$/i, '');

const stripNumericPrefix = (value: string) => value.replace(/^\d+(?:[-_.\s]+)?/, '') || value;

const normalizeUrlPath = (value: string) => {
  const withoutIndex = value.replace(/\/index$/i, '');
  return withoutIndex || '';
};

const buildUrl = (pathname: string, config: Config) => {
  const base = config.base ? `/${trimSlashes(config.base)}` : '';
  const cleanPath = `/${trimSlashes(pathname)}`;
  const url = `${base}${cleanPath}`.replace(/\/{2,}/g, '/');

  if (config.trailingSlash === true && !url.endsWith('/')) {
    return `${url}/`;
  }

  return url || '/';
};

const valueToSearchText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(valueToSearchText).filter(Boolean).join(' ');
  if (typeof value === 'object') return Object.values(value).map(valueToSearchText).filter(Boolean).join(' ');
  return '';
};

export const markdownToSearchText = (content: string) => {
  return content
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/^\s*import\s+.*$/gm, ' ')
    .replace(/^\s*export\s+.*$/gm, ' ')
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```[a-zA-Z0-9-]*\n?/g, ' ').replace(/```/g, ' '))
    .replace(/<([A-Z][A-Za-z0-9.]*)\b([^>]*)\/?>/g, (_match, _component, attributes) => {
      const quotedValues = [...String(attributes).matchAll(/(?:title|label|description|alt|summary)=["'`]([^"'`]+)["'`]/g)];
      return quotedValues.map((entry) => entry[1]).join(' ');
    })
    .replace(/<\/?[A-Za-z][^>]*>/g, ' ')
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*_~>#|{}[\]():]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const inferDocIdFromFile = (relativePath: string, frontmatterId?: string) => {
  if (frontmatterId) return frontmatterId;

  const fileName = path.posix.basename(removeExtension(relativePath));
  if (fileName.toLowerCase() === 'index') {
    return path.posix.basename(path.posix.dirname(relativePath));
  }

  return stripNumericPrefix(fileName);
};

const findResourceSegment = (segments: string[]) => {
  let match: { index: number; segment: string } | null = null;

  for (let index = 0; index < segments.length - 1; index++) {
    const segment = segments[index];
    if (segments[index - 1] === 'docs') {
      continue;
    }
    if (RESOURCE_COLLECTIONS[segment] && segments[index + 1]) {
      match = { index, segment };
    }
  }

  return match;
};

const readResourceFrontmatter = async (projectDir: string, resourcePath: string) => {
  const candidates = [path.join(projectDir, resourcePath, 'index.mdx'), path.join(projectDir, resourcePath, 'index.md')];

  for (const candidate of candidates) {
    try {
      const file = await fs.readFile(candidate, 'utf8');
      return matter(file).data as Record<string, any>;
    } catch {
      // Try the next possible index file.
    }
  }

  return {};
};

const deriveRecordFromPath = async ({
  projectDir,
  relativePath,
  data,
  config,
}: {
  projectDir: string;
  relativePath: string;
  data: Record<string, any>;
  config: Config;
}): Promise<Omit<SearchRecord, 'content'> | null> => {
  const normalizedRelativePath = normalizePath(relativePath);
  const segments = normalizedRelativePath.split('/').filter(Boolean);
  const fileName = segments[segments.length - 1] || '';
  const fileNameWithoutExtension = removeExtension(fileName);

  if (data.hidden === true || data.draft) {
    return null;
  }

  if (segments[0] === 'docs') {
    const customPath = normalizeUrlPath(removeExtension(segments.slice(1).join('/')));
    const title = data.title || data.label || path.posix.basename(customPath) || 'Custom docs';

    return {
      url: buildUrl(`/docs/custom/${customPath}`, config),
      title,
      summary: data.summary,
      type: 'Custom Doc',
      collection: 'custom-docs',
      id: customPath,
    };
  }

  if (segments[0] === 'users' || segments[0] === 'teams') {
    const id = data.id || (fileNameWithoutExtension === 'index' ? segments[1] : fileNameWithoutExtension);
    const type = segments[0] === 'users' ? 'User' : 'Team';

    return {
      url: buildUrl(`/docs/${segments[0]}/${id}`, config),
      title: data.name || data.title || id,
      summary: data.summary,
      type,
      collection: segments[0],
      id,
    };
  }

  const resourceMatch = findResourceSegment(segments);
  if (!resourceMatch) {
    return null;
  }

  const resourceConfig = RESOURCE_COLLECTIONS[resourceMatch.segment];
  const resourceFolderId = segments[resourceMatch.index + 1];
  const resourcePathSegments = segments.slice(0, resourceMatch.index + 2);
  const versionFromPath =
    segments[resourceMatch.index + 2] === 'versioned' && segments[resourceMatch.index + 3]
      ? segments[resourceMatch.index + 3]
      : undefined;
  if (versionFromPath) {
    resourcePathSegments.push('versioned', versionFromPath);
  }
  const resourcePath = resourcePathSegments.join('/');
  const resourceData = fileNameWithoutExtension === 'index' ? data : await readResourceFrontmatter(projectDir, resourcePath);
  const resourceId = resourceData.id || data.resourceId || resourceFolderId;
  const resourceVersion = versionFromPath || resourceData.version || data.resourceVersion || data.version;

  if (!resourceVersion) {
    return null;
  }

  if (fileNameWithoutExtension === 'index') {
    return {
      url: buildUrl(`/docs/${resourceConfig.docsPath}/${resourceId}/${resourceVersion}`, config),
      title: data.name || data.title || resourceId,
      summary: data.summary,
      type: resourceConfig.type,
      collection: resourceConfig.docsPath,
      id: resourceId,
      version: resourceVersion,
    };
  }

  if (fileNameWithoutExtension === 'ubiquitous-language') {
    return {
      url: buildUrl(`/docs/${resourceConfig.docsPath}/${resourceId}/language`, config),
      title: data.title || `${resourceData.name || resourceId} ubiquitous language`,
      summary: data.summary,
      type: 'Language',
      collection: 'language',
      id: resourceId,
      version: resourceVersion,
    };
  }

  if (fileNameWithoutExtension === 'changelog') {
    return {
      url: buildUrl(`/docs/${resourceConfig.docsPath}/${resourceId}/${resourceVersion}/changelog`, config),
      title: data.title || `${resourceData.name || resourceId} changelog`,
      summary: data.summary,
      type: 'Changelog',
      collection: 'changelog',
      id: resourceId,
      version: resourceVersion,
    };
  }

  const docsIndex = segments.indexOf('docs');
  if (docsIndex > resourceMatch.index) {
    const docType = data.type || segments[docsIndex + 1] || 'pages';
    const docId = inferDocIdFromFile(normalizedRelativePath, data.id);
    const title = data.title || stripNumericPrefix(removeExtension(fileName));

    return {
      url: buildUrl(`/docs/${resourceConfig.docsPath}/${resourceId}/${resourceVersion}/${docType}/${docId}`, config),
      title,
      summary: data.summary,
      type: 'Resource Doc',
      collection: docType,
      id: docId,
      version: data.version || resourceVersion,
    };
  }

  if (segments[0] === 'diagrams') {
    const id = data.id || resourceFolderId;
    const version = data.version || resourceVersion;

    return {
      url: buildUrl(`/diagrams/${id}/${version}`, config),
      title: data.name || data.title || id,
      summary: data.summary,
      type: 'Design',
      collection: 'diagrams',
      id,
      version,
    };
  }

  return null;
};

export const collectSearchRecords = async ({
  projectDir,
  config,
}: {
  projectDir: string;
  config: Config;
}): Promise<SearchRecord[]> => {
  const files = await glob('**/*.{md,mdx}', {
    cwd: projectDir,
    absolute: true,
    nodir: true,
    ignore: IGNORED_GLOBS,
    windowsPathsNoEscape: process.platform === 'win32',
  });

  const records = await Promise.all(
    files.map(async (file) => {
      const raw = await fs.readFile(file, 'utf8');
      const parsed = matter(raw);
      const relativePath = normalizePath(path.relative(projectDir, file));
      const baseRecord = await deriveRecordFromPath({
        projectDir,
        relativePath,
        data: parsed.data,
        config,
      });

      if (!baseRecord) {
        return null;
      }

      const frontmatterText = valueToSearchText({
        id: baseRecord.id,
        title: baseRecord.title,
        summary: baseRecord.summary,
        version: baseRecord.version,
        owners: parsed.data.owners,
        status: parsed.data.status,
        date: parsed.data.date,
        decisionMakers: parsed.data.decisionMakers,
        appliesTo: parsed.data.appliesTo,
        badges: parsed.data.badges,
      });

      const content = [frontmatterText, markdownToSearchText(parsed.content)].filter(Boolean).join('\n\n');

      if (!content.trim()) {
        return null;
      }

      return {
        ...baseRecord,
        content,
      };
    })
  );

  const uniqueRecords = new Map<string, SearchRecord>();
  for (const record of records) {
    if (!record) continue;
    uniqueRecords.set(record.url, record);
  }

  return [...uniqueRecords.values()].sort((a, b) => a.url.localeCompare(b.url));
};

const getSearchOutputPath = ({
  outDir,
  isServer,
  searchOutputPath,
}: Pick<BuildSearchIndexOptions, 'outDir' | 'isServer' | 'searchOutputPath'>) => {
  if (searchOutputPath) {
    return searchOutputPath;
  }

  return path.join(outDir, isServer ? 'client' : '', 'pagefind');
};

export const buildSearchIndex = async ({ projectDir, outDir, config, isServer, searchOutputPath }: BuildSearchIndexOptions) => {
  const records = await collectSearchRecords({ projectDir, config });

  if (records.length === 0) {
    throw new Error('No searchable Markdown or MDX content was found.');
  }

  const pagefind = (await import('pagefind')) as any;
  const { index } = await pagefind.createIndex({
    keepIndexUrl: false,
    writePlayground: false,
  });

  const errors: string[] = [];

  for (const record of records) {
    const result = await index.addCustomRecord({
      url: record.url,
      content: record.content,
      language: 'en',
      meta: {
        title: record.title,
        summary: record.summary || '',
        type: record.type,
        collection: record.collection,
        id: record.id || '',
        version: record.version || '',
      },
      filters: {
        type: [record.type],
        collection: [record.collection],
      },
    });

    if (result.errors?.length) {
      errors.push(...result.errors.map((error: any) => `${record.url}: ${error.message || error}`));
    }
  }

  const outputPath = getSearchOutputPath({ outDir, isServer, searchOutputPath });
  await fs.rm(outputPath, { recursive: true, force: true });

  const writeResult = await index.writeFiles({ outputPath });
  if (writeResult.errors?.length) {
    errors.push(...writeResult.errors.map((error: any) => error.message || String(error)));
  }

  await index.deleteIndex?.();
  await pagefind.close?.();

  if (errors.length > 0) {
    throw new Error(`Failed to build indexed search:\n${errors.join('\n')}`);
  }

  return {
    records: records.length,
    outputPath,
  };
};
