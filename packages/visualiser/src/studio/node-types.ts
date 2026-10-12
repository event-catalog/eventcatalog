/**
 * The kinds of node people (and agents) can put on a canvas, and what's in their data. Shared by the browser and
 * the server, so it has no UI in it: the icons for each type are in components/icons.ts.
 */

export type NodeCategory =
  | "boundaries"
  | "people"
  | "messages"
  | "architecture"
  | "data"
  | "other";

export const NODE_CATEGORIES: { id: NodeCategory; label: string }[] = [
  { id: "boundaries", label: "Boundaries" },
  // What's deployed (services, UIs, agents) and what's outside it: drawn first, then what flows between them
  { id: "architecture", label: "Services" },
  { id: "messages", label: "Messages" },
  // Where data lives: all data nodes, of EventCatalog's kinds (container_type)
  { id: "data", label: "Data" },
  // Who's involved: who uses the architecture (actors) and who owns it (teams)
  { id: "people", label: "People" },
  { id: "other", label: "Other" },
];

/** The catalog collections whose resources can go on a canvas */
export const CATALOG_COLLECTIONS = [
  "domains",
  "systems",
  "services",
  "events",
  "commands",
  "queries",
  "channels",
  "containers",
] as const;

export type CatalogCollection = (typeof CATALOG_COLLECTIONS)[number];
export const isCatalogCollection = (
  collection: string,
): collection is CatalogCollection =>
  (CATALOG_COLLECTIONS as readonly string[]).includes(collection);

/** Domains and systems as containers: boxes other nodes sit in */
export const GROUP_TYPES = {
  domain: "domain-group",
  system: "system-group",
} as const;
export const isGroupType = (type?: string) =>
  type === GROUP_TYPES.domain || type === GROUP_TYPES.system;

export type NodeDefinition = {
  /** React Flow node type, matches the visualiser node component keys */
  type: string;
  /** Its key in the components list when several share a node type (the kinds of data store); else its type */
  id?: string;
  label: string;
  /** What it is, in a few words (beside its name in the components list) */
  summary?: string;
  category: NodeCategory;
  /** Not in the components list (still drawn, for canvases that have them) */
  unlisted?: boolean;
  /** Where the resource lives inside node.data (e.g. `service` for data.service). Undefined = data root */
  resourceKey?: string;
  /** Nodes that are sized on the canvas (containers, notes, text) start at this size */
  defaultSize?: { width: number; height: number };
  /** Only its width is set: its height follows what's in it (notes) */
  autoHeight?: boolean;
  /** Neither is set: it's as big as what's in it (text, as Excalidraw's; defaultSize is only where it's put) */
  autoSize?: boolean;
  /**
   * The first level of detail that shows it (it's on the more detailed ones too, see levels.ts): L1 domains, systems
   * and actors, L2 services, data stores, text and the like, L3 messages and channels. Notes are on every level.
   */
  firstLevel: 1 | 2 | 3;
  createData: () => Record<string, unknown>;
};

const resource = (name: string, summary: string) => ({
  name,
  version: "0.0.1",
  summary,
  owners: [],
});

/** The kinds of data store in the components list (EventCatalog's container types; agents can use the others too) */
const DATA_KINDS = [
  {
    containerType: "database",
    label: "Database",
    name: "New Database",
    summary: "Tables, e.g. PostgreSQL",
  },
  {
    containerType: "cache",
    label: "Cache",
    name: "New Cache",
    summary: "Fast data, e.g. Redis",
  },
  {
    containerType: "searchIndex",
    label: "Search index",
    name: "New Search Index",
    summary: "Search, e.g. Elasticsearch",
  },
  {
    containerType: "objectStore",
    label: "Object store",
    name: "New Object Store",
    summary: "Files and blobs, e.g. S3",
  },
] as const;

