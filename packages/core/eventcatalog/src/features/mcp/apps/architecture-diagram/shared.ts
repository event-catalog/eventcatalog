/**
 * Shared by the MCP server and the architecture diagram MCP App view (view.tsx).
 * Kept free of server-only imports so it can be bundled into the view.
 */
import type { ArchitectureDiagramView } from '@utils/node-graphs/architecture-diagram-types';

/** The ui:// resource holding the view's HTML (built by scripts/build-mcp-apps.mjs) */
export const ARCHITECTURE_DIAGRAM_RESOURCE_URI = 'ui://eventcatalog/architecture-diagram.html';

/** Key in a tool result's `_meta` carrying the diagram for the view (not shown to the model) */
export const ARCHITECTURE_DIAGRAM_META_KEY = 'eventcatalog/architectureDiagram';

/** App-only tool the view calls to load the diagram when the host doesn't pass the result's `_meta` */
export const ARCHITECTURE_DIAGRAM_VIEW_TOOL = 'getArchitectureDiagramView';

export type ArchitectureDiagramPayload = {
  resource: { collection: string; id: string; version: string; name: string };
  /** The EventCatalog the diagram came from, for links back to it */
  catalogUrl: string;
  /** Path of the resource's Diagram page in EventCatalog */
  visualiserPath: string;
  view: ArchitectureDiagramView;
};
