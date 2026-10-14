/**
 * The HTTP server: the MCP endpoint (Streamable HTTP, stateless), the browser view and a health check.
 * Models are never stored or logged: only the tool name, status, duration and counts (and, for product analytics,
 * the client, the tool and the diagram's size in buckets: see analytics.ts).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { promisify } from 'node:util';
import { Hono, type Context } from 'hono';
import { serve } from '@hono/node-server';
import { bodyLimit } from 'hono/body-limit';
import { compress } from 'hono/compress';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createMcpServer } from './mcp/server';
import { attachRooms } from './rooms';
import { DIST_DIRECTORY } from './paths';
import type { Server as HttpServer } from 'node:http';
import { createRateLimiter, MAX_BODY_BYTES } from './lib/limits';
import { noteMessage, noteResponse, reportMcpCall, reportRejected, type McpCall } from './analytics';
import { POSTHOG_ORIGIN } from './lib/posthog';

const PORT = Number(process.env.PORT ?? 8787);
const VIEW_PATH = path.join(DIST_DIRECTORY, 'view.html');
const OG_IMAGE_PATH = path.join(DIST_DIRECTORY, 'og.png');
const ICON_PATH = path.join(DIST_DIRECTORY, 'icon.svg');

const gzip = promisify(zlib.gzip);
const brotli = promisify(zlib.brotliCompress);

const app = new Hono();
const isRateLimited = createRateLimiter();

// Nothing is read as a type other than the one it's sent as
app.use('*', async (c, next) => {
  await next();
  c.res.headers.set('X-Content-Type-Options', 'nosniff');
});

const clientIp = (headers: Headers) =>
  headers.get('fly-client-ip') ?? headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';

// Where the view is served, for links to it: PUBLIC_URL, else this request's origin (set PUBLIC_URL behind a
// tunnel or proxy that doesn't pass the public host on, or links point at the wrong place)
const seenBaseUrls = new Set<string>();
const baseUrl = (request: Request) => {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL;
  const url = new URL(request.url);
  const proto = request.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '');
  const base = `${proto}://${request.headers.get('x-forwarded-host') ?? url.host}`;
  if (!seenBaseUrls.has(base) && seenBaseUrls.size < 20) {
    seenBaseUrls.add(base);
    console.log(`View links point at ${base}/view (set PUBLIC_URL if that's not where people reach this server)`);
  }
  return base;
};

const jsonRpcError = (message: string, code = -32000) => ({ jsonrpc: '2.0', error: { code, message }, id: null });

app.get('/health', (c) => c.json({ ok: true }));

// Responses compressed for clients that take it: reading the MCP App's view returns the ~4 MB page
app.use('/mcp', compress());

const callerOf = (request: Request) => ({ ip: clientIp(request.headers), userAgent: request.headers.get('user-agent') ?? '' });
const tooLarge = (c: Context) => {
  reportRejected('too_large', callerOf(c.req.raw));
  return c.json(jsonRpcError('Request too large (max 1 MB)'), 413);
};

app.post('/mcp', bodyLimit({ maxSize: MAX_BODY_BYTES, onError: tooLarge }), async (c) => {
  const limited = isRateLimited(clientIp(c.req.raw.headers));
  if (limited) {
    reportRejected('rate_limited', callerOf(c.req.raw));
    return c.json(jsonRpcError(limited), 429);
  }

  const started = Date.now();
  // What it asks for and how it went, for analytics (the client, the tool, the diagram's size: never the model)
  const call: McpCall = {};
  const server = createMcpServer({ baseUrl: baseUrl(c.req.raw), report: (details) => (call.details = { ...call.details, ...details }) });
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  let status = 500;
  try {
    await server.connect(transport);
    const handle = transport.onmessage;
    transport.onmessage = (message, extra) => {
      noteMessage(call, message);
      handle?.(message, extra);
    };
    // (and how it was answered: an error, or a tool's error result)
    const send = transport.send.bind(transport);
    transport.send = (message, options) => {
      noteResponse(call, message);
      return send(message, options);
    };
    const response = await transport.handleRequest(c.req.raw);
    status = response.status;
    return response;
  } catch (error) {
    console.error('MCP request failed', { error: String(error) });
    return c.json(jsonRpcError('Internal server error', -32603), 500);
  } finally {
    const ms = Date.now() - started;
    // Counts only, never the request body
    console.log(JSON.stringify({ at: 'mcp', status: 'done', ms }));
    reportMcpCall(call, { ...callerOf(c.req.raw), ms, status });
  }
});

// Stateless: no sessions to stream to or end
app.on(['GET', 'DELETE'], '/mcp', (c) => c.json(jsonRpcError('Method not allowed'), 405));

// The browser view: the same bundle as the MCP App, reading the model from the URL fragment (never sent here). The
// home page is the view too: an empty canvas, welcoming people (open a file, connect an agent)
const DESCRIPTION = 'Sketch, design and share architecture with your team and AI agents.';
const escapeAttribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
// How a link to the site previews (Slack, X, LinkedIn...): the image needs a full URL, so they're added here, per host
const socialTags = (base: string) =>
  [
    ['name="description"', DESCRIPTION],
    ['property="og:type"', 'website'],
    ['property="og:site_name"', 'EventCatalog Studio'],
    ['property="og:title"', 'EventCatalog Studio'],
    ['property="og:description"', DESCRIPTION],
    ['property="og:url"', `${base}/`],
    ['property="og:image"', `${base}/og.png`],
    ['property="og:image:width"', '1200'],
    ['property="og:image:height"', '630'],
    ['property="og:image:alt"', 'EventCatalog Studio: an architecture diagram on a canvas, with people editing it live'],
    ['name="twitter:card"', 'summary_large_image'],
    ['name="twitter:title"', 'EventCatalog Studio'],
    ['name="twitter:description"', DESCRIPTION],
    ['name="twitter:image"', `${base}/og.png`],
  ]
    .map(([key, content]) => `    <meta ${key} content="${escapeAttribute(content)}" />`)
    .join('\n');

// The page is ~4 MB (everything inlined, as MCP App hosts need it), so it's kept in memory compressed: gzip (~1.3 MB)
// straight away, and Brotli at its best (~1.1 MB, but seconds to make) in the background, served once it's ready.
// One per base URL (its social tags differ): just one with PUBLIC_URL set, a few at most without (local, tunnels)
type Page = { etag: string; raw: Buffer; gzip: Buffer; brotli?: Buffer; csp: string };

/**
 * What the page may do (Content-Security-Policy): run only its own scripts (the page's inline ones, by their hashes:
 * nothing a diagram carries, e.g. a javascript: link, can run), connect only to this server (its relay too) and to
 * the analytics relay, and be framed only by EventCatalog's own sites. Styles, images and fonts are inline (data:)
 * or made in the page (blob:, e.g. an exported image).
 */
