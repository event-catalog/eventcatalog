/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/eventcatalog/src/enterprise/LICENSE
 */

import utils, { type CatalogGraphResourceType, type CatalogGraphRoot, type FlatCatalogGraph } from '@eventcatalog/sdk';
import { getCollection } from 'astro:content';
import { getItemsFromCollectionByIdAndSemverOrLatest } from '@utils/collections/util';

export const MCP_SCOPE_COLLECTIONS = [
  'domains',
  'systems',
  'services',
  'agents',
  'events',
  'commands',
  'queries',
  'flows',
  'channels',
  'entities',
  'containers',
  'data-products',
  'adrs',
  'diagrams',
] as const;

export type McpScopeCollection = (typeof MCP_SCOPE_COLLECTIONS)[number];
export type McpScopeKind = 'domain' | 'system';

export type McpScopeRef = {
  kind: McpScopeKind;
  id: string;
  version?: string;
};

type CatalogEntry = {
  collection: string;
  data: {
    id: string;
    version: string;
    name?: string;
    summary?: string;
    hidden?: boolean;
    [key: string]: any;
  };
  [key: string]: any;
};

type CollectionLoader = (collection: McpScopeCollection) => Promise<CatalogEntry[]>;
type GraphLoader = (root: CatalogGraphRoot, options: { flat: true }) => Promise<FlatCatalogGraph | undefined>;

const graphTypeToCollection: Record<CatalogGraphResourceType, McpScopeCollection> = {
  domain: 'domains',
  system: 'systems',
  service: 'services',
  agent: 'agents',
  event: 'events',
  command: 'commands',
  query: 'queries',
  flow: 'flows',
  channel: 'channels',
  entity: 'entities',
  container: 'containers',
  'data-product': 'data-products',
  adr: 'adrs',
};

const entryKey = (id: string, version: string) => `${id}@${version}`;
const encodeUriPart = (value: string) => encodeURIComponent(value);

export class McpScopeNotFoundError extends Error {}

export class McpScope {
  readonly entries = new Map<string, Map<string, CatalogEntry>>();
  readonly ref: Required<McpScopeRef>;
  readonly root: CatalogEntry;
  readonly uriPrefix: string;

  constructor(ref: McpScopeRef, root: CatalogEntry) {
    this.ref = { ...ref, version: root.data.version } as Required<McpScopeRef>;
    this.root = root;
    this.uriPrefix = `eventcatalog://${ref.kind}s/${encodeUriPart(root.data.id)}/${encodeUriPart(root.data.version)}`;
  }

  add(entry: CatalogEntry | undefined) {
    if (!entry || entry.data.hidden === true) return false;

    const collectionEntries = this.entries.get(entry.collection) ?? new Map<string, CatalogEntry>();
    const key = entryKey(entry.data.id, entry.data.version);
    if (collectionEntries.has(key)) return false;

    collectionEntries.set(key, entry);
    this.entries.set(entry.collection, collectionEntries);
    return true;
  }

  has(collection: string, id: string, version?: string) {
    const entries = Array.from(this.entries.get(collection)?.values() ?? []);
    return getItemsFromCollectionByIdAndSemverOrLatest(entries, id, version).length > 0;
  }

  list(collection: string) {
    return Array.from(this.entries.get(collection)?.values() ?? []);
  }

  listAll() {
    return Array.from(this.entries.values()).flatMap((entries) => Array.from(entries.values()));
  }

  get name() {
    return this.root.data.name || this.root.data.id;
  }
}

const defaultCollectionLoader: CollectionLoader = async (collection) => getCollection(collection as any) as any;
const catalogDirectory = process.env.PROJECT_DIR || process.cwd();
const getCatalogGraph = utils(catalogDirectory).getGraph;
const defaultGraphLoader: GraphLoader = (root, options) => getCatalogGraph(root, options);

const scopeNotFound = (ref: McpScopeRef) =>
  new McpScopeNotFoundError(
    `${ref.kind === 'domain' ? 'Domain' : 'System'} not found: ${ref.id}${ref.version ? ` (${ref.version})` : ''}`
  );

export async function resolveMcpScope(
  ref: McpScopeRef,
  loadCollection: CollectionLoader = defaultCollectionLoader,
  loadGraph: GraphLoader = defaultGraphLoader
) {
  const graph = await loadGraph({ type: ref.kind, id: ref.id, version: ref.version }, { flat: true });
  if (!graph) throw scopeNotFound(ref);

  const graphCollections = new Set(graph.resources.map((resource) => graphTypeToCollection[resource.type]));

  const loadedCollections = await Promise.all(
    Array.from(graphCollections).map(async (collection) => [collection, await loadCollection(collection)] as const)
  );
  const collections = new Map(
    loadedCollections.map(([collection, entries]) => [
      collection,
      new Map(entries.map((entry) => [entryKey(entry.data.id, entry.data.version), entry])),
    ])
  );

  const resolve = (collection: McpScopeCollection, id: string, version: string) =>
    collections.get(collection)?.get(entryKey(id, version));

  const rootCollection = graphTypeToCollection[graph.root.type];
  const root = resolve(rootCollection, graph.root.id, graph.root.version);
  if (!root || root.data.hidden === true) throw scopeNotFound(ref);

  const scope = new McpScope(ref, root);
  for (const resource of graph.resources) {
    const collection = graphTypeToCollection[resource.type];
    scope.add(resolve(collection, resource.id, resource.version));
  }

  return scope;
}
