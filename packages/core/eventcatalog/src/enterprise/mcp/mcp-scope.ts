/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/eventcatalog/src/enterprise/LICENSE
 */

import { getCollection } from 'astro:content';
import { getItemsFromCollectionByIdAndSemverOrLatest, resourceToCollectionMap } from '@utils/collections/util';

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

export async function resolveMcpScope(ref: McpScopeRef, loadCollection: CollectionLoader = defaultCollectionLoader) {
  const loadedCollections = await Promise.all(
    MCP_SCOPE_COLLECTIONS.map(async (collection) => [collection, await loadCollection(collection)] as const)
  );
  const collections = new Map<string, CatalogEntry[]>(loadedCollections);

  const resolve = (collection: string, pointer: { id: string; version?: string }) => {
    const entries = collections.get(collection) ?? [];
    return getItemsFromCollectionByIdAndSemverOrLatest(entries, pointer.id, pointer.version)[0];
  };

  const rootCollection = ref.kind === 'domain' ? 'domains' : 'systems';
  const root = resolve(rootCollection, ref);

  if (!root || root.data.hidden === true) {
    throw new McpScopeNotFoundError(
      `${ref.kind === 'domain' ? 'Domain' : 'System'} not found: ${ref.id}${ref.version ? ` (${ref.version})` : ''}`
    );
  }

  const scope = new McpScope(ref, root);

  const visitPointer = (collection: string, pointer: { id: string; version?: string }, visit?: (entry: CatalogEntry) => void) => {
    const entry = resolve(collection, pointer);
    if (!entry) return;
    if (visit) visit(entry);
    else scope.add(entry);
  };

  const visitMessagePointer = (pointer: { id: string; version?: string }) => {
    for (const collection of ['events', 'commands', 'queries']) {
      const message = resolve(collection, pointer);
      if (!message || !scope.add(message)) continue;

      for (const channel of [...(message.data.channels || []), ...(message.data.messageChannels || [])]) {
        visitPointer('channels', channel);
      }
    }
  };

  const visitFlow = (flow: CatalogEntry) => {
    scope.add(flow);
  };

  const visitDataProduct = (dataProduct: CatalogEntry) => {
    if (!scope.add(dataProduct)) return;

    for (const pointer of [...(dataProduct.data.inputs || []), ...(dataProduct.data.outputs || [])]) {
      for (const collection of ['events', 'commands', 'queries', 'channels', 'containers', 'services']) {
        const entry = resolve(collection, pointer);
        if (!entry) continue;
        if (collection === 'services') visitRoutableResource(entry);
        else if (['events', 'commands', 'queries'].includes(collection)) visitMessagePointer(pointer);
        else scope.add(entry);
      }
    }
  };

  const visitRoutableResource = (resource: CatalogEntry) => {
    if (!scope.add(resource)) return;

    for (const pointer of [...(resource.data.sends || []), ...(resource.data.receives || [])]) {
      visitMessagePointer(pointer);
    }
    for (const pointer of resource.data.entities || []) visitPointer('entities', pointer);
    for (const pointer of resource.data.flows || []) visitPointer('flows', pointer, visitFlow);
    for (const pointer of [...(resource.data.writesTo || []), ...(resource.data.readsFrom || [])]) {
      visitPointer('containers', pointer);
    }
  };

  const visitSystem = (system: CatalogEntry) => {
    if (!scope.add(system)) return;

    for (const pointer of system.data.services || []) visitPointer('services', pointer, visitRoutableResource);
    for (const pointer of system.data.flows || []) visitPointer('flows', pointer, visitFlow);
    for (const pointer of system.data.entities || []) visitPointer('entities', pointer);
    for (const pointer of system.data.containers || []) visitPointer('containers', pointer);
  };

  const visitDomain = (domain: CatalogEntry) => {
    if (!scope.add(domain)) return;

    for (const pointer of domain.data.domains || []) visitPointer('domains', pointer, visitDomain);
    for (const pointer of domain.data.systems || []) visitPointer('systems', pointer, visitSystem);
    for (const pointer of domain.data.services || []) visitPointer('services', pointer, visitRoutableResource);
    for (const pointer of domain.data.agents || []) visitPointer('agents', pointer, visitRoutableResource);
    for (const pointer of domain.data.entities || []) visitPointer('entities', pointer);
    for (const pointer of domain.data.flows || []) visitPointer('flows', pointer, visitFlow);
    for (const pointer of domain.data['data-products'] || []) visitPointer('data-products', pointer, visitDataProduct);
    for (const pointer of [...(domain.data.sends || []), ...(domain.data.receives || [])]) visitMessagePointer(pointer);
  };

  if (ref.kind === 'domain') visitDomain(root);
  else visitSystem(root);

  // ADRs are included when they explicitly apply to any resource already in the scope.
  for (const adr of collections.get('adrs') ?? []) {
    const appliesTo = adr.data.appliesTo || [];
    const appliesToScopedResource = appliesTo.some(
      (pointer: { type: keyof typeof resourceToCollectionMap; id: string; version?: string }) => {
        const collection = resourceToCollectionMap[pointer.type];
        return collection ? scope.has(collection, pointer.id, pointer.version) : false;
      }
    );
    if (appliesToScopedResource) scope.add(adr);
  }

  return scope;
}
