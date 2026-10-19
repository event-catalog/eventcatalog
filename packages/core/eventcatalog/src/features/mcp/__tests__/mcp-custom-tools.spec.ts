import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// A catalog whose eventcatalog.chat.js has a working custom tool, one without an execute function, and one whose
// input schema can't be read. Written before the MCP server loads, as it reads the custom tools once, when it loads.
const catalog = await vi.hoisted(async () => {
  const { mkdtempSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const directory = mkdtempSync(join(tmpdir(), 'eventcatalog-mcp-custom-tools-'));
  writeFileSync(
    join(directory, 'eventcatalog.chat.js'),
    `export const tools = {
      getMetrics: { description: 'Gets metrics', execute: async () => ({ ok: true }) },
      noExecute: { description: 'Has nothing to run' },
      unreadableSchema: {
        description: 'Has a schema that cannot be read',
        execute: async () => ({}),
        inputSchema: { get '~standard'() { throw new Error('broken schema'); } },
      },
    };`
  );
  const previous = process.env.PROJECT_DIR;
  process.env.PROJECT_DIR = directory;
  return { directory, previous };
});

const registered = vi.hoisted(() => [] as string[]);

vi.mock('@modelcontextprotocol/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@modelcontextprotocol/server')>()),
  McpServer: vi.fn().mockImplementation(function () {
    return {
      registerTool: vi.fn((name: string) => registered.push(name)),
      registerResource: vi.fn(),
      connect: vi.fn(),
    };
  }),
  WebStandardStreamableHTTPServerTransport: vi.fn().mockImplementation(function () {
    return { handleRequest: vi.fn(() => new Response(JSON.stringify({ jsonrpc: '2.0', result: {} }))) };
  }),
}));

vi.mock('astro:content', () => ({ getCollection: vi.fn(() => Promise.resolve([])), getEntry: vi.fn() }));

vi.mock('../mcp-auth', () => ({
  validateMcpRequest: vi.fn(() => Promise.resolve({ ok: true })),
  createMcpAuthErrorResponse: vi.fn(),
}));

// The MCP server takes longer than a test's 5 seconds to load the first time on a busy machine (e.g. CI)
beforeAll(async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  await import('../mcp-server');
}, 60_000);

afterAll(async () => {
  const { rmSync } = await import('node:fs');
  rmSync(catalog.directory, { recursive: true, force: true });
  if (catalog.previous === undefined) delete process.env.PROJECT_DIR;
  else process.env.PROJECT_DIR = catalog.previous;
});

describe('custom MCP tools from eventcatalog.chat.js', () => {
  it('registers only the custom tools it can offer', async () => {
    const { ALL } = await import('../mcp-server');
    await ALL({
      request: new Request('http://localhost:4321/docs/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
      }),
    } as any);

    expect(registered).toContain('getMetrics');
    expect(registered).not.toContain('noExecute');
    expect(registered).not.toContain('unreadableSchema');
  });

  it('lists only those custom tools in the server information', async () => {
    const { ALL } = await import('../mcp-server');
    const response = await ALL({ request: new Request('http://localhost:4321/docs/mcp') } as any);
    const info = await response.json();

    expect(info.extendedTools).toEqual(['getMetrics']);
    expect(info.tools).toContain('getMetrics');
    expect(info.tools).not.toContain('noExecute');
    expect(info.tools).not.toContain('unreadableSchema');
  });
});
