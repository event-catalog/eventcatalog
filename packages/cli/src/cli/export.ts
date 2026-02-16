import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import open from 'open';
import createSDK from '@eventcatalog/sdk';

const RESOURCE_TYPES = ['event', 'command', 'query', 'service', 'domain'] as const;
type ResourceType = (typeof RESOURCE_TYPES)[number];

const PLURAL_MAP: Record<string, ResourceType> = {
  events: 'event',
  commands: 'command',
  queries: 'query',
  services: 'service',
  domains: 'domain',
};

interface ExportOptions {
  resource: string;
  id?: string;
  version?: string;
  hydrate?: boolean;
  stdout?: boolean;
  playground?: boolean;
  output?: string;
  dir: string;
}

function normalizeResourceType(resource: string): ResourceType {
  const lower = resource.toLowerCase();
  if (PLURAL_MAP[lower]) return PLURAL_MAP[lower];
  return lower as ResourceType;
}

function getResourceFetcher(sdk: ReturnType<typeof createSDK>, type: ResourceType) {
  switch (type) {
    case 'event':
      return sdk.getEvent;
    case 'command':
      return sdk.getCommand;
    case 'query':
      return sdk.getQuery;
    case 'service':
      return sdk.getService;
    case 'domain':
      return sdk.getDomain;
  }
}

function getCollectionFetcher(sdk: ReturnType<typeof createSDK>, type: ResourceType) {
  switch (type) {
    case 'event':
      return sdk.getEvents;
    case 'command':
      return sdk.getCommands;
    case 'query':
      return sdk.getQueries;
    case 'service':
      return sdk.getServices;
    case 'domain':
      return sdk.getDomains;
  }
}

function pluralize(type: ResourceType): string {
  if (type === 'query') return 'queries';
  return `${type}s`;
}

const SECTION_ORDER = ['team', 'user', 'channel', 'event', 'command', 'query', 'service', 'domain'] as const;

const SECTION_LABELS: Record<string, string> = {
  team: 'TEAMS',
  user: 'USERS',
  channel: 'CHANNELS',
  event: 'EVENTS',
  command: 'COMMANDS',
  query: 'QUERIES',
  service: 'SERVICES',
  domain: 'DOMAINS',
};

function groupDSLBlocks(dsl: string): string {
  const blocks = dsl.split(/\n\n/).filter((b) => b.trim());
  const buckets: Record<string, string[]> = {};

  for (const block of blocks) {
    const firstWord = block.trimStart().split(/\s/)[0];
    const key = firstWord === 'subdomain' ? 'domain' : firstWord;
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(block);
  }

  const sections: string[] = [];
  for (const type of SECTION_ORDER) {
    if (!buckets[type] || buckets[type].length === 0) continue;
    const label = SECTION_LABELS[type] || type.toUpperCase();
    sections.push(`// ${label}\n${buckets[type].join('\n\n')}`);
    delete buckets[type];
  }

  // Any remaining types not in SECTION_ORDER
  for (const [type, items] of Object.entries(buckets)) {
    if (items.length === 0) continue;
    const label = type.toUpperCase();
    sections.push(`// ${label}\n${items.join('\n\n')}`);
  }

  return sections.join('\n\n');
}

const VISUALIZER_TYPES = ['event', 'command', 'query', 'service', 'domain'] as const;

function buildVisualizerBlock(dsl: string, name: string, filterTypes: ResourceType | ResourceType[]): string {
  const types = Array.isArray(filterTypes) ? filterTypes : [filterTypes];
  const entries: string[] = [];

  for (const line of dsl.split('\n')) {
    const trimmed = line.trimStart();
    const parts = trimmed.split(/\s/);
    const keyword = parts[0];
    const id = parts[1];
    if (!types.includes(keyword as ResourceType)) continue;
    if (!id || !trimmed.endsWith('{')) continue;
    entries.push(`  ${keyword} ${id}`);
  }

  if (entries.length === 0) return '';
  return `\nvisualizer main {\n  name "${name}"\n${entries.join('\n')}\n}`;
}

