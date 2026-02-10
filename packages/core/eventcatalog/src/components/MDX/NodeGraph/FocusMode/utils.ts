import type { Node, Edge } from '@xyflow/react';

export interface NodeDisplayInfo {
  id: string;
  name: string;
  type: string;
  version?: string;
  description?: string;
}

export interface ConnectedNodes {
  leftNodes: Node[];
  rightNodes: Node[];
}

export const NODE_COLOR_CLASSES: Record<string, string> = {
  events: 'bg-orange-600',
  services: 'bg-pink-600',
  flows: 'bg-teal-600',
  commands: 'bg-blue-600',
  queries: 'bg-green-600',
  channels: 'bg-gray-600',
  externalSystem: 'bg-pink-600',
  actor: 'bg-yellow-500',
  step: 'bg-gray-700',
  data: 'bg-blue-600',
  'data-products': 'bg-indigo-600',
  domains: 'bg-yellow-600',
  entities: 'bg-purple-600',
};

export const NODE_TYPE_LABELS: Record<string, string> = {
  events: 'Event',
  services: 'Service',
  flows: 'Flow',
  commands: 'Command',
  queries: 'Query',
  channels: 'Channel',
  externalSystem: 'External System',
  actor: 'Actor',
  step: 'Step',
  data: 'Data',
  'data-products': 'Data Product',
  domains: 'Domain',
  entities: 'Entity',
};

/**
 * Get connected nodes for a given center node
 * Left nodes: incoming edges (they send TO this node)
 * Right nodes: outgoing edges (this node sends TO them)
 */
export function getConnectedNodes(centerNodeId: string, nodes: Node[], edges: Edge[]): ConnectedNodes {
  const leftIds = new Set<string>();
  const rightIds = new Set<string>();

  edges.forEach((edge) => {
    if (edge.target === centerNodeId) {
      leftIds.add(edge.source);
    }
    if (edge.source === centerNodeId) {
      rightIds.add(edge.target);
    }
  });

  return {
    leftNodes: nodes.filter((n) => leftIds.has(n.id)),
    rightNodes: nodes.filter((n) => rightIds.has(n.id)),
  };
}

// Entity keys that follow the standard data structure pattern
const ENTITY_KEYS = ['service', 'message', 'flow', 'channel', 'domain', 'entity', 'dataProduct'] as const;

/**
 * Extract display information from a ReactFlow node
 */
export function getNodeDisplayInfo(node: Node): NodeDisplayInfo {
  const nodeType = node.type || 'unknown';
  const data = node.data as any;

  // Find the entity in data using standard keys
  const entityKey = ENTITY_KEYS.find((key) => data[key]);
  const entity = entityKey ? data[entityKey] : null;

  const name = entity?.data?.name || entity?.id || data.label || data.name || node.id;
  const version = entity?.data?.version || entity?.version || data.version || '';
  const description = entity?.data?.summary || entity?.data?.description || data.summary || data.description || '';

  return {
    id: node.id,
    name,
    type: nodeType,
    version,
    description: description ? truncateDescription(description, 100) : undefined,
  };
}

/**
 * Truncate description to a max length
 */
function truncateDescription(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Get the color class for a node type
 */
export function getNodeColorClass(nodeType: string): string {
  return NODE_COLOR_CLASSES[nodeType] || 'bg-gray-500';
}

/**
 * Get the display label for a node type
 */
export function getNodeTypeLabel(nodeType: string): string {
  return NODE_TYPE_LABELS[nodeType] || nodeType;
}

// Mapping from entity key to doc path
const DOC_PATH_MAP: Record<string, string> = {
  service: 'services',
  flow: 'flows',
  channel: 'channels',
  domain: 'domains',
  entity: 'entities',
  dataProduct: 'data-products',
};

/**
 * Get the documentation URL for a node
 */
export function getNodeDocUrl(node: Node): string | null {
  const nodeType = node.type || 'unknown';
  const data = node.data as any;

  // Handle message type separately due to type mapping
  if (data.message) {
    const id = data.message.data?.id || data.message.id || '';
    const version = data.message.data?.version || data.message.version || '';
    const collectionType = nodeType === 'events' ? 'events' : nodeType === 'commands' ? 'commands' : 'queries';
    return id && version ? `/docs/${collectionType}/${id}/${version}` : null;
  }

  // Handle data/container nodes with nested data.data structure
  if (data.data && nodeType === 'data') {
    const id = data.data.id || '';
    const version = data.data.version || '';
    return id && version ? `/docs/containers/${id}/${version}` : null;
  }

  // Handle standard entity types
  for (const [key, path] of Object.entries(DOC_PATH_MAP)) {
    if (data[key]) {
      const id = data[key].data?.id || data[key].id || '';
      const version = data[key].data?.version || data[key].version || '';
      return id && version ? `/docs/${path}/${id}/${version}` : null;
    }
  }

  return null;
}
