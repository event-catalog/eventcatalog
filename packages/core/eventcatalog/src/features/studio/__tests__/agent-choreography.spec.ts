import { describe, it, expect, vi } from 'vitest';
import * as Y from 'yjs';
import { addNodes, getCanvasMaps, readMeta, getAbsolutePosition, type LayoutResult } from '@eventcatalog/visualiser/studio';
import { applyLayout, playAddToCanvas, playMoveNode, type AgentPresence, type AgentStage } from '../agent-choreography';
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

  /**
   * Plays an addToCanvas on a canvas, and what's on it after. On real timers (laying out a domain's contents doesn't
   * finish on fake ones), with an agent working as fast as it can.
   */
  const add = async (input: Parameters<typeof playAddToCanvas>[1], doc = new Y.Doc()) => {
    const shown: AgentPresence[] = [];
    const stage: AgentStage = {
      change: (fn) => fn(doc),
      present: (presence) => shown.push(presence),
      sharesMoves: true,
      pace: 0.01,
    };
    const result = await playAddToCanvas(stage, input, catalog);
    const nodes = new Map(getCanvasMaps(doc).nodes.entries());
    const keyOf = (id: string) => (nodes.get(id)?.data.catalog as { key?: string } | undefined)?.key;
    const edges = [...getCanvasMaps(doc).edges.values()].map((edge) => `${keyOf(edge.source)} > ${keyOf(edge.target)}`);
    return { result, nodes, keyOf, edges, shown };
  };

  it('adds a catalog domain with everything it holds, connected, as one drop', async () => {
    const { result, nodes, keyOf, edges } = await add({
      nodes: [{ resource: { collection: 'domains', id: 'Orders' }, contents: true }],
    });

    expect(result.errors).toEqual([]);
    const byKey = new Map([...nodes.values()].map((node) => [keyOf(node.id), node]));
    expect([...byKey.keys()].sort()).toEqual([
      'containers:OrdersDb',
      'domains:Orders',
      'events:OrderPlaced',
      'services:Billing',
      'services:OrderService',
      'systems:Checkout',
    ]);
    // Its system is a container in it, holding its service and the service's data store
    const domain = byKey.get('domains:Orders')!;
    const system = byKey.get('systems:Checkout')!;
    expect(domain.type).toBe('domain-group');
    expect(system.parentId).toBe(domain.id);
    expect(byKey.get('services:OrderService')!.parentId).toBe(system.id);
    expect(byKey.get('containers:OrdersDb')!.parentId).toBe(system.id);
    expect(edges.sort()).toEqual([
      'events:OrderPlaced > services:Billing',
      'services:OrderService > containers:OrdersDb',
      'services:OrderService > events:OrderPlaced',
    ]);
    expect(result.created).toHaveLength(6);
    expect(result.connections).toHaveLength(3);
  });

  it('selects just the domain it drops, and nothing once it is done', async () => {
    const { nodes, keyOf, shown } = await add({ nodes: [{ resource: { collection: 'domains', id: 'Orders' }, contents: true }] });

    const domain = [...nodes.values()].find((node) => keyOf(node.id) === 'domains:Orders')!;
    const selections = shown.map((presence) => presence.selection).filter((selection) => selection.length > 0);
    expect(selections.every((selection) => selection.length === 1 && selection[0] === domain.id)).toBe(true);
    expect(shown.at(-1)!.selection).toEqual([]);
  });

  it("puts a domain with its contents beside what's on the canvas, moving nothing", async () => {
    const doc = new Y.Doc();
    addNodes(doc, [
      { id: 'shipping', type: 'service', position: { x: 0, y: 0 }, data: { catalog: { key: 'services:Shipping' } } },
    ]);
    const { nodes, keyOf, edges } = await add(
      { nodes: [{ resource: { collection: 'domains', id: 'Orders' }, contents: true }] },
      doc
    );

    expect(nodes.get('shipping')!.position).toEqual({ x: 0, y: 0 });
    const domain = [...nodes.values()].find((node) => keyOf(node.id) === 'domains:Orders')!;
    const { width = 0, height = 0 } = domain;
    // Clear of the service already there
    const overlaps =
      domain.position.x < 240 && domain.position.x + width > 0 && domain.position.y < 110 && domain.position.y + height > 0;
    expect(overlaps).toBe(false);
    // and connected to it
    expect(edges).toContain('events:OrderPlaced > services:Shipping');
  });

  it('brings what a catalog service connects to, placed around it and connected', async () => {
    const { result, nodes, keyOf, edges } = await add({
      nodes: [{ resource: { collection: 'services', id: 'OrderService' }, connections: ['sends', 'dataStores'] }],
    });

    expect(result.errors).toEqual([]);
    expect([...nodes.keys()].map(keyOf).sort()).toEqual(['containers:OrdersDb', 'events:OrderPlaced', 'services:OrderService']);
    expect(edges.sort()).toEqual(['services:OrderService > containers:OrdersDb', 'services:OrderService > events:OrderPlaced']);
  });

  it('only brings the connections asked for, and nothing already on the canvas', async () => {
    const { nodes, keyOf } = await add({
      nodes: [
        { resource: { collection: 'events', id: 'OrderPlaced' }, connections: ['receivers'] },
        { resource: { collection: 'services', id: 'Billing' } },
      ],
    });

    expect([...nodes.keys()].map(keyOf).sort()).toEqual(['events:OrderPlaced', 'services:Billing', 'services:Shipping']);
  });

  it('adds each resource once when a domain with its contents is added with other resources in the same call', async () => {
    const { result, nodes, keyOf } = await add({
      nodes: [
        { resource: { collection: 'services', id: 'OrderService' }, connections: ['sends'] },
        { resource: { collection: 'domains', id: 'Orders' }, contents: true },
      ],
    });

    expect(result.errors).toEqual([]);
    const keys = [...nodes.keys()].map(keyOf).sort();
    expect(keys).toEqual([...new Set(keys)]);
    expect(keys).toEqual([
      'domains:Orders',
      'events:OrderPlaced',
      'services:Billing',
      'services:OrderService',
      'systems:Checkout',
    ]);
  });

  it('says contents are only for domains and systems, and adds the resource on its own', async () => {
    const { result, nodes } = await add({ nodes: [{ resource: { collection: 'services', id: 'Billing' }, contents: true }] });

    expect(result.errors).toEqual(['Only domains and systems have contents: "Billing Service" was added on its own']);
    expect(nodes.size).toBe(1);
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

describe("An agent's pace", () => {
  /** How long the agent takes to move a node, in (fake) milliseconds */
  const timeToMove = async (pace?: number) => {
    vi.useFakeTimers();
    const doc = setup();
    const stage: AgentStage = { change: (fn) => fn(doc), present: () => {}, sharesMoves: true, pace };
    const started = Date.now();
    const playing = playMoveNode(stage, 'svc', { x: 400, y: 200 });
    await vi.runAllTimersAsync();
    await playing;
    const took = Date.now() - started;
    vi.useRealTimers();
    expect(getCanvasMaps(doc).nodes.get('svc')).toMatchObject({ position: { x: 400, y: 200 } });
    return took;
  };

  it('works faster with a lower pace (the assistant), ending in the same place', async () => {
    const personPace = await timeToMove();
    const assistantPace = await timeToMove(0.3);
    expect(assistantPace).toBeLessThan(personPace * 0.5);
  });
});
