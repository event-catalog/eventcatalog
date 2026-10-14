/**
 * Shared by the MCP server and the schema viewer MCP App view (view.tsx, shown by the viewer in ../viewer).
 * Kept free of server-only imports so it can be bundled into the view.
 */
import type { ViewableSchema } from '@components/SchemaExplorer/parse-schema';

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
