/**
 * Shared by the MCP server and the schema viewer MCP App view (view.tsx).
 * Kept free of server-only imports so it can be bundled into the view.
 */
import type { ViewableSchema } from '@components/SchemaExplorer/parse-schema';

/** The ui:// resource holding the view's HTML (built by scripts/build-mcp-apps.mjs) */
export const SCHEMA_VIEWER_RESOURCE_URI = 'ui://eventcatalog/schema-viewer.html';

/** Key in a tool result's `_meta` carrying the schemas for the view (not shown to the model) */
export const SCHEMA_VIEWER_META_KEY = 'eventcatalog/schemaViewer';

/** App-only tool the view calls to load the schemas when the host doesn't pass the result's `_meta` */
export const SCHEMA_VIEWER_VIEW_TOOL = 'getSchemaViewerView';

export type SchemaViewerSchema = ViewableSchema & {
  /** Set when a message has more than one schema */
  name?: string;
  format: string;
  /** Language to highlight the code in (see getLanguageForHighlight) */
  language: string;
  code: string;
};

export type SchemaViewerPayload = {
  resource: { collection: string; id: string; version: string; name: string };
  /** The EventCatalog the schema came from, for links back to it */
  catalogUrl: string;
  /** Path of the resource's page in EventCatalog */
  docsPath: string;
  schemas: SchemaViewerSchema[];
};
