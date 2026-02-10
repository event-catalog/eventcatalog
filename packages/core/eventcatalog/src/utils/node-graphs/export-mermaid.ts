import type { Node, Edge } from '@xyflow/react';

/**
 * Mermaid Export Utility
 * Converts React Flow nodes and edges to Mermaid flowchart syntax
 */

export interface MermaidExportOptions {
  /** Include class definitions for styling */
  includeStyles?: boolean;
  /** Direction of the flowchart: LR (left-right), TB (top-bottom), etc. */
  direction?: 'LR' | 'TB' | 'RL' | 'BT';
}

/**
 * Mapping of node types to their Mermaid shape syntax
 * Format: [prefix, suffix]
 */
const NODE_SHAPE_MAP: Record<string, [string, string]> = {
  services: ['[[', ']]'], // stadium shape
  service: ['[[', ']]'],
  events: ['>', ']'], // flag/asymmetric shape (message-like)
  event: ['>', ']'],
  commands: ['>', ']'], // flag/asymmetric shape (message-like)
  command: ['>', ']'],
  queries: ['{{', '}}'], // hexagon
  query: ['{{', '}}'],
  channels: ['[(', ')]'], // cylinder
  channel: ['[(', ')]'],
  domains: ['[', ']'], // rectangle
  domain: ['[', ']'],
  flows: ['([', '])'], // stadium (rounded)
  flow: ['([', '])'],
  step: ['[', ']'], // rectangle
  user: ['((', '))'], // circle
  actor: ['((', '))'], // circle
  externalSystem: ['[[', ']]'], // stadium
  'external-system': ['[[', ']]'],
  data: ['[(', ')]'], // cylinder (database)
  'data-product': ['[[', ']]'], // stadium
  'data-products': ['[[', ']]'],
  entities: ['[', ']'], // rectangle
  entity: ['[', ']'],
  custom: ['[', ']'], // rectangle
  view: ['[', ']'], // rectangle
  note: ['[', ']'], // rectangle
};

/**
 * Mermaid class definitions for styling different node types
 */
const NODE_STYLE_CLASSES: Record<string, string> = {
  services: 'fill:#ec4899,stroke:#be185d,color:#fff',
  service: 'fill:#ec4899,stroke:#be185d,color:#fff',
  events: 'fill:#f97316,stroke:#c2410c,color:#fff',
  event: 'fill:#f97316,stroke:#c2410c,color:#fff',
  commands: 'fill:#3b82f6,stroke:#1d4ed8,color:#fff',
  command: 'fill:#3b82f6,stroke:#1d4ed8,color:#fff',
  queries: 'fill:#22c55e,stroke:#15803d,color:#fff',
  query: 'fill:#22c55e,stroke:#15803d,color:#fff',
  channels: 'fill:#6b7280,stroke:#374151,color:#fff',
  channel: 'fill:#6b7280,stroke:#374151,color:#fff',
  domains: 'fill:#eab308,stroke:#a16207,color:#000',
  domain: 'fill:#eab308,stroke:#a16207,color:#000',
  flows: 'fill:#14b8a6,stroke:#0f766e,color:#fff',
  flow: 'fill:#14b8a6,stroke:#0f766e,color:#fff',
  step: 'fill:#374151,stroke:#1f2937,color:#fff',
  user: 'fill:#8b5cf6,stroke:#6d28d9,color:#fff',
  actor: 'fill:#eab308,stroke:#a16207,color:#000',
  externalSystem: 'fill:#ec4899,stroke:#be185d,color:#fff',
  'external-system': 'fill:#ec4899,stroke:#be185d,color:#fff',
  data: 'fill:#3b82f6,stroke:#1d4ed8,color:#fff',
  'data-product': 'fill:#6366f1,stroke:#4338ca,color:#fff',
  'data-products': 'fill:#6366f1,stroke:#4338ca,color:#fff',
  entities: 'fill:#6b7280,stroke:#374151,color:#fff',
  entity: 'fill:#6b7280,stroke:#374151,color:#fff',
  custom: 'fill:#9ca3af,stroke:#6b7280,color:#000',
  view: 'fill:#9ca3af,stroke:#6b7280,color:#000',
  note: 'fill:#fef3c7,stroke:#d97706,color:#000',
};

/**
 * Sanitize a string to be a valid Mermaid node ID
 * Mermaid IDs should be alphanumeric with underscores
 */
