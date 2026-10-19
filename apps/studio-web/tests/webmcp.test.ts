import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import fixture from './fixtures/orders-model.json';
import { Model, type ArchitecturePayload } from '@eventcatalog/visualiser/model';
import { createWebMcpTools, registerWebMcpTools, type ModelContext, type WebMcpCanvas } from '../view/webmcp';
import { createMcpServer } from '../src/mcp/server';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { viewLink } from '../src/lib/encode';

const model = Model.parse(fixture);

/** The tools as a WebMCP runtime has them, on a canvas showing `model` */
const setUp = async (canvas: Partial<WebMcpCanvas> = {}) => {
  const registered = new Map<string, { execute: (input: unknown) => Promise<{ content: { text: string }[]; isError?: boolean }>; inputSchema?: object }>();
  const modelContext: ModelContext = { registerTool: (tool) => void registered.set(tool.name, tool) };
  const render = vi.fn(async (_payload: ArchitecturePayload) => true);
  const showTour = vi.fn(async () => {});
  const count = await registerWebMcpTools(
    modelContext,
    createWebMcpTools(() => ({ model, live: false, render, showTour, ...canvas })),
    new AbortController().signal
  );
  const call = async (name: string, input: unknown = {}) => {
    const outcome = await registered.get(name)!.execute(input);
    const text = outcome.content[0].text;
    return { isError: !!outcome.isError, text, json: () => JSON.parse(text) };
  };
  return { registered, count, call, render, showTour };
};

describe('WebMCP tools', () => {
  it('are the MCP server’s tools, with JSON schemas for their input', async () => {
    const { registered, count } = await setUp();
    const client = new Client({ name: 'test', version: '0.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([createMcpServer({ baseUrl: 'https://studio.example' }).connect(serverTransport), client.connect(clientTransport)]);
    const serverTools = (await client.listTools()).tools.map((tool) => tool.name).filter((name) => name !== 'get_architecture_view');
    expect([...registered.keys()].sort()).toEqual(serverTools.sort());
    expect(count).toBe(registered.size);
    expect(registered.get('render_architecture')!.inputSchema).toMatchObject({ type: 'object', required: ['model'] });
  });

  it('reads the open canvas, and a diagram link', async () => {
    const { call } = await setUp({ selected: 'OrderPlaced' });
    const open = (await call('read_diagram')).json();
    expect(open.model.resources).toHaveLength(model.resources.length);
    expect(open.selected).toBe('OrderPlaced');

    const other = { ...model, title: 'From a link', resources: model.resources.slice(0, 1), relations: [] };
    const linked = (await call('read_diagram', { diagram: viewLink('https://studio.example', other)! })).json();
    expect(linked.model.title).toBe('From a link');
    expect((await call('read_diagram', { diagram: 'https://studio.example/#room=abc,key' })).isError).toBe(true);
  });

  it('draws a valid diagram on the canvas, and refuses an invalid one', async () => {
    const { call, render } = await setUp();
    const drawn = await call('render_architecture', { model: fixture, focus: 'OrderPlaced' });
    expect(drawn.isError).toBe(false);
    expect(render).toHaveBeenCalledWith(expect.objectContaining({ focus: 'OrderPlaced', model: expect.objectContaining({ title: model.title }) }));

    const unknownFocus = await call('render_architecture', { model: fixture, focus: 'nope' });
    expect(unknownFocus.isError).toBe(true);
    expect(unknownFocus.text).toContain('focus');
    const badInput = await call('render_architecture', { model: { title: 'No resources' } });
    expect(badInput.isError).toBe(true);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('says when the user kept their canvas, and never replaces a live session', async () => {
    const declined = await setUp({ render: async () => false });
    expect((await declined.call('render_architecture', { model: fixture })).text).toContain('kept their canvas');

    const live = await setUp({ live: true });
    const refused = await live.call('render_architecture', { model: fixture });
    expect(refused.isError).toBe(true);
    expect(refused.text).toContain('live session');
    expect(live.render).not.toHaveBeenCalled();
  });

  it('plays walkthroughs of what is on the canvas', async () => {
    const { call, showTour } = await setUp();
    const tour = [{ focus: ['OrderPlaced'], caption: 'The event' }];
    expect((await call('show_on_diagram', { tour })).json().scenes).toEqual(['1. The event']);
    expect(showTour).toHaveBeenCalledWith(tour);

    expect((await call('show_on_diagram', { tour: [{ focus: ['nope'] }] })).isError).toBe(true);
    const empty = await setUp({ model: { ...model, resources: [], relations: [] } });
    expect((await empty.call('show_on_diagram', { tour })).isError).toBe(true);
  });

  it('teaches the model, for the canvas in the browser', async () => {
    const { call } = await setUp();
    const { text, isError } = await call('get_architecture_schema');
    expect(isError).toBe(false);
    expect(text).toContain('# EventCatalog architecture model');
    expect(text).toContain('In the browser (WebMCP)');
  });

  // Chrome's budgets for WebMCP tools (names 30, descriptions 500, parameter descriptions 150 characters)
  it('keep to the browser’s budgets', () => {
    for (const tool of createWebMcpTools(() => ({ model, live: false, render: async () => true, showTour: async () => {} }))) {
      expect(tool.name.length, tool.name).toBeLessThanOrEqual(30);
      expect(tool.description.length, tool.name).toBeLessThanOrEqual(500);
      const { properties = {} } = z.toJSONSchema(tool.input, { io: 'input', unrepresentable: 'any' }) as { properties?: Record<string, { description?: string }> };
      for (const [name, property] of Object.entries(properties)) {
        expect(name.length, `${tool.name}.${name}`).toBeLessThanOrEqual(30);
        expect(property.description?.length ?? 0, `${tool.name}.${name}`).toBeLessThanOrEqual(150);
      }
    }
  });

  it('are only read only when they change nothing the user sees', () => {
    const tools = createWebMcpTools(() => ({ model, live: false, render: async () => true, showTour: async () => {} }));
    const readOnly = tools.filter((tool) => tool.annotations?.readOnlyHint).map((tool) => tool.name);
    expect(readOnly.sort()).toEqual(['get_architecture_schema', 'read_diagram']);
  });
});