export async function exportCatalog(options: Omit<ExportOptions, 'resource'>): Promise<string> {
  const { hydrate = false, stdout = false, playground = false, output, dir } = options;

  const sdk = createSDK(dir);
  const dslParts: string[] = [];

  for (const type of RESOURCE_TYPES) {
    const fetcher = getCollectionFetcher(sdk, type);
    const resources = await fetcher({ latestOnly: true });
    if (!resources || resources.length === 0) continue;
    const rawDsl = await sdk.toDSL(resources, { type, hydrate });
    dslParts.push(rawDsl);
  }

  if (dslParts.length === 0) {
    throw new Error(`No resources found in catalog at '${dir}'`);
  }

  const combined = dslParts.join('\n\n');
  const grouped = groupDSLBlocks(combined);
  const vizBlock = buildVisualizerBlock(grouped, 'Full Catalog', [...RESOURCE_TYPES]);
  const dsl = vizBlock ? `${grouped}\n${vizBlock}` : grouped;

  if (stdout) {
    return dsl;
  }

  const filename = output || 'catalog.ec';
  const filepath = resolve(filename);
  writeFileSync(filepath, dsl + '\n', 'utf-8');

  const lines = ['', `  Exported full catalog to ${filepath}`];

  if (playground) {
    const encoded = Buffer.from(dsl).toString('base64');
    const playgroundUrl = `https://playground.eventcatalog.dev/?code=${encoded}`;
    await open(playgroundUrl);
    lines.push('', `  Opening in playground...`);
  } else {
    lines.push('', `  Tip: Use --playground to open in the playground`);
  }

  lines.push('');
  return lines.join('\n');
}

export async function exportAll(options: ExportOptions): Promise<string> {
  const { resource, hydrate = false, stdout = false, playground = false, output, dir } = options;

  const type = normalizeResourceType(resource);
  if (!RESOURCE_TYPES.includes(type)) {
    throw new Error(`Invalid resource type '${resource}'. Must be one of: ${RESOURCE_TYPES.join(', ')}`);
  }

  const plural = pluralize(type);
  const sdk = createSDK(dir);

  const fetcher = getCollectionFetcher(sdk, type);
  const allResources = (await fetcher({ latestOnly: true })) || [];

  if (allResources.length === 0) {
    throw new Error(`No ${plural} found in catalog at '${dir}'`);
  }

  const rawDsl = await sdk.toDSL(allResources, { type, hydrate });
  const grouped = groupDSLBlocks(rawDsl);
  const vizBlock = buildVisualizerBlock(grouped, `All ${plural}`, type);
  const dsl = vizBlock ? `${grouped}\n${vizBlock}` : grouped;

  if (stdout) {
    return dsl;
  }

  const filename = output || `${plural}.ec`;
  const filepath = resolve(filename);
  writeFileSync(filepath, dsl + '\n', 'utf-8');

  const lines = ['', `  Exported ${allResources.length} ${plural} to ${filepath}`];

  if (playground) {
    const encoded = Buffer.from(dsl).toString('base64');
    const playgroundUrl = `https://playground.eventcatalog.dev/?code=${encoded}`;
    await open(playgroundUrl);
    lines.push('', `  Opening in playground...`);
  } else {
    lines.push('', `  Tip: Use --playground to open in the playground`);
  }

  lines.push('');
  return lines.join('\n');
}

export async function exportResource(options: ExportOptions): Promise<string> {
  const { resource, id, version, hydrate = false, stdout = false, playground = false, output, dir } = options;

  if (!id) {
    return exportAll(options);
  }

  const type = normalizeResourceType(resource);
  if (!RESOURCE_TYPES.includes(type)) {
    throw new Error(`Invalid resource type '${resource}'. Must be one of: ${RESOURCE_TYPES.join(', ')}`);
  }

  const sdk = createSDK(dir);

  const fetcher = getResourceFetcher(sdk, type);
  const data = await fetcher(id, version);

  if (!data) {
    const versionStr = version ? `@${version}` : ' (latest)';
    throw new Error(`${resource} '${id}${versionStr}' not found in catalog at '${dir}'`);
  }

  const rawDsl = await sdk.toDSL(data, { type, hydrate });
  const grouped = hydrate ? groupDSLBlocks(rawDsl) : rawDsl;
  const vizBlock = buildVisualizerBlock(grouped, `View of ${id}`, type);
  const dsl = vizBlock ? `${grouped}\n${vizBlock}` : grouped;

  if (stdout) {
    return dsl;
  }

  const filename = output || `${id}.ec`;
  const filepath = resolve(filename);
  writeFileSync(filepath, dsl + '\n', 'utf-8');

  const lines = ['', `  Exported ${type} '${id}' to ${filepath}`];

  if (playground) {
    const encoded = Buffer.from(dsl).toString('base64');
    const playgroundUrl = `https://playground.eventcatalog.dev/?code=${encoded}`;
    await open(playgroundUrl);
    lines.push('', `  Opening in playground...`);
  } else {
    lines.push('', `  Tip: Use --playground to open in the playground`);
  }

  lines.push('');
  return lines.join('\n');
}