export function sanitizeMermaidId(id: string): string {
  // Replace any non-alphanumeric characters (except underscores) with underscores
  // Also handle dots and hyphens which are common in version strings
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * Escape special characters in Mermaid labels
 */
function escapeMermaidLabel(label: string): string {
  // Escape quotes and other special characters
  return label.replace(/"/g, '#quot;').replace(/\n/g, '<br/>');
}

/**
 * Get the Mermaid shape syntax for a node type
 */
export function getMermaidNodeShape(type: string): [string, string] {
  return NODE_SHAPE_MAP[type] || ['[', ']'];
}

/**
 * Helper to format label with version
 */
function formatLabelWithVersion(name: string, version?: string): string {
  if (version) {
    return `${name} (${version})`;
  }
  return name;
}

/**
 * Extract the display label from a node based on its type and data
 * Includes version information when available
 */
export function getNodeLabel(node: Node): string {
  const { type, data } = node;

  if (!data) return node.id;

  // Handle different node types and their data structures
  if (type === 'services' || type === 'service') {
    const service = (data as any).service;
    const name = service?.name || service?.id || node.id;
    const version = service?.data?.version || service?.version;
    return formatLabelWithVersion(name, version);
  }

  if (
    type === 'events' ||
    type === 'event' ||
    type === 'commands' ||
    type === 'command' ||
    type === 'queries' ||
    type === 'query'
  ) {
    const message = (data as any).message;
    const name = message?.name || message?.id || node.id;
    const version = message?.data?.version || message?.version;
    return formatLabelWithVersion(name, version);
  }

  if (type === 'channels' || type === 'channel') {
    const channel = (data as any).channel;
    const name = channel?.name || channel?.id || node.id;
    const version = channel?.data?.version || channel?.version;
    return formatLabelWithVersion(name, version);
  }

  if (type === 'domains' || type === 'domain') {
    const domain = (data as any).domain;
    // Domain data can be nested in .data
    const domainData = domain?.data || domain;
    const name = domainData?.name || domainData?.id || node.id;
    const version = domainData?.version || domain?.version;
    return formatLabelWithVersion(name, version);
  }

  if (type === 'flows' || type === 'flow') {
    const flow = (data as any).flow;
    const name = flow?.name || flow?.id || node.id;
    const version = flow?.data?.version || flow?.version;
    return formatLabelWithVersion(name, version);
  }

  if (type === 'step') {
    const step = (data as any).step;
    return step?.title || step?.name || step?.id || node.id;
  }

  if (type === 'user' || type === 'actor') {
    return (data as any).name || (data as any).label || (data as any).id || node.id;
  }

  if (type === 'externalSystem' || type === 'external-system') {
    const system = (data as any).externalSystem || data;
    return system?.name || system?.id || node.id;
  }

  if (type === 'data') {
    const dataNode = (data as any).data;
    return dataNode?.name || dataNode?.id || node.id;
  }

  if (type === 'data-product' || type === 'data-products') {
    const dataProduct = (data as any).dataProduct;
    const name = dataProduct?.name || dataProduct?.id || node.id;
    const version = dataProduct?.data?.version || dataProduct?.version;
    return formatLabelWithVersion(name, version);
  }

  if (type === 'entities' || type === 'entity') {
    const entity = (data as any).entity;
    return entity?.name || entity?.id || node.id;
  }

  if (type === 'note') {
    return (data as any).text || (data as any).label || 'Note';
  }

  // Fallback: try common data patterns
  return (data as any).name || (data as any).label || (data as any).title || (data as any).id || node.id;
}

/**
 * Extract label from an edge
 */
function getEdgeLabel(edge: Edge): string | undefined {
  if (edge.label && typeof edge.label === 'string') {
    return edge.label;
  }
  if (edge.data?.label && typeof edge.data.label === 'string') {
    return edge.data.label;
  }
  return undefined;
}

/**
 * Convert React Flow nodes and edges to Mermaid flowchart syntax
 */
export function convertToMermaid(nodes: Node[], edges: Edge[], options: MermaidExportOptions = {}): string {
  const { includeStyles = true, direction = 'LR' } = options;

  const lines: string[] = [];

  // Add flowchart header
  lines.push(`flowchart ${direction}`);

  // Collect used node types for class definitions
  const usedTypes = new Set<string>();

  // Add class definitions if styles are enabled
  if (includeStyles) {
    lines.push('');
    lines.push('    %% Style definitions');

    // First pass: collect all used node types
    nodes.forEach((node) => {
      if (node.type && NODE_STYLE_CLASSES[node.type]) {
        usedTypes.add(node.type);
      }
    });

    // Add class definitions for used types
    usedTypes.forEach((type) => {
      const style = NODE_STYLE_CLASSES[type];
      if (style) {
        lines.push(`    classDef ${sanitizeMermaidId(type)} ${style}`);
      }
    });
  }

  // Add node definitions
  lines.push('');
  lines.push('    %% Nodes');

  nodes.forEach((node) => {
    const sanitizedId = sanitizeMermaidId(node.id);
    const label = escapeMermaidLabel(getNodeLabel(node));
    const [prefix, suffix] = getMermaidNodeShape(node.type || 'custom');

    let nodeLine = `    ${sanitizedId}${prefix}"${label}"${suffix}`;

    // Add class reference if styles are enabled
    if (includeStyles && node.type && usedTypes.has(node.type)) {
      nodeLine += `:::${sanitizeMermaidId(node.type)}`;
    }

    lines.push(nodeLine);
  });

  // Add edge definitions
  lines.push('');
  lines.push('    %% Edges');

  edges.forEach((edge) => {
    const sourceId = sanitizeMermaidId(edge.source);
    const targetId = sanitizeMermaidId(edge.target);
    const label = getEdgeLabel(edge);

    let edgeLine: string;
    if (label) {
      // Clean up multi-line labels
      const cleanLabel = label.replace(/\n/g, ' ').trim();
      edgeLine = `    ${sourceId} -->|"${escapeMermaidLabel(cleanLabel)}"| ${targetId}`;
    } else {
      edgeLine = `    ${sourceId} --> ${targetId}`;
    }

    lines.push(edgeLine);
  });

  return lines.join('\n');
}
