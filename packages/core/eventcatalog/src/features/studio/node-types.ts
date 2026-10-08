/**
 * The kinds of node people (and agents) can put on a canvas, and what's in their data. Shared by the browser and
 * the server, so it has no UI in it: the icons for each type are in components/icons.ts.
 */

export type NodeCategory = 'boundaries' | 'messages' | 'architecture' | 'other';

export const NODE_CATEGORIES: { id: NodeCategory; label: string }[] = [
  { id: 'boundaries', label: 'Boundaries' },
  { id: 'messages', label: 'Messages' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'other', label: 'Other' },
];

/** Domains and systems as containers: boxes other nodes sit in */
export const GROUP_TYPES = { domain: 'domain-group', system: 'system-group' } as const;
export const isGroupType = (type?: string) => type === GROUP_TYPES.domain || type === GROUP_TYPES.system;

export type NodeDefinition = {
  /** React Flow node type, matches the visualiser node component keys */
  type: string;
  label: string;
  category: NodeCategory;
  /** Not in the components list (still drawn, for canvases that have them) */
  unlisted?: boolean;
  /** Where the resource lives inside node.data (e.g. `service` for data.service). Undefined = data root */
  resourceKey?: string;
  /** Nodes that are sized on the canvas (containers, notes, text) start at this size */
  defaultSize?: { width: number; height: number };
  /** Only its width is set: its height follows what's in it (text) */
  autoHeight?: boolean;
  createData: () => Record<string, unknown>;
};

const resource = (name: string, summary: string) => ({ name, version: '0.0.1', summary, owners: [] });

export const nodeDefinitions: NodeDefinition[] = [
  {
    type: GROUP_TYPES.domain,
    label: 'Domain',
    category: 'boundaries',
    resourceKey: 'domain',
    defaultSize: { width: 720, height: 460 },
    createData: () => ({ domain: { name: 'New Domain', version: '0.0.1' } }),
  },
  {
    type: GROUP_TYPES.system,
    label: 'System',
    category: 'boundaries',
    resourceKey: 'system',
    defaultSize: { width: 560, height: 360 },
    createData: () => ({ system: { name: 'New System', version: '0.0.1' } }),
  },
  {
    type: 'service',
    category: 'architecture',
    label: 'Service',
    resourceKey: 'service',
    createData: () => ({
      mode: 'full',
      service: { ...resource('New Service', 'Describe what this service does.'), sends: [], receives: [] },
    }),
  },
  {
    type: 'event',
    category: 'messages',
    label: 'Event',
    resourceKey: 'message',
    createData: () => ({ mode: 'full', message: resource('NewEvent', 'Something happened.') }),
  },
  {
    type: 'command',
    category: 'messages',
    label: 'Command',
    resourceKey: 'message',
    createData: () => ({ mode: 'full', message: resource('NewCommand', 'Asks a service to do something.') }),
  },
  {
    type: 'query',
    category: 'messages',
    label: 'Query',
    resourceKey: 'message',
    createData: () => ({ mode: 'full', message: resource('NewQuery', 'Asks for some information.') }),
  },
  {
    type: 'channel',
    category: 'architecture',
    label: 'Channel',
    resourceKey: 'channel',
    createData: () => ({ mode: 'full', channel: { ...resource('new.channel', 'Where messages are routed.'), protocols: [] } }),
  },
  {
    type: 'data',
    category: 'architecture',
    label: 'Data Store',
    resourceKey: 'data',
    createData: () => ({ mode: 'full', data: { ...resource('New Database', 'Stores data.'), container_type: 'database' } }),
  },
  {
    type: 'view',
    category: 'architecture',
    label: 'View',
    resourceKey: 'view',
    createData: () => ({ mode: 'full', view: resource('New View', 'What the user sees.') }),
  },
  {
    type: 'externalSystem',
    category: 'architecture',
    unlisted: true,
    label: 'External System',
    resourceKey: 'externalSystem',
    createData: () => ({ mode: 'full', externalSystem: resource('External System', 'A third party system.') }),
  },
  {
    type: 'agent',
    category: 'architecture',
    label: 'Agent',
    resourceKey: 'agent',
    createData: () => ({ mode: 'full', agent: { ...resource('New Agent', 'What this agent does.'), sends: [], receives: [] } }),
  },
  {
    type: 'actor',
    category: 'other',
    label: 'Actor',
    createData: () => ({ mode: 'full', name: 'Customer', summary: 'A person using the system.' }),
  },
  {
    type: 'text',
    category: 'other',
    label: 'Text',
    defaultSize: { width: 240, height: 40 },
    autoHeight: true,
    createData: () => ({ text: 'Add some text' }),
  },
  {
    type: 'note',
    category: 'other',
    label: 'Sticky Note',
    // About square, like a post-it (taller if more is written on it)
    defaultSize: { width: 200, height: 176 },
    autoHeight: true,
    createData: () => ({ text: '', color: 'yellow' }),
  },
];

