/**
 * Shared by the MCP server and the architecture diagram MCP App view (view.tsx, shown by the viewer in ../viewer).
 * Kept free of server-only imports so it can be bundled into the view.
 */
import type { ArchitectureDiagramDetail, ArchitectureDiagramView } from '@utils/node-graphs/architecture-diagram-types';

export type ArchitectureDiagramPayload = {
  resource: { collection: string; id: string; version: string; name: string };
  /** The EventCatalog the diagram came from, for links back to it */
  catalogUrl: string;
  /** Path of the resource's Diagram page in EventCatalog */
  visualiserPath: string;
  view: ArchitectureDiagramView;
  /** The level the diagram was asked for, to open at it (otherwise the diagram's own default) */
  detail?: ArchitectureDiagramDetail;
};