const contentSecurityPolicy = (html: string, base: string) => {
  const hashes = [...html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .filter(([, attributes = '']) => !/\bsrc\s*=/i.test(attributes))
    .map(([, , code]) => `'sha256-${crypto.createHash('sha256').update(code!).digest('base64')}'`);
  const origin = new URL(base).origin;
  return [
    "default-src 'self'",
    `script-src 'self' ${hashes.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${origin.replace(/^http/, 'ws')} ${POSTHOG_ORIGIN} data: blob:`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'self' https://eventcatalog.dev https://*.eventcatalog.dev",
  ].join('; ');
};
const MAX_PAGES = 4;
const pages = new Map<string, Promise<Page>>();
const buildPage = async (base: string): Promise<Page> => {
  const html = (await fs.promises.readFile(VIEW_PATH, 'utf8')).replace('</title>', `</title>\n${socialTags(base)}`);
  const raw = Buffer.from(html);
  const page: Page = {
    csp: contentSecurityPolicy(html, base),
    etag: `W/"${crypto.createHash('sha1').update(raw).digest('base64url').slice(0, 20)}"`,
    raw,
    gzip: await gzip(raw, { level: zlib.constants.Z_BEST_COMPRESSION }),
  };
  brotli(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: raw.length } })
    .then((compressed) => (page.brotli = compressed))
    .catch(() => {});
  return page;
};
const pageFor = (base: string) => {
  let page = pages.get(base);
  if (!page) {
    if (pages.size >= MAX_PAGES) pages.delete(pages.keys().next().value!);
    page = buildPage(base);
    page.catch(() => pages.delete(base));
    pages.set(base, page);
  }
  return page;
};
// Ready before the first visitor, where the address is known
if (process.env.PUBLIC_URL && fs.existsSync(VIEW_PATH)) void pageFor(process.env.PUBLIC_URL).catch(() => {});

const serveView = async (c: Context) => {
  if (!fs.existsSync(VIEW_PATH)) return c.text('The view has not been built: run pnpm build:view', 503);
  const page = await pageFor(baseUrl(c.req.raw));
  c.header('Cache-Control', 'public, max-age=300');
  c.header('Referrer-Policy', 'no-referrer');
  c.header('Content-Security-Policy', page.csp);
  c.header('Vary', 'Accept-Encoding');
  c.header('ETag', page.etag);
  // Seen it already (and it hasn't changed): nothing to send
  if (c.req.header('If-None-Match') === page.etag) return c.body(null, 304);
  const accepts = c.req.header('Accept-Encoding') ?? '';
  const [body, encoding] =
    page.brotli && /\bbr\b/.test(accepts) ? [page.brotli, 'br'] : /\bgzip\b/.test(accepts) ? [page.gzip, 'gzip'] : [page.raw, undefined];
  if (encoding) c.header('Content-Encoding', encoding);
  c.header('Content-Type', 'text/html; charset=UTF-8');
  return c.body(new Uint8Array(body));
};
app.get('/view', serveView);
app.get('/', serveView);

let ogImage: Promise<Buffer> | undefined;
app.get('/og.png', async (c) => {
  if (!fs.existsSync(OG_IMAGE_PATH)) return c.notFound();
  c.header('Content-Type', 'image/png');
  c.header('Cache-Control', 'public, max-age=86400');
  return c.body(new Uint8Array(await (ogImage ??= fs.promises.readFile(OG_IMAGE_PATH))));
});

// The icon MCP clients show beside the server (serverInfo.icons)
let icon: Promise<Buffer> | undefined;
app.get('/icon.svg', async (c) => {
  if (!fs.existsSync(ICON_PATH)) return c.notFound();
  c.header('Content-Type', 'image/svg+xml');
  c.header('Cache-Control', 'public, max-age=86400');
  return c.body(new Uint8Array(await (icon ??= fs.promises.readFile(ICON_PATH))));
});

const server = serve({ fetch: app.fetch, port: PORT }, (info) => console.log(`EventCatalog MCP server on http://localhost:${info.port}/mcp`));
// Live rooms: an encrypted relay between people on the same canvas, on the same port (see rooms.ts)
attachRooms(server as unknown as HttpServer);
