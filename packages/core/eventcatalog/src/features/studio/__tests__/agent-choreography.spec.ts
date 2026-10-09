import { describe, it, expect, vi } from 'vitest';
import * as Y from 'yjs';
import { addNodes, getCanvasMaps, readMeta } from '../canvas-doc';
import { applyLayout, playAddToCanvas, playMoveNode, type AgentPresence, type AgentStage } from '../agent-choreography';
import { getAbsolutePosition } from '../grouping';
import type { LayoutResult } from '../layout';
import { catalog } from './catalog-fixture';

const setup = () => {
  const doc = new Y.Doc();
  addNodes(doc, [
    { id: 'svc', type: 'service', position: { x: 0, y: 0 }, data: {} },
    { id: 'group', type: 'domain-group', position: { x: 0, y: 0 }, width: 720, height: 460, data: {} },
    { id: 'child', type: 'service', position: { x: 40, y: 80 }, parentId: 'group', data: {} },
  ]);
  return doc;
};

const layout: LayoutResult = {
  nodes: new Map([
    ['svc', { position: { x: 900, y: 50 } }],
    ['group', { position: { x: 10, y: 20 }, size: { width: 400, height: 300 } }],
    ['child', { position: { x: 60, y: 100 } }],
  ]),
  routes: new Map(),
};

describe('applyLayout', () => {
  it('moves nodes, resizes containers that have a size, and marks when it happened', () => {
    const doc = setup();
    const before = Date.now();

    applyLayout(doc, layout);

    const { nodes } = getCanvasMaps(doc);
    expect(nodes.get('svc')).toMatchObject({ position: { x: 900, y: 50 } });
    expect(nodes.get('svc')).not.toHaveProperty('width');
    expect(nodes.get('group')).toMatchObject({ position: { x: 10, y: 20 }, width: 400, height: 300 });
    expect(nodes.get('child')).toMatchObject({ position: { x: 60, y: 100 }, parentId: 'group' });
    expect(readMeta(doc).layoutAt).toBeGreaterThanOrEqual(before);
  });

  it('makes every change in one transaction (one update for everyone)', () => {
    const doc = setup();
    let transactions = 0;
    let updates = 0;
    doc.on('afterTransaction', () => transactions++);
    doc.on('update', () => updates++);

    applyLayout(doc, layout);

    expect(transactions).toBe(1);
    expect(updates).toBe(1);
  });

  it("routes the connections it laid out, and drops other connections' old routes", () => {
    const doc = setup();
    const { edges } = getCanvasMaps(doc);
    const route = {
      points: [
        { x: 1, y: 2 },
        { x: 3, y: 2 },
      ],
      source: { x: 0, y: 0 },
      target: { x: 4, y: 0 },
    };
    edges.set('routed', { id: 'routed', source: 'svc', target: 'child', data: { message: { collection: 'events' } } });
    edges.set('stale', { id: 'stale', source: 'child', target: 'svc', data: { route } });

    applyLayout(doc, { ...layout, routes: new Map([['routed', route]]) });

    expect(edges.get('routed')?.data).toEqual({ message: { collection: 'events' }, route });
    expect(edges.get('stale')?.data).toEqual({});
  });

  it('ignores nodes in the layout that are no longer on the canvas', () => {
    const doc = setup();
    applyLayout(doc, {
      nodes: new Map([['gone', { position: { x: 1, y: 1 }, size: { width: 1, height: 1 } }]]),
      routes: new Map(),
    });
    expect(getCanvasMaps(doc).nodes.has('gone')).toBe(false);
    expect(readMeta(doc).layoutAt).toBeTypeOf('number');
  });
});

describe('playAddToCanvas', () => {
  it('drops each node where it was planned on the canvas, even when its container grows left to fit it', async () => {
    vi.useFakeTimers();
    const doc = setup();
    const stage: AgentStage = { change: (fn) => fn(doc), present: () => {} };

    const playing = playAddToCanvas(
      stage,
      {
        nodes: [{ ref: 'gateway', type: 'service', name: 'Gateway', inside: 'group' }],
        edges: [{ from: 'gateway', to: 'child' }],
      },
      catalog
    );
    await vi.runAllTimersAsync();
    const { created, errors } = await playing;
    vi.useRealTimers();

    expect(errors).toEqual([]);
    const nodes = new Map(getCanvasMaps(doc).nodes.entries());
    const gateway = nodes.get(created[0].nodeId)!;
    // The service in the container hasn't moved on the canvas, and the gateway is on its left, lined up with it
    expect(getAbsolutePosition(nodes.get('child')!, nodes)).toEqual({ x: 40, y: 80 });
    expect(gateway.parentId).toBe('group');
    expect(getAbsolutePosition(gateway, nodes)).toEqual({ x: 40 - 200 - 240, y: 80 });
    expect(nodes.get('group')!.position.x).toBeLessThan(0);
  });
});

describe('playMoveNode', () => {
  const play = async (sharesMoves: boolean) => {
    vi.useFakeTimers();
    const doc = setup();
    const shown: AgentPresence[] = [];
    let updates = 0;
    doc.on('update', () => updates++);
    const stage: AgentStage = { change: (fn) => fn(doc), present: (presence) => shown.push(presence), sharesMoves };

    const playing = playMoveNode(stage, 'svc', { x: 400, y: 200 });
    await vi.runAllTimersAsync();
    await playing;
    vi.useRealTimers();
    return { doc, shown, updates };
  };

  it('carries the node in its presence when everyone sees it, and saves only where it ends up', async () => {
    const { doc, shown, updates } = await play(true);

    expect(updates).toBe(1);
    expect(getCanvasMaps(doc).nodes.get('svc')).toMatchObject({ position: { x: 400, y: 200 } });
    const carried = shown.filter((presence) => presence.moving?.svc);
    expect(carried.length).toBeGreaterThan(1);
    expect(carried.at(-1)!.moving!.svc.x).toBeCloseTo(400);
    expect(carried.at(-1)!.moving!.svc.y).toBeCloseTo(200);
    // Let go once it's saved
    expect(shown.at(-1)!.moving).toBeNull();
  });

  it('saves each step of the move when its presence is only seen here', async () => {
    const { doc, shown, updates } = await play(false);

    expect(updates).toBeGreaterThan(1);
    expect(getCanvasMaps(doc).nodes.get('svc')).toMatchObject({ position: { x: 400, y: 200 } });
    expect(shown.some((presence) => presence.moving)).toBe(false);
  });
});
