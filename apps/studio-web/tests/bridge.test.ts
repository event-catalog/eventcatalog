import { afterEach, describe, expect, it } from 'vitest';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import fixture from './fixtures/orders-model.json';
import { Model } from '@eventcatalog/visualiser/model';
import { answerRequest, ask, newDiagramId, resetBridge, viewTokenFor, waitForRequests, DIAGRAM_ID } from '../src/mcp/bridge';
import { createMcpServer } from '../src/mcp/server';

const model = Model.parse(fixture);
const FORGED = 'a'.repeat(64);

afterEach(() => resetBridge());

/** The open diagram's view: waits, and answers each request with `answer` */
function openView(diagramId: string, answer: (request: { id: string; kind: string; changes?: unknown }) => Record<string, unknown>, token = viewTokenFor(diagramId)) {
  let open = true;
  const seen: unknown[] = [];
  void (async () => {
    while (open) {
      const result = await waitForRequests(diagramId, token, { waitMs: 50 });
      if ('error' in result) return;
      for (const request of result.requests) {
        seen.push(request);
        answerRequest(diagramId, token, request.id, answer(request));
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
    const token = viewTokenFor(id);
    await waitForRequests(id, token, { waitMs: 1 }); // waited once, then stopped (out of sight)
    expect((await ask(id, { kind: 'edit', changes: [] }, { answerMs: 50 })).outcome).toBe('not_taken');
    // Not kept to be done later (nothing here keeps it that long): the agent's told it wasn't made
    const later = await waitForRequests(id, token, { waitMs: 1 });
    expect('requests' in later && later.requests).toEqual([]);

    // Taken, but not answered in time: it may still be made
    const taking = waitForRequests(id, token, { waitMs: 1000 }); // takes it, and never answers
    const asking = ask(id, { kind: 'edit', changes: [] }, { answerMs: 100 });
    expect('requests' in (await taking) && (await taking as { requests: unknown[] }).requests).toHaveLength(1);
    expect((await asking).outcome).toBe('not_answered');
  });

  it("keeps a diagram to its views: without its token, nobody can wait for its requests or answer them", async () => {
    const id = newDiagramId();
    const answers: string[] = [];
    const view = openView(id, (request) => (answers.push(request.id), { from: 'view' }));
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Another diagram's token, or a made-up one, is refused
    for (const token of [FORGED, viewTokenFor(newDiagramId())])
      expect(await waitForRequests(id, token, { waitMs: 1 })).toEqual({ error: "Not this diagram's view." });
    const asking = ask(id, { kind: 'read' }, { answerMs: 1000 });
    // Someone else answering a request they can't see, with a made-up id, is ignored
    expect(answerRequest(id, FORGED, crypto.randomUUID(), { from: 'someone else' })).toBe(false);
    expect(await asking).toEqual({ outcome: 'answered', answer: { from: 'view' } });
    view.close();
  });

  it('makes a token for each diagram that only the server can make', () => {
    const id = newDiagramId();
    expect(viewTokenFor(id)).toBe(viewTokenFor(id));
    expect(viewTokenFor(id)).toMatch(/^[0-9a-f]{64}$/);
    expect(viewTokenFor(newDiagramId())).not.toBe(viewTokenFor(id));
  });

  it('keeps to its cap on diagrams, even when every one has a view waiting', async () => {
    const first = newDiagramId();
    const waiting = waitForRequests(first, viewTokenFor(first), { waitMs: 200, maxChannels: 1 });
    // No room, and none to make room with: turned down, not added
    const second = newDiagramId();
    expect(await waitForRequests(second, viewTokenFor(second), { waitMs: 1, maxChannels: 1 })).toEqual({ error: 'Too many diagrams are open. Try again shortly.' });
    await waiting;
    // Once the first isn't waiting, it makes room
    expect('requests' in (await waitForRequests(second, viewTokenFor(second), { waitMs: 1, maxChannels: 1 }))).toBe(true);
  });

  it('carries each request to one of its views when it is open in more than one (the conversation opened twice)', async () => {
    const id = newDiagramId();
    const first = openView(id, () => ({ from: 'first' }));
    const second = openView(id, () => ({ from: 'second' }));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect((await ask(id, { kind: 'read' }, { answerMs: 1000 })).outcome).toBe('answered');
    expect(first.seen.length + second.seen.length).toBe(1);
    first.close();
    second.close();
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

  it("tells the agent when the open diagram couldn't make the changes, and that nothing was changed", async () => {
    const client = await connect();
    const id = newDiagramId();
    const view = openView(id, () => ({ error: 'The diagram is still opening.' }));
    await new Promise((resolve) => setTimeout(resolve, 10));
    const result = await client.callTool({ name: 'edit_diagram', arguments: { diagramId: id, changes: [{ op: 'set_title', title: 'x' }] } });
    expect(result.isError).toBe(true);
    expect(textOf(result).error).toContain('Nothing was changed');
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
    const rendered = await client.callTool({ name: 'render_architecture', arguments: { model } });
    const result = textOf(rendered);
    expect(result.diagramId).toMatch(DIAGRAM_ID);
    expect(result.next).toContain('edit_diagram');
    // Its views get its token, the model doesn't
    expect(JSON.stringify(rendered._meta)).toContain(viewTokenFor(result.diagramId));
    expect(JSON.stringify(rendered.content)).not.toContain(viewTokenFor(result.diagramId));
  });
});
