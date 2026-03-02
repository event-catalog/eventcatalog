import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import open from 'open';
import createSDK from '@eventcatalog/sdk';

const RESOURCE_TYPES = ['event', 'command', 'query', 'service', 'domain'] as const;
type ResourceType = (typeof RESOURCE_TYPES)[number];
const SUPPORTED_RESOURCE_TYPES = RESOURCE_TYPES.join(', ');

const PLURAL_MAP: Record<string, ResourceType> = {
  events: 'event',
  commands: 'command',
  queries: 'query',
  services: 'service',
  domains: 'domain',
};

const KNOWN_UNSUPPORTED_EXPORT_TYPES = new Set([
  'channel',
  'channels',
  'team',
  'teams',
  'user',
  'users',
  'container',
  'containers',
  'data-product',
  'data-products',
  'dataproduct',
  'dataproducts',
  'diagram',
  'diagrams',
  'flow',
  'flows',
]);

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

function assertSupportedExportType(resource: string, type: ResourceType): void {
  const lower = resource.toLowerCase();

  if (KNOWN_UNSUPPORTED_EXPORT_TYPES.has(lower)) {
    throw new Error(
      `Resource type '${resource}' is not yet supported for DSL export. Supported types: ${SUPPORTED_RESOURCE_TYPES}`
    );
  }

  if (!RESOURCE_TYPES.includes(type)) {
    throw new Error(`Invalid resource type '${resource}'. Must be one of: ${SUPPORTED_RESOURCE_TYPES}`);
  }
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

/**
 * Groups DSL blocks by resource type and orders them with section headers.
 *
 * Raw toDSL output may interleave different resource types (e.g. teams, channels,
 * services, events). This splits on blank lines, buckets each block by its leading
 * keyword, then reassembles in SECTION_ORDER with "// EVENTS" style headers.
 */
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

interface ResourceDefinition {
  keyword: string;
  id: string;
  version?: string;
}

/**
 * Extracts resource definitions from DSL text by scanning for top-level
 * `<keyword> <id> {` lines and reading the version from the block body.
 */
function extractResourceDefinitions(dsl: string, filterTypes: string[]): ResourceDefinition[] {
  const results: ResourceDefinition[] = [];
  const lines = dsl.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimStart();
    const parts = trimmed.split(/\s/);
    const keyword = parts[0];
    const id = parts[1];
    if (!filterTypes.includes(keyword)) continue;
    if (!id || !trimmed.endsWith('{')) continue;

    // Look ahead inside the block for a `version X.Y.Z` line
    let version: string | undefined;
    for (let j = i + 1; j < lines.length; j++) {
      const inner = lines[j].trim();
      if (inner === '}') break;
      const vMatch = inner.match(/^version\s+(.+)$/);
      if (vMatch) {
        version = vMatch[1];
        break;
      }
    }
    results.push({ keyword, id, version });
  }

  return results;
}

/**
 * Builds a `visualizer main { ... }` block listing all resource definitions
 * found in the DSL output.
 *
 * When multiple versions of the same resource exist (e.g. two versions of
 * OrderService), references are version-qualified (`service OrderService@1.0.0`)
 * to avoid ambiguity. Single-version resources use bare ids.
 */
function buildVisualizerBlock(dsl: string, name: string, filterTypes: ResourceType | ResourceType[]): string {
  const types = Array.isArray(filterTypes) ? filterTypes : [filterTypes];
  const definitions = extractResourceDefinitions(dsl, types);

  if (definitions.length === 0) return '';

  // Count occurrences of each keyword+id to detect duplicates needing version qualification
  const counts = new Map<string, number>();
  for (const def of definitions) {
    const key = `${def.keyword}:${def.id}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const entries = definitions.map((def) => {
    const key = `${def.keyword}:${def.id}`;
    const needsVersion = (counts.get(key) || 0) > 1 && def.version;
    const ref = needsVersion ? `${def.id}@${def.version}` : def.id;
    return `  ${def.keyword} ${ref}`;
  });

  return `\nvisualizer main {\n  name "${name}"\n${entries.join('\n')}\n}`;
}

export async function exportCatalog(options: Omit<ExportOptions, 'resource'>): Promise<string> {
  const { hydrate = false, stdout = false, playground = false, output, dir } = options;

  const sdk = createSDK(dir);
  // Independent collection fetches/conversions can run in parallel.
  // Promise.all preserves RESOURCE_TYPES order in the resulting array.
  const dslParts = (
    await Promise.all(
      RESOURCE_TYPES.map(async (type) => {
        const fetcher = getCollectionFetcher(sdk, type);
        const resources = await fetcher({ latestOnly: true });
        if (!resources || resources.length === 0) return '';
        return sdk.toDSL(resources, { type, hydrate });
      })
    )
  ).filter((dsl): dsl is string => Boolean(dsl));

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
    const playgroundUrl = `https://compass.eventcatalog.dev/?code=${encoded}`;
    await open(playgroundUrl);
    lines.push('', `  Opening in EventCatalog Compass...`);
  } else {
    lines.push('', `  Tip: Use --playground to open in EventCatalog Compass`);
  }

  lines.push('');
  return lines.join('\n');
}

export async function exportAll(options: ExportOptions): Promise<string> {
  const { resource, hydrate = false, stdout = false, playground = false, output, dir } = options;

  const type = normalizeResourceType(resource);
  assertSupportedExportType(resource, type);

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
    const playgroundUrl = `https://compass.eventcatalog.dev/?code=${encoded}`;
    await open(playgroundUrl);
    lines.push('', `  Opening in EventCatalog Compass...`);
  } else {
    lines.push('', `  Tip: Use --playground to open in EventCatalog Compass`);
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
  assertSupportedExportType(resource, type);

  const sdk = createSDK(dir);

  const fetcher = getResourceFetcher(sdk, type);
  const data = await fetcher(id, version);

  if (!data) {
    const versionStr = version ? `@${version}` : ' (latest)';
    throw new Error(`${resource} '${id}${versionStr}' not found in catalog at '${dir}'`);
  }

  const rawDsl = await sdk.toDSL(data, { type, hydrate });

  // When hydrating, toDSL pulls in related resources (services, channels, owners)
  // so we group by type with section headers and widen the visualizer filter to
  // include all resource types that may appear in the hydrated output.
  const grouped = hydrate ? groupDSLBlocks(rawDsl) : rawDsl;
  const vizTypes: ResourceType[] = hydrate ? [...RESOURCE_TYPES] : [type];
  const vizBlock = buildVisualizerBlock(grouped, `View of ${id}`, vizTypes);
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
    const playgroundUrl = `https://compass.eventcatalog.dev/?code=${encoded}`;
    await open(playgroundUrl);
    lines.push('', `  Opening in EventCatalog Compass...`);
  } else {
    lines.push('', `  Tip: Use --playground to open in EventCatalog Compass`);
  }

  lines.push('');
  return lines.join('\n');
}
