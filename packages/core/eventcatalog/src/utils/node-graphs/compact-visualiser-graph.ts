import type { Edge, Node } from '@xyflow/react';

/**
 * Fields the visualiser nodes actually read from a resource. Everything else
 * (markdown bodies, file paths, hydrated producers/consumers, full send/receive
 * collections) is dropped before Astro serialises the graph into the page.
 */
const RESOURCE_DATA_KEYS = [
  'id',
  'name',
  'version',
  'summary',
  'owners',
  'deprecated',
  'draft',
  'notes',
  'styles',
  'badges',
  'latestVersion',
  'method',
  'path',
  'statusCodes',
  'specifications',
  'externalSystem',
  'repository',
  'model',
  'tools',
  'parameters',
  'protocols',
  'address',
  'deliveryGuarantee',
  'type',
  'container_type',
  'schemas',
] as const;

const RESOURCE_OBJECT_KEYS = new Set([
  'message',
  'service',
  'agent',
  'domain',
  'channel',
  'dataProduct',
  'container',
  'entity',
  'flow',
  'data',
]);

const DROP_EDGE_RESOURCE_KEYS = new Set(['publisherService', 'consumerService']);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isCollectionEntry = (value: Record<string, unknown>): boolean =>
  isPlainObject(value.data) &&
  ('collection' in value || 'filePath' in value || 'digest' in value || 'body' in value || 'rendered' in value);

const compactDomainService = (service: unknown) => {
  if (!isPlainObject(service)) return service;

  const data = isPlainObject(service.data) ? service.data : service;
  const id = data.id ?? service.id;
  const name = data.name ?? service.name;
  const version = data.version ?? service.version;

  return {
    data: {
      ...(id !== undefined ? { id } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(version !== undefined ? { version } : {}),
    },
  };
};

const compactOwners = (owners: unknown): unknown => {
  if (!Array.isArray(owners)) return owners;
  return owners.map((owner) => {
    if (typeof owner === 'string') return owner;
    if (!isPlainObject(owner)) return owner;
    const data = isPlainObject(owner.data) ? owner.data : owner;
    const id = data.id ?? owner.id;
    const name = data.name ?? owner.name;
    if (id === undefined && name === undefined) return owner;
    return {
      ...(id !== undefined ? { id } : {}),
      ...(name !== undefined ? { name } : {}),
    };
  });
};

export const compactVisualiserResource = (value: unknown): unknown => {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(compactVisualiserResource);

  const obj = value as Record<string, unknown>;

  if (isCollectionEntry(obj)) {
    const data = compactVisualiserResourceData(obj.data);
    const resourceId = isPlainObject(data) && data.id !== undefined ? data.id : obj.id;
    return {
      ...(resourceId !== undefined ? { id: resourceId } : {}),
      ...(obj.collection !== undefined ? { collection: obj.collection } : {}),
      data,
      // EventNode / ServiceNode / ChannelNode read name/version/summary from the
      // top level. Collection-entry shaped payloads only have those on `.data`.
      ...(isPlainObject(data) ? data : {}),
    };
  }

  return compactVisualiserResourceData(obj);
};

const compactVisualiserResourceData = (value: unknown): unknown => {
  if (!isPlainObject(value)) return value;

  const out: Record<string, unknown> = {};
  for (const key of RESOURCE_DATA_KEYS) {
    if (value[key] === undefined) continue;
    if (key === 'owners') {
      out[key] = compactOwners(value[key]);
      continue;
    }
    if (key === 'tools' && Array.isArray(value[key])) {
      out[key] = value[key];
      continue;
    }
    out[key] = value[key];
  }

  // Domain nodes render `domain.data.services[].data.{id,name,version}`.
  if (Array.isArray(value.services)) {
    out.services = value.services.map(compactDomainService);
  }

  return out;
};

const compactEndpoint = (endpoint: unknown): unknown => {
  if (!isPlainObject(endpoint)) return endpoint;

  const data = isPlainObject(endpoint.data) ? endpoint.data : undefined;
  const collection = endpoint.collection ?? data?.collection;
  const id = endpoint.id ?? (data?.id !== undefined && data?.version !== undefined ? `${data.id}-${data.version}` : data?.id);

  return {
    ...(id !== undefined ? { id } : {}),
    ...(collection !== undefined ? { collection } : {}),
    ...(data
      ? {
          data: {
            ...(data.id !== undefined ? { id: data.id } : {}),
            ...(data.version !== undefined ? { version: data.version } : {}),
            ...(collection !== undefined ? { collection } : {}),
          },
        }
      : {}),
  };
};

const compactNodeData = (data: unknown): unknown => {
  if (!isPlainObject(data)) return data;

  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;

    if (RESOURCE_OBJECT_KEYS.has(key)) {
      out[key] = compactVisualiserResource(value);
      continue;
    }

    if (key === 'messages' && Array.isArray(value)) {
      out[key] = value.map((entry) => {
        if (!isPlainObject(entry)) return entry;
        return {
          ...entry,
          ...(entry.message !== undefined ? { message: compactVisualiserResource(entry.message) } : {}),
          ...(Array.isArray(entry.channels) ? { channels: entry.channels.map(compactVisualiserResource) } : {}),
        };
      });
      continue;
    }

    out[key] = value;
  }

  return out;
};

const compactEdgeData = (data: unknown): unknown => {
  if (!isPlainObject(data)) return data;

  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || DROP_EDGE_RESOURCE_KEYS.has(key)) continue;

    if (key === 'rootSourceAndTarget' && isPlainObject(value)) {
      out[key] = {
        source: compactEndpoint(value.source),
        target: compactEndpoint(value.target),
      };
      continue;
    }

    if (RESOURCE_OBJECT_KEYS.has(key) || key === 'message') {
      out[key] = compactVisualiserResource(value);
      continue;
    }

    out[key] = value;
  }

  return out;
};

const compactNode = <T extends Node>(node: T): T => {
  const { data, ...rest } = node;
  return {
    ...rest,
    ...(data !== undefined ? { data: compactNodeData(data) } : {}),
  } as T;
};

const compactEdge = <T extends Edge>(edge: T): T => {
  const { data, ...rest } = edge;
  return {
    ...rest,
    ...(data !== undefined ? { data: compactEdgeData(data) } : {}),
  } as T;
};

/**
 * Strip collection-entry weight from a React Flow graph before it is serialised
 * into an Astro island. Node/edge structure and the fields visualiser components
 * read are preserved.
 */
export const compactVisualiserGraph = <N extends Node, E extends Edge>(nodes: N[], edges: E[]): { nodes: N[]; edges: E[] } => ({
  nodes: nodes.map(compactNode),
  edges: edges.map(compactEdge),
});