export const nodeDefinitions: NodeDefinition[] = [
  {
    type: GROUP_TYPES.domain,
    firstLevel: 1,
    label: "Domain",
    summary: "A business area, e.g. Sales",
    category: "boundaries",
    resourceKey: "domain",
    defaultSize: { width: 720, height: 460 },
    createData: () => ({ domain: { name: "New Domain", version: "0.0.1" } }),
  },
  {
    type: GROUP_TYPES.system,
    firstLevel: 1,
    label: "System",
    summary: "Services doing one job",
    category: "boundaries",
    resourceKey: "system",
    defaultSize: { width: 560, height: 360 },
    createData: () => ({ system: { name: "New System", version: "0.0.1" } }),
  },
  {
    type: "service",
    firstLevel: 2,
    category: "architecture",
    label: "Service",
    summary: "An API, worker or function",
    resourceKey: "service",
    createData: () => ({
      mode: "full",
      service: {
        ...resource("New Service", "Describe what this service does."),
        sends: [],
        receives: [],
      },
    }),
  },
  {
    type: "event",
    firstLevel: 3,
    category: "messages",
    label: "Event",
    summary: "Something that happened",
    resourceKey: "message",
    createData: () => ({
      mode: "full",
      message: resource("NewEvent", "Something happened."),
    }),
  },
  {
    type: "command",
    firstLevel: 3,
    category: "messages",
    label: "Command",
    summary: "A request to do something",
    resourceKey: "message",
    createData: () => ({
      mode: "full",
      message: resource("NewCommand", "Asks a service to do something."),
    }),
  },
  {
    type: "query",
    firstLevel: 3,
    category: "messages",
    label: "Query",
    summary: "A request for data",
    resourceKey: "message",
    createData: () => ({
      mode: "full",
      message: resource("NewQuery", "Asks for some information."),
    }),
  },
  {
    type: "channel",
    firstLevel: 3,
    // With the messages it carries
    category: "messages",
    label: "Channel",
    summary: "A topic, queue or bus",
    resourceKey: "channel",
    createData: () => ({
      mode: "full",
      channel: {
        ...resource("new.channel", "Where messages are routed."),
        protocols: [],
      },
    }),
  },
  {
    type: "view",
    firstLevel: 2,
    category: "architecture",
    label: "View",
    summary: "A screen or app people use",
    resourceKey: "view",
    createData: () => ({
      mode: "full",
      view: resource("New View", "What the user sees."),
    }),
  },
  {
    type: "externalSystem",
    firstLevel: 1,
    category: "architecture",
    label: "External System",
    summary: "A third party you use",
    resourceKey: "externalSystem",
    createData: () => ({
      mode: "full",
      externalSystem: resource("External System", "A third party system."),
    }),
  },
  {
    type: "agent",
    // The detail of how things work, like messages: shown on L3 (L1 and L2 draw past it)
    firstLevel: 3,
    category: "architecture",
    label: "Agent",
    summary: "An AI agent at work",
    resourceKey: "agent",
    createData: () => ({
      mode: "full",
      agent: {
        ...resource("New Agent", "What this agent does."),
        sends: [],
        receives: [],
      },
    }),
  },
  {
    type: "actor",
    firstLevel: 1,
    // Who uses the architecture: customers, operators, partners (Studio's actors)
    category: "people",
    label: "Actor",
    summary: "Someone who uses it",
    // Drawn like the visualiser's actors (by name only); the summary is for agents and the properties panel
    createData: () => ({ mode: "full", name: "Customer", summary: "" }),
  },
  {
    type: "team",
    firstLevel: 1,
    // Who owns what: connected to a domain, system or service, it's its owner (EventCatalog's owners)
    category: "people",
    label: "Team",
    summary: "Who owns what",
    resourceKey: "team",
    createData: () => ({
      mode: "full",
      team: resource("New Team", "What this team looks after."),
    }),
  },
  {
    type: "text",
    // On the bar at the top (T, N), not in the palette
    unlisted: true,
    firstLevel: 2,
    category: "other",
    label: "Text",
    defaultSize: { width: 240, height: 40 },
    autoSize: true,
    createData: () => ({ text: "Add some text" }),
  },
  {
    type: "note",
    // On the bar at the top (T, N), not in the palette
    unlisted: true,
    firstLevel: 1,
    category: "other",
    label: "Sticky Note",
    // About square, like a post-it (taller if more is written on it)
    defaultSize: { width: 200, height: 176 },
    autoHeight: true,
    createData: () => ({ text: "", color: "yellow" }),
  },
  // The kinds of data store: all data nodes (EventCatalog's containers), told apart by their container_type
  ...DATA_KINDS.map(
    ({ containerType, label, name, summary }): NodeDefinition => ({
      type: "data",
      ...(containerType !== "database" && { id: `data:${containerType}` }),
      firstLevel: 2,
      category: "data",
      label,
      summary,
      resourceKey: "data",
      createData: () => ({
        mode: "full",
        data: {
          ...resource(name, "Stores data."),
          container_type: containerType,
        },
      }),
    }),
  ),
  {
    type: "entity",
    // The domain model: detail, like messages (L3)
    firstLevel: 3,
    // The domain's data model, with the stores it's kept in
    category: "data",
    label: "Entity",
    summary: "Part of the domain model",
    resourceKey: "entity",
    createData: () => ({
      mode: "full",
      entity: {
        ...resource("NewEntity", "Something the domain keeps track of."),
        properties: [
          { name: "id", type: "string", required: true },
          { name: "createdAt", type: "string" },
        ],
      },
    }),
  },
];

