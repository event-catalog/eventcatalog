/**
 * The resources that have an architecture diagram, and the shape of a diagram. Has no imports so
 * it can be shared by the diagram builders, the MCP tools and the MCP App view bundled for the browser.
 */

export const ARCHITECTURE_DIAGRAM_COLLECTIONS = [
  'events',
  'commands',
  'queries',
  'agents',
  'services',
  'domains',
  'systems',
  'flows',
  'containers',
  'data-products',
] as const;

export type ArchitectureDiagramCollection = (typeof ARCHITECTURE_DIAGRAM_COLLECTIONS)[number];

export const isArchitectureDiagramCollection = (collection: string): collection is ArchitectureDiagramCollection =>
  (ARCHITECTURE_DIAGRAM_COLLECTIONS as readonly string[]).includes(collection);

/**
 * The levels of a diagram, as on the Diagram page's toolbar: L1 `overview` (domains, systems and their
 * relationships), L2 `services` (services and data stores, without messages and channels) and L3 `full`.
 */
export const ARCHITECTURE_DIAGRAM_DETAILS = ['overview', 'services', 'full'] as const;

export type ArchitectureDiagramDetail = (typeof ARCHITECTURE_DIAGRAM_DETAILS)[number];

export type Graph = { nodes: any[]; edges: any[] };

/**
 * The diagram with its levels, as the Diagram page shows it: the detailed graph, and for
 * domains and systems the level 1 overview and the graph without messages and channels.
 */
export type ArchitectureDiagramView = Graph & { overview?: Graph; hiddenMessages?: Graph };