/** The types people and agents can add (not the unlisted ones) */
export const COMPONENT_TYPES = nodeDefinitions
  .filter((definition) => !definition.unlisted)
  .map((definition) => definition.type) as [string, ...string[]];

const definitionsByType = new Map(nodeDefinitions.map((definition) => [definition.type, definition]));

// Node types that only come from the catalog (not in the components list)
const catalogNodeTypes: Record<string, { label: string; resourceKey: string }> = {
  system: { label: 'System', resourceKey: 'system' },
  'context-domain': { label: 'Domain', resourceKey: 'domain' },
};

export const getNodeDefinition = (type?: string) => (type ? definitionsByType.get(type) : undefined);

export const getNodeLabel = (type?: string) => getNodeDefinition(type)?.label ?? catalogNodeTypes[type ?? '']?.label ?? 'Node';

// About the size the visualiser's resource cards render at
export const DEFAULT_NODE_SIZE = { width: 240, height: 112 };

/** The size a new node of a type starts at (or, for cards, about the size it renders at) */
export const getNodeSize = (type?: string) => getNodeDefinition(type)?.defaultSize ?? DEFAULT_NODE_SIZE;

const getResourceKey = (type?: string) => getNodeDefinition(type)?.resourceKey ?? catalogNodeTypes[type ?? '']?.resourceKey;

/** The resource object for a node (e.g. data.service), or the data itself for flat nodes */
export const getResource = (type: string | undefined, data: Record<string, unknown>): Record<string, unknown> => {
  const key = getResourceKey(type);
  return key ? ((data[key] as Record<string, unknown>) ?? {}) : data;
};

/** Sticky notes sit on the canvas wherever they're put, never inside a container */
export const canGoInContainer = (type?: string) => type !== 'note';

/**
 * The level (L1, L2 or L3) a sticky note was added on: it's only shown there. Notes from before levels had notes
 * are on L3, the canvas people edit. Other nodes are on every level they fit in, so they have none.
 */
export const getNoteLevel = (node: { type?: string; data: Record<string, unknown> }): 1 | 2 | 3 | undefined =>
  node.type === 'note' ? ((node.data.level as 1 | 2 | undefined) ?? 3) : undefined;

/** Whether a node is on a level's canvas as itself: everything on L3, but notes only on the level they were added on */
export const isOnLevel = (node: { type?: string; data: Record<string, unknown> }, level: 1 | 2 | 3) =>
  node.type !== 'note' || getNoteLevel(node) === level;

/** Notes and text: written on the canvas itself (their text is their data, not a resource with a name) */
export const isWrittenOnCanvas = (type?: string) => type === 'note' || type === 'text';

/** Whether a node's resource has a version (actors and notes don't) */
export const isVersioned = (type?: string) => !!getResourceKey(type);

/** Returns new node data with fields of the resource changed */
export const updateResource = (type: string | undefined, data: Record<string, unknown>, fields: Record<string, unknown>) => {
  const key = getResourceKey(type);
  return key ? { ...data, [key]: { ...getResource(type, data), ...fields } } : { ...data, ...fields };
};

/** A node's name, as people and agents see it */
export const getNodeName = (type: string | undefined, data: Record<string, unknown>, fallback = 'node') =>
  String(getResource(type, data).name ?? data.text ?? fallback);