/** A component's key in the components list (and what's dragged from it) */
export const componentKey = (definition: NodeDefinition) =>
  definition.id ?? definition.type;

/** The types people and agents can add (not the unlisted ones), each once (the kinds of data store are all `data`) */
export const COMPONENT_TYPES = [
  ...new Set(
    nodeDefinitions
      .filter((definition) => !definition.unlisted)
      .map((definition) => definition.type),
  ),
] as [string, ...string[]];

// By key: a node type finds its own (for data, the database), a kind of data store its kind
const definitionsByType = new Map(
  nodeDefinitions.map((definition) => [componentKey(definition), definition]),
);

// Node types that only come from the catalog (not in the components list)
const catalogNodeTypes: Record<
  string,
  { label: string; resourceKey: string; firstLevel: 1 | 2 | 3 }
> = {
  system: { label: "System", resourceKey: "system", firstLevel: 1 },
  "context-domain": { label: "Domain", resourceKey: "domain", firstLevel: 1 },
};

export const getNodeDefinition = (type?: string) =>
  type ? definitionsByType.get(type) : undefined;

export const getNodeLabel = (type?: string) =>
  getNodeDefinition(type)?.label ??
  catalogNodeTypes[type ?? ""]?.label ??
  "Node";

// About the size the visualiser's resource cards render at
export const DEFAULT_NODE_SIZE = { width: 240, height: 112 };

/** The size a new node of a type starts at (or, for cards, about the size it renders at) */
export const getNodeSize = (type?: string) =>
  getNodeDefinition(type)?.defaultSize ?? DEFAULT_NODE_SIZE;

const getResourceKey = (type?: string) =>
  getNodeDefinition(type)?.resourceKey ??
  catalogNodeTypes[type ?? ""]?.resourceKey;

/** The resource object for a node (e.g. data.service), or the data itself for flat nodes */
export const getResource = (
  type: string | undefined,
  data: Record<string, unknown>,
): Record<string, unknown> => {
  const key = getResourceKey(type);
  return key ? ((data[key] as Record<string, unknown>) ?? {}) : data;
};

/** Sticky notes sit on the canvas wherever they're put, never inside a container */
// Notes and text go anywhere, never in a container (one that's in one is taken out when it's next moved)
export const canGoInContainer = (type?: string) => !isWrittenOnCanvas(type);

/**
 * Whether a container can hold a kind of node, as EventCatalog's domains and systems do: a domain holds anything
 * (subdomains, systems, services...), a system anything but a domain
 */
export const canHold = (containerType?: string, type?: string) =>
  canGoInContainer(type) &&
  (containerType === GROUP_TYPES.domain ||
    (containerType === GROUP_TYPES.system &&
      type !== GROUP_TYPES.domain &&
      type !== "context-domain"));

/**
 * The level (L1, L2 or L3) a sticky note or text was written on: it's only shown there. Ones from before they had
 * levels are on L3, the canvas people edit. Other nodes are on every level they fit in, so they have none.
 */
export const getNoteLevel = (node: {
  type?: string;
  data: Record<string, unknown>;
}): 1 | 2 | 3 | undefined =>
  isWrittenOnCanvas(node.type)
    ? ((node.data.level as 1 | 2 | undefined) ?? 3)
    : undefined;

/** Whether a node is on a level's canvas as itself: everything on L3, but notes and text only on their level */
export const isOnLevel = (
  node: { type?: string; data: Record<string, unknown> },
  level: 1 | 2 | 3,
) => !isWrittenOnCanvas(node.type) || getNoteLevel(node) === level;

/** Whether a level of detail shows a kind of node (so it can be added there, and stay there) */
export const isShownOnLevel = (type: string | undefined, level: 1 | 2 | 3) =>
  level >=
  (getNodeDefinition(type)?.firstLevel ??
    catalogNodeTypes[type ?? ""]?.firstLevel ??
    3);

/** Whether a node's resource has a version (actors, notes and text don't) */
export const isVersioned = (type?: string) => !!getResourceKey(type);

/** Notes and text: written on the canvas itself (their text is their data, not a resource with a name) */
export const isWrittenOnCanvas = (type?: string) =>
  type === "note" || type === "text";

/** Returns new node data with fields of the resource changed */
export const updateResource = (
  type: string | undefined,
  data: Record<string, unknown>,
  fields: Record<string, unknown>,
) => {
  const key = getResourceKey(type);
  return key
    ? { ...data, [key]: { ...getResource(type, data), ...fields } }
    : { ...data, ...fields };
};

/** A node's name, as people and agents see it */
export const getNodeName = (
  type: string | undefined,
  data: Record<string, unknown>,
  fallback = "node",
) => String(getResource(type, data).name ?? data.text ?? fallback);
