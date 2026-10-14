/**
 * Shared by the MCP server and the EventCatalog viewer MCP App (view.tsx): one view that shows a
 * resource's architecture diagram or its schema, so hosts keep one panel open and update it.
 * Kept free of server-only imports so it can be bundled into the view.
 */
import type { ArchitectureDiagramPayload } from '../architecture-diagram/shared';
import type { SchemaViewerPayload } from '../schema-viewer/shared';

/** The ui:// resource holding the view's HTML (built by scripts/build-mcp-apps.mjs) */
export const VIEWER_RESOURCE_URI = 'ui://eventcatalog/viewer.html';

/** Key in a tool result's `_meta` carrying what the view shows (not shown to the model) */
export const VIEWER_META_KEY = 'eventcatalog/view';

/** App-only tool the view calls to load a view when the host doesn't pass the result's `_meta`, or to open another one */
export const VIEWER_VIEW_TOOL = 'getResourceView';

/** What the viewer can show of a resource */
export const RESOURCE_VIEWS = ['architecture', 'schema'] as const;
export type ResourceView = (typeof RESOURCE_VIEWS)[number];

export type ViewerPayload =
  | { view: 'architecture'; diagram: ArchitectureDiagramPayload }
  | { view: 'schema'; schema: SchemaViewerPayload };
