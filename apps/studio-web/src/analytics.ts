/**
 * The MCP server's product analytics, to EventCatalog's PostHog project (with the view's, view/analytics.ts): which
 * agents connect (and whether they show MCP Apps), which tools they call, how big the diagrams they draw are and how
 * often their models need fixing. Never the model: kinds, counts and buckets only (the HTTP server logs no more).
 *
 * Nobody's identified: an event's id is a hash of the caller's address and user agent with a salt that's only in
 * memory and changes every day (as Plausible counts visitors), so a day's calls from one client count together and
 * nothing links them across days. PostHog's location lookup is off (it would see this server's address, not theirs).
 *
 * Sent from production only (PUBLIC_URL not on localhost); ANALYTICS=off turns it off, ANALYTICS=debug sends (and logs)
 * from anywhere, marked as development.
 */
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getUiCapability } from '@modelcontextprotocol/ext-apps/server';
import { CLIENT_CAPABILITIES_META_KEY, CLIENT_INFO_META_KEY, PROTOCOL_VERSION_META_KEY } from '@modelcontextprotocol/server';
import { POSTHOG_HOST, POSTHOG_KEY } from './lib/posthog';
import { toException, type StackFrame } from './lib/exceptions';

type Value = string | number | boolean | undefined | null;
export type Properties = Record<string, Value>;

const FLUSH_MS = 10_000;
const MAX_BATCH = 100;
const MAX_QUEUED = 2000;

const setting = process.env.ANALYTICS;
export const isLocal = (url?: string) => {
  try {
    return !url || /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|0\.0\.0\.0)$/.test(new URL(url).hostname);
  } catch {
    return true;
  }
};
const environment = isLocal(process.env.PUBLIC_URL) ? 'development' : 'production';
const enabled = setting !== 'off' && !process.env.VITEST && (environment === 'production' || setting === 'debug');

// ---- Who's calling, anonymously ----

let salt = { day: '', value: '' };
/** The caller for today: a hash of their address and user agent, salted (the salt changes daily and isn't kept) */
export function callerId(ip: string, userAgent: string) {
  const day = new Date().toISOString().slice(0, 10);
  if (salt.day !== day) salt = { day, value: crypto.randomBytes(16).toString('hex') };
  return crypto.createHash('sha256').update(`${salt.value}|${ip}|${userAgent}`).digest('hex').slice(0, 32);
}

