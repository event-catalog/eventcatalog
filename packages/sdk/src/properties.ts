import { normalize, relative, resolve, sep } from 'node:path';
import type { IndexResourceType } from './index-types';
import { getCachedIndexFiles } from './internal/utils';

/** Custom properties are the frontmatter fields that start with `x-` (e.g. `x-operational-tier: 1`). */
export const CUSTOM_PROPERTY_PREFIX = 'x-';

export const isCustomPropertyName = (name: string) =>
  name.startsWith(CUSTOM_PROPERTY_PREFIX) && name.length > CUSTOM_PROPERTY_PREFIX.length;

/** The folder each kind of resource lives in. A resource's kind is the last of these in its path. */
const FOLDER_TYPES: Record<string, IndexResourceType> = {
  adrs: 'adr',
  agents: 'agent',
  channels: 'channel',
  commands: 'command',
  containers: 'container',
  'data-products': 'data-product',
  diagrams: 'diagram',
  domains: 'domain',
  entities: 'entity',
  events: 'event',
  flows: 'flow',
  queries: 'query',
  services: 'service',
  systems: 'system',
};

export type PropertyResourceType = Exclude<IndexResourceType, 'team' | 'user'>;

export interface ResourceWithProperty {
  type: PropertyResourceType;
  id: string;
  version?: string;
  /** The property's value, as written in the frontmatter. */
  value: unknown;
  /** The resource's file. */
  path: string;
  /** False for an older version (in a `versioned` folder). */
  latest: boolean;
}

export interface GetResourcesByPropertyOptions {
  /** Only resources whose value is this one. */
  equals?: unknown;
  /** Only resources whose value is one of these. */
  in?: unknown[];
  /** Only these kinds of resource. */
  types?: PropertyResourceType[];
  /** Only the latest version of each resource. */
  latestOnly?: boolean;
}

/** A value as text, so `true`, `1` and `2027-02-10` compare the same whether YAML read them as text or not. */
const asText = (value: unknown): string | undefined => {
  if (value instanceof Date) {
    const iso = value.toISOString();
    return iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : iso;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint')
    return String(value);
  return undefined;
};

/**
 * Whether a custom property's value is one of `expected`. Values are compared as text (`true` matches `'true'`), and a
 * list matches when any of its items does. Objects never match.
 */
export const matchesProperty = (value: unknown, expected: readonly unknown[]): boolean => {
  const wanted = new Set(expected.map(asText).filter((v): v is string => v !== undefined));
  const values = Array.isArray(value) ? value : [value];
  return values.some((v) => {
    const text = asText(v);
    return text !== undefined && wanted.has(text);
  });
};

/** Each custom property's resources, built once from the SDK's file cache and again only when the files change. */
let lookup: { dir: string; generation: number; byProperty: Map<string, ResourceWithProperty[]> } | undefined;

const typeOf = (catalogDir: string, file: string): PropertyResourceType | undefined => {
  const folders = relative(catalogDir, file).split(sep).slice(0, -1);
  // An example's index file isn't a resource
  if (folders.includes('examples')) return undefined;
  for (let i = folders.length - 1; i >= 0; i--) {
    const type = FOLDER_TYPES[folders[i]];
    if (type) return type as PropertyResourceType;
  }
  return undefined;
};

const propertyLookup = (catalogDir: string) => {
  const dir = normalize(resolve(catalogDir));
  const { generation, files } = getCachedIndexFiles(dir);
  if (lookup?.dir === dir && lookup.generation === generation) return lookup.byProperty;

  const byProperty = new Map<string, ResourceWithProperty[]>();
  for (const [path, { data }] of files) {
    if (!data?.id) continue;
    const names = Object.keys(data).filter(isCustomPropertyName);
    if (!names.length) continue;
    const type = typeOf(dir, path);
    if (!type) continue;
    const latest = !path.split(sep).includes('versioned');
    for (const name of names) {
      const entry: ResourceWithProperty = {
        type,
        id: String(data.id),
        ...(data.version !== undefined && { version: String(data.version) }),
        value: data[name],
        path,
        latest,
      };
      const list = byProperty.get(name);
      if (list) list.push(entry);
      else byProperty.set(name, [entry]);
    }
  }
  lookup = { dir, generation, byProperty };
  return byProperty;
};

/**
 * Returns the resources that have a custom property (`x-…`), optionally with a given value.
 *
 * The catalog's frontmatter is read once and kept in memory (as the SDK's other lookups do), so repeated lookups don't
 * read any files.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/sdk';
 *
 * const { getResourcesByProperty } = utils('/path/to/eventcatalog');
 *
 * // Everything with x-public
 * await getResourcesByProperty('x-public');
 * // Latest services and events where x-public is true
 * await getResourcesByProperty('x-public', { equals: true, types: ['service', 'event'], latestOnly: true });
 * // Tier 1 or tier 2
 * await getResourcesByProperty('x-tier', { in: [1, 2] });
 * ```
 */
export const getResourcesByProperty =
  (catalogDir: string) =>
  async (property: string, options: GetResourcesByPropertyOptions = {}): Promise<ResourceWithProperty[]> => {
    if (!isCustomPropertyName(property))
      throw new Error(`"${property}" isn't a custom property: custom properties start with "${CUSTOM_PROPERTY_PREFIX}"`);
    const expected = options.in ?? (options.equals !== undefined ? [options.equals] : undefined);
    const types = options.types ? new Set<string>(options.types) : undefined;
    return (propertyLookup(catalogDir).get(property) ?? [])
      .filter(
        (r) =>
          (!options.latestOnly || r.latest) && (!types || types.has(r.type)) && (!expected || matchesProperty(r.value, expected))
      )
      .map((r) => ({ ...r }));
  };
