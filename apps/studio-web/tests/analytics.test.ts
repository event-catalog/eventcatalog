import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from '../src/mcp/server';
import { callerId, noteMessage, noteResponse, userAgentFamily, type McpCall, type Properties } from '../src/analytics';
import { modelMix, modelStats, tourStats } from '../src/lib/stats';
import { parseViewFragment, viewLink } from '../src/lib/encode';
import { parseStack, scrubMessage, toException } from '../src/lib/exceptions';
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

describe('exceptions', () => {
  const asIs = (frame: ReturnType<typeof parseStack>[number]) => ({ ...frame, platform: 'web:javascript' as const, in_app: true });

  it("reports an error's message without anything it quotes or links to (it can quote what's on the canvas)", () => {
    const messages = [
      'Unexpected token \'S\', "Secret payments platform" is not valid JSON',
      "Cannot read properties of undefined (reading 'payments-ledger')",
      'JSON Parse error: Unexpected identifier "CardCharged"',
      "Failed to execute 'setItem' on 'Storage': Setting the value of 'Payments Ledger' exceeded the quota.",
      'can\'t access property "Oracle", node is undefined',
      'Failed to fetch https://studio.example/#m=Dana',
      '`Migrating off Oracle` is not a function',
    ];
    const scrubbed = messages.map(scrubMessage);
    expect(leaks(scrubbed)).toEqual([]);
    expect(scrubbed[1]).toBe("Cannot read properties of undefined (reading '…')");
    expect(scrubbed[5]).toBe('Failed to fetch <link>');
    expect(scrubMessage('x'.repeat(500))).toHaveLength(200);
  });

  it("reads a stack's frames in Chrome's, Firefox's and Safari's shapes", () => {
    expect(
      parseStack(
        [
          "TypeError: Cannot read properties of undefined (reading 'Secret')",
          '    at Diagram (https://studio.example/view:14:2051)',
          '    at async load (https://studio.example/view:14:900)',
          '    at https://studio.example/view:15:12',
          '    at Array.map (<anonymous>)',
        ].join('\n')
      )
    ).toEqual([
      { function: 'Diagram', filename: 'https://studio.example/view', lineno: 14, colno: 2051 },
      { function: 'load', filename: 'https://studio.example/view', lineno: 14, colno: 900 },
      { function: '?', filename: 'https://studio.example/view', lineno: 15, colno: 12 },
    ]);
    expect(parseStack('Diagram@https://studio.example/view:14:2051\n@https://studio.example/view:15:12\n')).toEqual([
      { function: 'Diagram', filename: 'https://studio.example/view', lineno: 14, colno: 2051 },
      { function: '?', filename: 'https://studio.example/view', lineno: 15, colno: 12 },
    ]);
  });

  it("sends an error's type, its scrubbed message and its frames oldest first; never its stack's text", () => {
    const error = new TypeError("Cannot read properties of undefined (reading 'Payments Ledger')");
    error.stack = `TypeError: ${error.message}\n    at inner (https://studio.example/view:2:10)\n    at outer (https://studio.example/view:3:20)`;
    const exception = toException(error, { mechanism: 'onerror', frame: asIs });
    expect(exception).toMatchObject({ type: 'TypeError', value: "Cannot read properties of undefined (reading '…')", mechanism: { type: 'onerror', handled: false, synthetic: false } });
    expect(exception.stacktrace?.frames.map((frame) => frame.function)).toEqual(['outer', 'inner']);
    expect(leaks(exception)).toEqual([]);

    expect(toException('Request "Secret" timed out', { mechanism: 'onunhandledrejection', frame: asIs })).toEqual({
      type: 'UnhandledRejection',
      value: 'Request "…" timed out',
      mechanism: { type: 'onunhandledrejection', handled: false, synthetic: true },
    });
    expect(toException({ payments: 'Oracle' }, { mechanism: 'onunhandledrejection', frame: asIs }).value).toBe('Non-error thrown (object)');
  });
});