/** The client's name from its user agent: the first word (e.g. claude-code, cursor, openai-mcp, node), not its details */
export const userAgentFamily = (userAgent: string) =>
  (userAgent.split(/[\s/;(]/)[0] || 'unknown').toLowerCase().slice(0, 40);

// Our tools: a name a client sends that isn't one of them is reported as `unknown` (it's whatever the client sent)
const TOOLS = new Set([
  'get_architecture_schema',
  'render_architecture',
  'edit_diagram',
  'read_diagram',
  'get_architecture_view',
  'wait_for_diagram_requests',
  'answer_diagram_request',
]);
// The open diagram's view waiting for what the agent asks of it (it calls again whenever a wait returns): not
// counted, it's not something anyone did
const NOT_COUNTED = new Set(['wait_for_diagram_requests']);

// The client each caller said it was when it connected (initialize), for their tool calls (sent without it: stateless;
// from 2026-07-28 every request says who's calling)
const clients = new Map<string, { name: string; version?: string }>();
const rememberClient = (caller: string, client: { name: string; version?: string }) => {
  clients.delete(caller);
  clients.set(caller, client);
  if (clients.size > 5000) clients.delete(clients.keys().next().value!);
};

// ---- Sending ----

type Queued = { event: string; properties: Record<string, unknown>; timestamp: string };
const queue: Queued[] = [];
let timer: NodeJS.Timeout | undefined;

export async function flushAnalytics() {
  if (timer) clearTimeout(timer);
  timer = undefined;
  while (queue.length) {
    const batch = queue.splice(0, MAX_BATCH);
    if (setting === 'debug') batch.forEach(({ event, properties }) => console.log('[analytics]', event, JSON.stringify(properties)));
    try {
      await fetch(`${POSTHOG_HOST}/batch/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: POSTHOG_KEY, batch }),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // Dropped: analytics never gets in the way
    }
  }
}

export function capture(event: string, caller: string, properties: Record<string, unknown> = {}) {
  if (!enabled || queue.length >= MAX_QUEUED) return;
  const clean = Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined && value !== null && value !== ''));
  queue.push({
    event,
    timestamp: new Date().toISOString(),
    properties: {
      distinct_id: caller,
      $process_person_profile: false,
      $geoip_disable: true,
      $lib: 'studio-web-server',
      product: 'studio_web',
      surface: 'mcp',
      environment,
      ...clean,
    },
  });
  if (queue.length >= MAX_BATCH) void flushAnalytics();
  else timer ??= setTimeout(() => void flushAnalytics(), FLUSH_MS);
}

// Sent before the server stops (Fly stops machines with SIGINT; SIGTERM elsewhere)
if (enabled) {
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      const exit = () => process.exit(0);
      setTimeout(exit, 3000).unref();
      void flushAnalytics().finally(exit);
    });
  }
}

// ---- One MCP request (see server.ts) ----

/** What a request to /mcp was, as it's handled: what it asked for, and what the tool found (filled in by the tools) */
export type McpCall = {
  method?: string;
  tool?: string;
  client?: { name: string; version?: string };
  protocolVersion?: string;
  appsSupported?: boolean;
  /** What the client says it can do (capability names, e.g. elicitation, roots, sampling, and its extensions) */
  capabilities?: string;
  viewRead?: boolean;
  /** The answer was a JSON-RPC error (its code), or a tool's error result (e.g. arguments that didn't validate) */
  rpcError?: number;
  toolError?: boolean;
  /** Set by the tools: whether it worked (and why not), and the diagram's shape */
  details?: Properties;
};

/** Notes the client's name, protocol version and capability names (never more), from what it sent */
function noteClient(call: McpCall, { info, protocolVersion, capabilities }: { info: unknown; protocolVersion: unknown; capabilities: unknown }) {
  const client = info as { name?: unknown; version?: unknown } | undefined;
  if (typeof client?.name === 'string') call.client = { name: client.name.slice(0, 60), version: typeof client.version === 'string' ? client.version.slice(0, 30) : undefined };
  if (typeof protocolVersion === 'string') call.protocolVersion = protocolVersion.slice(0, 30);
  if (!capabilities || typeof capabilities !== 'object') return;
  call.appsSupported = !!getUiCapability(capabilities as Parameters<typeof getUiCapability>[0]);
  const extensions = Object.keys(((capabilities as Record<string, unknown>).extensions as Record<string, unknown> | undefined) ?? {});
  call.capabilities = [...Object.keys(capabilities).filter((name) => name !== 'extensions'), ...extensions]
    .map((name) => name.slice(0, 60))
    .sort()
    .join(',');
}

/** Notes what a JSON-RPC message asks for (the transport's parsed message, before the server handles it) */
export function noteMessage(call: McpCall, message: unknown) {
  if (!message || typeof message !== 'object' || !('method' in message)) return;
  const { method, params } = message as { method: string; params?: Record<string, unknown> };
  if (method.startsWith('notifications/')) return;
  call.method = method;
  // Who's calling and what it can do: from initialize (MCP before 2026-07-28), or from the envelope every request
  // carries in its _meta (2026-07-28 and later, where there's no initialize: clients connect with server/discover)
  const envelope = params?._meta as Record<string, unknown> | undefined;
  const connecting = method === 'initialize';
  noteClient(call, {
    info: connecting ? params?.clientInfo : envelope?.[CLIENT_INFO_META_KEY],
    protocolVersion: connecting ? params?.protocolVersion : envelope?.[PROTOCOL_VERSION_META_KEY],
    capabilities: connecting ? params?.capabilities : envelope?.[CLIENT_CAPABILITIES_META_KEY],
  });
  if (method === 'tools/call' && typeof params?.name === 'string') {
    call.tool = TOOLS.has(params.name) ? params.name : 'unknown';
  } else if (method === 'resources/read') {
    call.viewRead = typeof params?.uri === 'string' && params.uri.startsWith('ui://eventcatalog/');
  }
}

/** Notes how a JSON-RPC answer went (the transport's message, before it's sent): an error, or a tool's error result */
export function noteResponse(call: McpCall, message: unknown) {
  if (!message || typeof message !== 'object') return;
  const { error, result } = message as { error?: { code?: unknown }; result?: { isError?: unknown } };
  if (error) call.rpcError = typeof error.code === 'number' ? error.code : -1;
  if (result?.isError === true) call.toolError = true;
}

/** A request turned away before it was handled (too many from one caller, or too large) */
export function reportRejected(reason: 'rate_limited' | 'too_large', { ip, userAgent }: { ip: string; userAgent: string }) {
  if (!enabled) return;
  const caller = callerId(ip, userAgent);
  capture('mcp_rejected', caller, { reason, client_name: clients.get(caller)?.name, user_agent_family: userAgentFamily(userAgent) });
}

/** The request's event, once it's been answered: connecting, a tool call, or a chat loading the view */
export function reportMcpCall(call: McpCall, { ip, userAgent, ms, status }: { ip: string; userAgent: string; ms: number; status: number }) {
  if (!enabled || !call.method || (call.tool && NOT_COUNTED.has(call.tool) && call.rpcError === undefined && !call.toolError)) return;
  const caller = callerId(ip, userAgent);
  if (call.client) rememberClient(caller, call.client);
  const client = call.client ?? clients.get(caller);
  const common = { client_name: client?.name, client_version: client?.version, user_agent_family: userAgentFamily(userAgent) };
  const ok = status < 400 && call.rpcError === undefined && !call.toolError && call.details?.ok !== false;
  // Why it failed, when the tool didn't say: a JSON-RPC error (e.g. an unknown tool), or a tool error result (e.g.
  // arguments that didn't match the schema, turned away before the tool ran)
  const errorKind = ok
    ? undefined
    : ((call.details?.error_kind as string | undefined) ??
      (call.tool === 'unknown'
        ? 'unknown_tool'
        : call.rpcError !== undefined
          ? `rpc_${call.rpcError}`
          : call.toolError
            ? 'invalid_arguments'
            : `http_${status}`));
  // Every request, by method (what clients do over the protocol: listing tools, reading the view, calling tools)
  capture('mcp_request', caller, { ...common, method: call.method, ...(call.tool && { tool: call.tool }), ok, duration_ms: ms, error_kind: errorKind });
  // Connecting: initialize, or server/discover (2026-07-28 and later)
  if (call.method === 'initialize' || call.method === 'server/discover') {
    capture('mcp_client_connected', caller, {
      ...common,
      protocol_version: call.protocolVersion,
      supports_mcp_apps: call.appsSupported,
      client_capabilities: call.capabilities,
    });
  } else if (call.method === 'tools/call' && call.tool) {
    // Whether the client shows MCP Apps is only known per call from 2026-07-28 (it's in every request's envelope)
    capture('mcp_tool_called', caller, { ...common, tool: call.tool, duration_ms: ms, supports_mcp_apps: call.appsSupported, ...call.details, ok, error_kind: errorKind });
  } else if (call.method === 'resources/read' && call.viewRead) {
    capture('mcp_view_loaded', caller, common);
  }
}

// ---- Errors, for PostHog's error tracking ($exception) ----

// The app's folder (above src/, or build/ when bundled): frames are named from it, e.g. src/server.ts
const APP_ROOT = path.join(import.meta.dirname, '..');
/** A frame, where in the source it is (node maps the bundle's frames back to it: --enable-source-maps) */
const nodeFrame = (frame: { function: string; filename: string; lineno: number; colno: number }): StackFrame => {
  const file = frame.filename.startsWith('file://') ? fileURLToPath(frame.filename) : frame.filename;
  return {
    platform: 'node:javascript',
    function: frame.function,
    filename: path.isAbsolute(file) ? path.relative(APP_ROOT, file) : file,
    lineno: frame.lineno,
    colno: frame.colno,
    in_app: path.isAbsolute(file) && !file.includes(`${path.sep}node_modules${path.sep}`),
  };
};

/** An error answering a request: its type, its message without what it quotes, and its frames (src/lib/exceptions.ts) */
export function reportException(error: unknown, { ip, userAgent }: { ip: string; userAgent: string }) {
  if (!enabled) return;
  const caller = callerId(ip, userAgent);
  capture('$exception', caller, {
    $exception_list: [toException(error, { mechanism: 'handled', frame: nodeFrame })],
    $exception_level: 'error',
    client_name: clients.get(caller)?.name,
    user_agent_family: userAgentFamily(userAgent),
  });
}
