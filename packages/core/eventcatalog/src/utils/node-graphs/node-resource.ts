/**
 * The catalog resource a diagram node shows, for the node types the node graphs build. Has no imports so it can
 * be shared by the server and the browser (the visualiser's "Open in Studio", the MCP App views).
 */

// The collection each node type shows a resource of
const NODE_COLLECTIONS: Record<string, string> = {
  service: 'services',
  services: 'services',
  agent: 'agents',
  agents: 'agents',
  event: 'events',
  events: 'events',
  command: 'commands',
  commands: 'commands',
  query: 'queries',
  queries: 'queries',
  channel: 'channels',
  channels: 'channels',
  flow: 'flows',
  flows: 'flows',
  data: 'containers',
  containers: 'containers',
  'data-products': 'data-products',
  domain: 'domains',
  domains: 'domains',
  'context-domain': 'domains',
  'domain-group': 'domains',
  system: 'systems',
  systems: 'systems',
  'system-group': 'systems',
};

// Where each node type keeps the resource it shows
const RESOURCE_DATA_KEYS = [
  'service',
  'agent',
  'message',
  'channel',
  'data',
  'dataProduct',
  'flow',
  'entity',
  'domain',
  'system',
  'custom',
];

type DiagramNode = { type?: string; data?: Record<string, unknown> };
type ResourceDetails = { id?: unknown; version?: unknown; [key: string]: unknown };

/** The resource a node shows, as in its data: the fields shown, or the catalog entry's data (if it holds the entry) */
export const getNodeResourceDetails = (node: DiagramNode): ResourceDetails | undefined => {
  const data = node.data ?? {};
  const resource = RESOURCE_DATA_KEYS.map((key) => data[key]).find(Boolean) as
    | (ResourceDetails & { data?: ResourceDetails })
    | undefined;
  return resource?.data ?? resource;
};

/** The catalog resource a node shows (its collection, id and version), if it shows one */
export const getNodeCatalogResource = (node: DiagramNode): { collection: string; id: string; version?: string } | undefined => {
  const collection = NODE_COLLECTIONS[node.type ?? ''];
  const details = getNodeResourceDetails(node);
  if (!collection || typeof details?.id !== 'string') return undefined;
  return { collection, id: details.id, ...(typeof details.version === 'string' && { version: details.version }) };
};
