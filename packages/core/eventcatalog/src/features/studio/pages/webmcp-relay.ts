import type { APIRoute } from 'astro';
import embed from '../webmcp-relay/embed.js?raw';
import widgetHtml from '../webmcp-relay/widget.html?raw';
import widgetJs from '../webmcp-relay/widget.js?raw';

/**
 * Serves the WebMCP local relay's browser files (embed.js loads widget.html next to it), so the canvas page
 * can hand its WebMCP tools to desktop MCP clients (Claude Code, Cursor...) running
 * `npx -y @mcp-b/webmcp-local-relay@5.1.0`. The files are copies of that version's (see webmcp-relay/README.md),
 * bundled with the page, so the version is pinned.
 */
const FILES: Record<string, { body: string; contentType: string }> = {
  'embed.js': { body: embed, contentType: 'text/javascript' },
  'widget.html': { body: widgetHtml, contentType: 'text/html' },
  'widget.js': { body: widgetJs, contentType: 'text/javascript' },
};

export const GET: APIRoute = async ({ params }) => {
  const file = FILES[params.file ?? ''];
  if (!file) return new Response('Not found', { status: 404 });
  return new Response(file.body, { headers: { 'Content-Type': file.contentType, 'Cache-Control': 'no-cache' } });
};

export const prerender = false;
