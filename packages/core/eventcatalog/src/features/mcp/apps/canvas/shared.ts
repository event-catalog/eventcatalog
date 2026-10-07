// Shared by the canvas MCP App (client) and the MCP server: no server-only imports here
import type { CatalogRelation, CatalogResource } from '../../../studio/catalog-resources';

export const CANVAS_RESOURCE_URI = 'ui://eventcatalog/canvas.html';
/** Key of the payload in openCanvas results' `_meta` */
export const CANVAS_META_KEY = 'eventcatalog/canvas';
/** App-only tool the view loads the canvas from when the host doesn't pass the result's `_meta` */
export const CANVAS_VIEW_TOOL = 'getCanvasView';
/** App-only tool the view loads the catalog (for dragging resources in) from */
export const CANVAS_CATALOG_TOOL = 'getCanvasCatalog';
/** App-only tool the view syncs through when the chat's sandbox blocks the collaboration WebSocket */
export const CANVAS_SYNC_TOOL = 'syncCanvas';

/** A canvas listed in the view's picker */
export type CanvasListItem = { canvasId: string; title?: string; people: string[]; nodeCount: number; openComments: number };

/**
 * What the view shows: a canvas (it connects to it itself, so people and agents edit it live), or, when opened
 * without one (e.g. from ChatGPT's sidebar), a list of canvases to open or start.
 */
export type CanvasPayload = CanvasView | CanvasHome;

export type CanvasHome = { view: 'home'; canvases: CanvasListItem[] };

export type CanvasView = {
  view: 'canvas';
  canvasId: string;
  title?: string;
  /** The collaboration WebSocket, e.g. wss://catalog.example.com/_eventcatalog/studio */
  socketUrl: string;
  /** The canvas in EventCatalog */
  canvasUrl: string;
  /** The EventCatalog MCP server, for "Connect your agent" */
  mcpUrl: string;
  /** What to call the user on the canvas, when the agent knows their name */
  userName?: string;
};

export type CanvasCatalog = { resources: CatalogResource[]; relations: CatalogRelation[] };
