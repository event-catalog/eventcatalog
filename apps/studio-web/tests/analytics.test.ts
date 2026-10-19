import { describe, expect, it } from 'vitest';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { createMcpServer } from '../src/mcp/server';
import { callerId, noteMessage, noteResponse, userAgentFamily, type McpCall, type Properties } from '../src/analytics';
import { modelMix, modelStats, tourStats } from '../src/lib/stats';
import { parseViewFragment, viewLink } from '../src/lib/encode';
import type { Model } from '@eventcatalog/visualiser/model';

const model: Model = {
  title: 'Secret payments platform',
  resources: [
    { id: 'payments-ledger', type: 'service', name: 'Payments Ledger', summary: 'Holds every card number we see' },
    { id: 'card-charged', type: 'event', name: 'CardCharged' },
  ],
  relations: [{ from: 'payments-ledger', to: 'card-charged', kind: 'sends' }],
  notes: [{ resource: 'payments-ledger', text: 'Migrating off Oracle in Q3', author: 'Dana' }],
};
const secrets = ['Secret', 'payments-ledger', 'Payments Ledger', 'card number', 'CardCharged', 'Oracle', 'Dana'];
const leaks = (properties: unknown) => secrets.filter((secret) => JSON.stringify(properties).includes(secret));

describe('analytics', () => {
  it("describes a diagram by its shape only, never what's in it", () => {
    const stats = modelStats(model);
    expect(stats).toMatchObject({ resources: '1-5', services: '1-5', messages: '1-5', notes: '1-5', domains: '0' });
    expect(leaks(stats)).toEqual([]);
  });

  it("says what kinds of things a diagram has, in our words, never theirs", () => {
    const mix = modelMix(model);
    expect(mix).toMatchObject({
      resource_types: 'event,service',
      relation_kinds: 'sends',
      types_service: '1-5',
      types_event: '1-5',
      relations_sends: '1-5',
      with_summary: '26-50%',
      messages_with_schema: '0%',
    });
    expect(leaks(mix)).toEqual([]);
    const tour = tourStats([{ caption: 'Where the Oracle ledger lives', focus: ['payments-ledger'], notes: [{ resource: 'payments-ledger', text: 'Dana owns this' }] }]);
    expect(tour).toMatchObject({ tour_scenes: 1, tour_scenes_with_notes: 1, tour_scenes_with_code: 0 });
    expect(leaks(tour)).toEqual([]);
  });

  it('reports what a tool found without the model', async () => {
    const reported: Properties[] = [];
    const server = createMcpServer({ baseUrl: 'https://studio.example', report: (details) => void reported.push(details) });
    const client = new Client({ name: 'test', version: '0.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    await client.callTool({ name: 'render_architecture', arguments: { model } });
    const details = Object.assign({}, ...reported);
    expect(details).toMatchObject({ ok: true, resources: '1-5', relations: '1-5' });
    expect(leaks(details)).toEqual([]);

    reported.length = 0;
    await client.callTool({ name: 'render_architecture', arguments: { model: { ...model, relations: [{ from: 'nowhere', to: 'card-charged', kind: 'sends' }] } } });
    expect(Object.assign({}, ...reported)).toMatchObject({ ok: false, error_kind: 'invalid_model' });

    reported.length = 0;
    await client.callTool({ name: 'read_diagram', arguments: { diagram: 'https://studio.example/#room=abc,def' } });
    expect(Object.assign({}, ...reported)).toMatchObject({ ok: false, error_kind: 'live_session_link' });
  });

  it('notes the client, whether it shows MCP Apps, and the tool called', () => {
    const connecting: McpCall = {};
    noteMessage(connecting, {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-06-18', clientInfo: { name: 'claude-ai', version: '0.1.0' }, capabilities: { extensions: { 'io.modelcontextprotocol/ui': { mimeTypes: ['text/html;profile=mcp-app'] } } } },
    });
    expect(connecting).toMatchObject({ method: 'initialize', client: { name: 'claude-ai', version: '0.1.0' }, appsSupported: true });

    const calling: McpCall = {};
    noteMessage(calling, { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'render_architecture', arguments: { model } } });
    expect(calling).toEqual({ method: 'tools/call', tool: 'render_architecture' });
    const guessing: McpCall = {};
    noteMessage(guessing, { jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'export_customer_list', arguments: {} } });
    expect(guessing.tool).toBe('unknown');

    // What the client can do: capability and extension names only
    expect(connecting.capabilities).toBe('io.modelcontextprotocol/ui');

    // How it was answered: a tool's error result (e.g. arguments that didn't validate), or a JSON-RPC error
    const failing: McpCall = {};
    noteResponse(failing, { jsonrpc: '2.0', id: 3, result: { content: [], isError: true } });
    expect(failing.toolError).toBe(true);
    noteResponse(failing, { jsonrpc: '2.0', id: 4, error: { code: -32602, message: 'Unknown tool' } });
    expect(failing.rpcError).toBe(-32602);

    const notifying: McpCall = {};
    noteMessage(notifying, { jsonrpc: '2.0', method: 'notifications/initialized' });
    expect(notifying).toEqual({});
  });

  it('counts a caller for the day without keeping who they are', () => {
    const id = callerId('203.0.113.7', 'claude-code/2.0.14');
    expect(id).toMatch(/^[0-9a-f]{32}$/);
    expect(callerId('203.0.113.7', 'claude-code/2.0.14')).toBe(id);
    expect(callerId('203.0.113.8', 'claude-code/2.0.14')).not.toBe(id);
    expect(id).not.toContain('203');
    expect(userAgentFamily('claude-code/2.0.14 (external, cli)')).toBe('claude-code');
    expect(userAgentFamily('Mozilla/5.0 (Macintosh)')).toBe('mozilla');
    expect(userAgentFamily('')).toBe('unknown');
  });

  it("only takes a level from a link that's one of the levels (it's counted, so nothing typed into a link gets in)", () => {
    expect(parseViewFragment(viewLink('https://studio.example', model, { level: 'services' })!).level).toBe('services');
    const typed = viewLink('https://studio.example', model)! + '&l=' + encodeURIComponent('Acme payments rewrite');
    expect(parseViewFragment(typed).level).toBeUndefined();
  });

  it("tags links with where they were made, in the fragment (which isn't sent to the server)", () => {
    const link = viewLink('https://studio.example', model, { from: 'agent' })!;
    expect(new URL(link).search).toBe('');
    expect(parseViewFragment(link).from).toBe('agent');
    expect(parseViewFragment(viewLink('https://studio.example', model)!).from).toBeUndefined();
    expect(parseViewFragment(`${link.replace('s=agent', 's=elsewhere')}`).from).toBeUndefined();
  });
});
