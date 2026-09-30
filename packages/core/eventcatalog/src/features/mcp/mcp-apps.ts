import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { registerAppResource, RESOURCE_MIME_TYPE, RESOURCE_URI_META_KEY } from '@modelcontextprotocol/ext-apps/server';
import { z } from 'zod';

// MCP App views (built by scripts/build-mcp-apps.mjs). Without a build, tools return text only.
// Loaded when a host reads the view, not up front: each view's HTML is up to a few MB
const mcpAppViews = import.meta.glob<string>('./apps/generated/*.html', { query: '?raw', import: 'default' });

/** Loads a built MCP App view's HTML, or undefined when the views weren't built */
export const getMcpAppViewLoader = (name: string) => mcpAppViews[`./apps/generated/${name}.html`];

/** Tool `_meta` telling MCP hosts that support MCP Apps to show the tool's result in a view */
const appViewMeta = (resourceUri: string, visibility?: Array<'model' | 'app'>) => ({
  ui: { resourceUri, ...(visibility && { visibility }) },
  [RESOURCE_URI_META_KEY]: resourceUri,
});

/** Told to the model with every result shown in a view, so it doesn't repeat what the user can already see */
export const mcpAppNote = (subject: string, avoid: string, otherwise: string) =>
  `Clients that support MCP Apps are showing the user this ${subject} interactively. If so, do not ${avoid}: explain it instead. Otherwise, ${otherwise}.`;

/** What a tool shows: text for the model, and the payload for the view (built only when there is a view to show it) */
export type McpAppResult<Payload> =
  | { error: string }
  | {
      forModel: Record<string, unknown>;
      /** What was loaded, e.g. "the schema for events/OrderCreated", for the app-only tool's text */
      label: string;
      getPayload: () => Promise<Payload>;
    };

type ToolDefinition<Shape extends z.ZodRawShape> = {
  name: string;
  title: string;
  description: string;
  /** The tool's arguments, as a Zod shape */
  input: Shape;
};

export type McpAppDefinition<Shape extends z.ZodRawShape, ViewShape extends z.ZodRawShape, Payload> = {
  /** Loads the view's HTML; undefined when the views weren't built, so only the text result is returned */
  loadView?: () => Promise<string>;
  resource: { name: string; uri: string; description: string; csp?: { resourceDomains: string[] } };
  /** Key of the payload in the model-facing tool result's `_meta` */
  metaKey: string;
  /** The tool the model calls to show the user something */
  tool: ToolDefinition<Shape>;
  /** App-only tool the view calls to load its payload when the host doesn't pass the result's `_meta` */
  viewTool: ToolDefinition<ViewShape>;
  note: string;
  annotations: ToolAnnotations;
  load: (params: z.output<z.ZodObject<Shape>> | z.output<z.ZodObject<ViewShape>>) => Promise<McpAppResult<Payload>>;
  /** Prefix of the error returned when loading fails */
  errorMessage: string;
};

const errorResult = (error: { error: string }) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(error) }],
  isError: true,
});

/**
 * Registers a tool whose result MCP hosts that support MCP Apps show in a view (e.g. an interactive diagram),
 * with the app-only tool the view loads from and the view itself. Other hosts get the tool's text.
 */
export function registerMcpApp<Shape extends z.ZodRawShape, ViewShape extends z.ZodRawShape, Payload>(
  server: McpServer,
  app: McpAppDefinition<Shape, ViewShape, Payload>
) {
  const { loadView } = app;

  const showInView = async (params: z.output<z.ZodObject<Shape>>) => {
    try {
      const result = await app.load(params);
      if ('error' in result) return errorResult(result);
      return {
        // The model reads the text; hosts that support MCP Apps show the view from `_meta`
        content: [{ type: 'text' as const, text: JSON.stringify({ note: app.note, ...result.forModel }, null, 2) }],
        ...(loadView && { _meta: { [app.metaKey]: await result.getPayload() } }),
      };
    } catch (error) {
      return errorResult({ error: `${app.errorMessage}: ${error}` });
    }
  };

  const toolInput = z.object(app.tool.input);
  server.registerTool<z.ZodRawShape, typeof toolInput>(
    app.tool.name,
    {
      title: app.tool.title,
      description: app.tool.description,
      inputSchema: toolInput,
      annotations: app.annotations,
      _meta: loadView ? appViewMeta(app.resource.uri) : undefined,
    },
    showInView
  );

  if (!loadView) return;

  const loadForView = async (params: z.output<z.ZodObject<ViewShape>>) => {
    const result = await app.load(params);
    if ('error' in result) return errorResult(result);
    return {
      content: [{ type: 'text' as const, text: `Loaded ${result.label}` }],
      structuredContent: (await result.getPayload()) as Record<string, unknown>,
    };
  };

  const viewToolInput = z.object(app.viewTool.input);
  server.registerTool<z.ZodRawShape, typeof viewToolInput>(
    app.viewTool.name,
    {
      title: app.viewTool.title,
      description: app.viewTool.description,
      inputSchema: viewToolInput,
      annotations: app.annotations,
      _meta: appViewMeta(app.resource.uri, ['app']),
    },
    loadForView
  );

  registerAppResource(server, app.resource.name, app.resource.uri, { description: app.resource.description }, async () => ({
    contents: [
      {
        uri: app.resource.uri,
        mimeType: RESOURCE_MIME_TYPE,
        text: await loadView(),
        ...(app.resource.csp && { _meta: { ui: { csp: app.resource.csp } } }),
      },
    ],
  }));
}
