import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/** A tool icon (MCP 2025-11-25) */
export type ToolIcon = { src: string; mimeType?: string; sizes?: string[] };
type ListTools = (request: unknown, extra: unknown) => Promise<{ tools: { name: string }[] }>;

/** The SDK's request handlers (private in SDK 1.x, so checked rather than assumed) */
const getRequestHandlers = (server: McpServer): Map<string, ListTools> | undefined => {
  const handlers: unknown = Reflect.get(server.server, '_requestHandlers');
  return handlers instanceof Map ? handlers : undefined;
};

/**
 * Adds icons to tools in tools/list (MCP 2025-11-25 tool icons, which ChatGPT shows on entrypoints). The MCP
 * TypeScript SDK 1.x doesn't list tool icons, so this wraps its tools/list handler. If a new SDK changes how
 * it keeps handlers, tools are listed without icons and this says so.
 */
export const addToolIcons = (server: McpServer, icons: Record<string, ToolIcon[]>) => {
  const handlers = getRequestHandlers(server);
  const listTools = handlers?.get('tools/list');
  if (!handlers || !listTools) {
    console.warn('[EventCatalog MCP] Could not add tool icons: the MCP SDK no longer exposes its tools/list handler');
    return false;
  }
  handlers.set('tools/list', async (request, extra) => {
    const result = await listTools(request, extra);
    return { ...result, tools: result.tools.map((tool) => (icons[tool.name] ? { ...tool, icons: icons[tool.name] } : tool)) };
  });
  return true;
};
