import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

/**
 * Serves the WebMCP local relay's browser files (embed.js loads widget.html next to it), so the canvas page
 * can hand its WebMCP tools to desktop MCP clients (Claude Code, Cursor...) running
 * `npx -y @mcp-b/webmcp-local-relay@5.1.0`. Served from the installed package, so the version is pinned.
 */
const FILES: Record<string, string> = {
  'embed.js': 'text/javascript',
  'widget.html': 'text/html',
  'widget.js': 'text/javascript',
};

const browserDirectory = path.join(path.dirname(createRequire(import.meta.url).resolve('@mcp-b/webmcp-local-relay')), 'browser');

export const GET: APIRoute = async ({ params }) => {
  const file = params.file ?? '';
  const contentType = FILES[file];
  if (!contentType) return new Response('Not found', { status: 404 });
  const body = await fs.readFile(path.join(browserDirectory, file), 'utf-8');
  return new Response(body, { headers: { 'Content-Type': contentType, 'Cache-Control': 'no-cache' } });
};

export const prerender = false;
