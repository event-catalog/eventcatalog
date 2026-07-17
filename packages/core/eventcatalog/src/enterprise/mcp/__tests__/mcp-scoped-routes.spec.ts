/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/eventcatalog/src/enterprise/LICENSE
 */

import { describe, expect, it, vi } from 'vitest';

const domain = {
  id: 'payments-1.0.0',
  collection: 'domains',
  data: { id: 'payments', version: '1.0.0', name: 'Payments', services: [{ id: 'payment-service' }] },
};
const service = {
  id: 'payment-service-1.0.0',
  collection: 'services',
  data: { id: 'payment-service', version: '1.0.0', name: 'Payment Service' },
};

vi.mock('astro:content', () => ({
  getCollection: vi.fn((collection: string) => {
    if (collection === 'domains') return Promise.resolve([domain]);
    if (collection === 'services') return Promise.resolve([service]);
    return Promise.resolve([]);
  }),
  getEntry: vi.fn(),
}));

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn().mockImplementation(function () {
    return {
      registerTool: vi.fn(),
      registerResource: vi.fn(),
      connect: vi.fn(),
    };
  }),
}));

vi.mock('@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js', () => ({
  WebStandardStreamableHTTPServerTransport: vi.fn().mockImplementation(function () {
    return {
      handleRequest: vi.fn(() => new Response(JSON.stringify({ jsonrpc: '2.0', result: {} }))),
    };
  }),
}));

vi.mock('../mcp-auth', () => ({
  validateMcpRequest: vi.fn(() => Promise.resolve({ ok: true })),
  createMcpAuthErrorResponse: vi.fn(),
}));

describe('scoped MCP routes', () => {
  it('serves health metadata for the latest domain scope', async () => {
    const { ALL } = await import('../mcp-server');
    const response = await ALL({ request: new Request('http://localhost:4321/docs/mcp/domains/payments') } as any);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        name: 'EventCatalog MCP Server — Payments domain',
        status: 'running',
        scope: { kind: 'domain', id: 'payments', version: '1.0.0' },
      })
    );
  });

  it('returns 404 for an unknown domain scope', async () => {
    const { ALL } = await import('../mcp-server');
    const response = await ALL({ request: new Request('http://localhost:4321/docs/mcp/domains/missing') } as any);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ error: 'scope_not_found', message: 'Domain not found: missing (latest)' })
    );
  });

  it('creates a scoped MCP server for protocol requests', async () => {
    const { ALL } = await import('../mcp-server');
    const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
    const response = await ALL({
      request: new Request('http://localhost:4321/docs/mcp/domains/payments/1.0.0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
      }),
    } as any);

    expect(response.status).toBe(200);
    expect(McpServer).toHaveBeenCalledWith({ name: 'EventCatalog MCP Server — Payments domain', version: '1.0.0' });
  });
});
