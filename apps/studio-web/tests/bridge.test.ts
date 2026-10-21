import { afterEach, describe, expect, it, vi } from 'vitest';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import fixture from './fixtures/orders-model.json';
import { Model } from '@eventcatalog/visualiser/model';
import { answerRequest, ask, newDiagramId, resetBridge, waitForRequests, DIAGRAM_ID } from '../src/mcp/bridge';
import { createMcpServer } from '../src/mcp/server';

const model = Model.parse(fixture);
const SECRET = 'a'.repeat(64);
const OTHER_SECRET = 'b'.repeat(64);

afterEach(() => resetBridge());

/** The open diagram's view: waits, and answers each request with `answer` */
function openView(diagramId: string, answer: (request: { id: string; kind: string; changes?: unknown }) => Record<string, unknown>, secret = SECRET) {
  let open = true;
  const seen: unknown[] = [];
  void (async () => {
    while (open) {
      const result = await waitForRequests(diagramId, secret, { waitMs: 50 });
      if ('error' in result) return;
      for (const request of result.requests) {
        seen.push(request);
        answerRequest(diagramId, secret, request.id, answer(request));
      }
    }
  })();
  return { seen, close: () => (open = false) };
}

const connect = async () => {
  const client = new Client({ name: 'test', version: '0.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([createMcpServer({ baseUrl: 'https://studio.example' }).connect(serverTransport), client.connect(clientTransport)]);
  return client;
};
const textOf = (result: Awaited<ReturnType<Client['callTool']>>) => JSON.parse((result.content as { text: string }[])[0].text);

describe('the bridge to the open diagram', () => {
  it('makes unguessable diagram ids', () => {
    const ids = new Set(Array.from({ length: 1000 }, newDiagramId));
    expect(ids.size).toBe(1000);
    for (const id of ids) expect(id).toMatch(DIAGRAM_ID);
  });

  it('carries a request to the waiting view and its answer back', async () => {
    const id = newDiagramId();
    const view = openView(id, () => ({ ok: 'yes' }));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(await ask(id, { kind: 'read' }, { answerMs: 1000 })).toEqual({ outcome: 'answered', answer: { ok: 'yes' } });
    view.close();
  });

  it("says when the diagram isn't open, or didn't answer", async () => {
    expect(await ask(newDiagramId(), { kind: 'read' })).toEqual({ outcome: 'not_open' });

    const id = newDiagramId();
    await waitForRequests(id, SECRET, { waitMs: 1 }); // waited once, then stopped
    expect((await ask(id, { kind: 'edit', changes: [] }, { answerMs: 50 })).outcome).toBe('not_answered');
    // The edit stays asked of it: it's done when the view's back
    const later = await waitForRequests(id, SECRET, { waitMs: 1 });
    expect('requests' in later && later.requests.map((request) => request.kind)).toEqual(['edit']);
  });

  it('keeps a diagram to the view that has it open: another secret can neither wait for its requests nor answer them', async () => {
    const id = newDiagramId();
    const answers: string[] = [];
    const view = openView(id, (request) => (answers.push(request.id), { from: 'view' }));
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(await waitForRequests(id, OTHER_SECRET, { waitMs: 1 })).toEqual({ error: 'This diagram is open in another view.' });
    const asking = ask(id, { kind: 'read' }, { answerMs: 1000 });
    // Someone else answering a request they can't see, with a made-up id, is ignored
    expect(answerRequest(id, OTHER_SECRET, crypto.randomUUID(), { from: 'someone else' })).toBe(false);
    expect(await asking).toEqual({ outcome: 'answered', answer: { from: 'view' } });
    view.close();
  });

  it('lets the diagram be opened again elsewhere once the first view stops waiting', async () => {
    const id = newDiagramId();
    await waitForRequests(id, SECRET, { waitMs: 1 });
    // Still open (between two waits): refused
    expect('error' in (await waitForRequests(id, OTHER_SECRET, { waitMs: 1 }))).toBe(true);
    // Not waited on for a while: the other view takes it over, and the first one can't come back to it
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 60_000);
    const takingOver = waitForRequests(id, OTHER_SECRET, { waitMs: 1 });
    await vi.advanceTimersByTimeAsync(5);
    expect('requests' in (await takingOver)).toBe(true);
    expect('error' in (await waitForRequests(id, SECRET, { waitMs: 1 }))).toBe(true);
    vi.useRealTimers();
  });
});

describe('edit_diagram and read_diagram, through the open view', () => {
  it('sends only the changes to the open diagram, and returns what it made of them', async () => {
    const client = await connect();
    const id = newDiagramId();
    const view = openView(id, (request) => ({
      results: (request.changes as unknown[]).map((_, index) => (index === 1 ? { index, op: 'add_relation', ok: false, error: '"nope" isn\'t a resource.' } : { index, op: 'add_resource', ok: true })),
      resources: 16,
      relations: 13,
    }));
    await new Promise((resolve) => setTimeout(resolve, 10));

    const result = await client.callTool({
      name: 'edit_diagram',
      arguments: {
        diagramId: id,
        reorder: true,
        changes: [
          { op: 'add_resource', resource: { id: 'payments', type: 'domain', name: 'Payments' } },
          { op: 'add_relation', relation: { from: 'nope', to: 'payments', kind: 'connects' } },
        ],
      },
    });
    expect(result.isError).toBeFalsy();
    const answer = textOf(result);
    expect(answer.note).toContain('Made 1 of 2 changes');
    expect(answer.failed).toEqual([{ index: 1, op: 'add_relation', error: '"nope" isn\'t a resource.' }]);
    expect(view.seen).toHaveLength(1);
    // Asked to lay it out again after (the last edit of a round)
    expect(view.seen[0]).toMatchObject({ kind: 'edit', reorder: true });
    view.close();
  });

  it('reads the open diagram as it is now, without where things are', async () => {
    const client = await connect();
    const id = newDiagramId();
    const view = openView(id, () => ({ model: { ...model, layout: { messages: { 'orders-service': { x: 1, y: 2 } } } } }));
    await new Promise((resolve) => setTimeout(resolve, 10));

    const read = textOf(await client.callTool({ name: 'read_diagram', arguments: { diagramId: id } }));
    expect(read.model.resources).toHaveLength(model.resources.length);
    expect(read.model.layout).toBeUndefined();
    view.close();
  });

  it("tells the agent when the diagram isn't open, and to render it instead", async () => {
    const client = await connect();
    const result = await client.callTool({ name: 'edit_diagram', arguments: { diagramId: newDiagramId(), changes: [{ op: 'set_title', title: 'x' }] } });
    expect(result.isError).toBe(true);
    expect(textOf(result).error).toContain('render_architecture');
  });

  it('refuses ids that were not made by the server', async () => {
    const client = await connect();
    const result = await client.callTool({ name: 'edit_diagram', arguments: { diagramId: '../../etc', changes: [{ op: 'set_title', title: 'x' }] } });
    expect(result.isError).toBe(true);
  });

  it('gives each rendered diagram an id to change it by, and tells the agent to use it', async () => {
    const client = await connect();
    const result = textOf(await client.callTool({ name: 'render_architecture', arguments: { model } }));
    expect(result.diagramId).toMatch(DIAGRAM_ID);
    expect(result.next).toContain('edit_diagram');
  });
});
