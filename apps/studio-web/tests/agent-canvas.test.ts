import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import type { Node } from '@xyflow/react';
import { Model } from '@eventcatalog/visualiser/model';
import { addNodes, canvasToModel, getCanvasMaps, modelToCanvas } from '@eventcatalog/visualiser/studio';
import { applyChanges, type Changes } from '../src/model/changes';
import { agentCanvasFor, applyAgentCanvasToDoc, canvasIds } from '../view/studio/apply-agent-canvas';

const EVENTS = ['OrderPlaced', 'OrderCreated', 'OrderConfirmed'];
const orders = Model.parse({
  title: 'Orders',
  resources: [
    { id: 'order', type: 'domain', name: 'Order' },
    { id: 'ordering-service', type: 'service', name: 'Ordering Service', parent: 'order' },
    ...EVENTS.map((id) => ({ id, type: 'event', name: id })),
  ],
  relations: EVENTS.map((to) => ({ from: 'ordering-service', to, kind: 'sends' })),
  hotspots: [{ id: 'h1', title: 'No retries', resource: 'ordering-service' }],
});

/** A canvas showing `model`, as the view has it */
async function canvasOf(model: Model) {
  const doc = new Y.Doc();
  const content = await modelToCanvas(model);
  addNodes(doc, content.nodes, content.edges);
  content.hotspots?.forEach((hotspot) => getCanvasMaps(doc).hotspots.set(hotspot.id, hotspot));
  return doc;
}

/**
 * What the view does with an edit: the model as the canvas has it, the changes on it, and what changed written back.
 * `meanwhile` happens while it's laid out (someone else changing the canvas)
 */
async function edit(doc: Y.Doc, base: Model, changes: Changes, meanwhile?: () => void) {
  const { nodes, edges, hotspots } = getCanvasMaps(doc);
  const current = canvasToModel([...nodes.values()], [...edges.values()], { 1: new Map(), 2: new Map() }, base, [], [...hotspots.values()]);
  const before = canvasIds(doc);
  const { model, results } = applyChanges(current, changes);
  const target = await agentCanvasFor(current, model);
  meanwhile?.();
  return { results, model, ...doc.transact(() => applyAgentCanvasToDoc(doc, target, before)) };
}

const node = (doc: Y.Doc, id: string) => getCanvasMaps(doc).nodes.get(id) as Node | undefined;

describe("the agent's changes on the canvas", () => {
  it('adds a domain with a service in it, inside it, and leaves what was there where it was', async () => {
    const doc = await canvasOf(orders);
    const before = node(doc, 'ordering-service')!.position;

    const { results, added, removed } = await edit(doc, orders, [
      { op: 'add_resource', resource: { id: 'payments', type: 'domain', name: 'Payments' } },
      { op: 'add_resource', resource: { id: 'payment-service', type: 'service', name: 'Payment Service', parent: 'payments' } },
      ...EVENTS.map((to) => ({ op: 'add_relation' as const, relation: { from: 'payment-service', to, kind: 'receives' as const } })),
    ]);

    expect(results.every((result) => result.ok)).toBe(true);
    expect(added.sort()).toEqual(['payment-service', 'payments']);
    expect(removed).toEqual([]);
    const domain = node(doc, 'payments')!;
    const service = node(doc, 'payment-service')!;
    expect(service.parentId).toBe('payments');
    expect(service.position.x).toBeGreaterThanOrEqual(0);
    expect(service.position.x).toBeLessThan(domain.width!);
    expect(service.position.y).toBeLessThan(domain.height!);
    expect(node(doc, 'ordering-service')!.position).toEqual(before);
    // The new connections (receives through no channel: event -> service)
    expect([...getCanvasMaps(doc).edges.values()].filter((edge) => edge.target === 'payment-service')).toHaveLength(EVENTS.length);
  });

  it('renames in place, removes what goes (with its connections and hotspots), and turns down what would break the model', async () => {
    const doc = await canvasOf(orders);
    const { results, changed, removed } = await edit(doc, orders, [
      { op: 'update_resource', id: 'ordering-service', set: { name: 'Orders API' } },
      { op: 'remove_resource', id: 'OrderCreated' },
      { op: 'add_relation', relation: { from: 'OrderPlaced', to: 'ordering-service', kind: 'sends' } },
      { op: 'remove_hotspot', id: 'h1' },
    ]);

    expect(results.map((result) => result.ok)).toEqual([true, true, false, true]);
    expect(results[2].error).toBeTruthy();
    expect(changed).toContain('ordering-service');
    expect(removed).toEqual(['OrderCreated']);
    expect(JSON.stringify(node(doc, 'ordering-service')!.data)).toContain('Orders API');
    expect(node(doc, 'OrderCreated')).toBeUndefined();
    expect([...getCanvasMaps(doc).edges.values()].some((edge) => edge.target === 'OrderCreated' || edge.source === 'OrderCreated')).toBe(false);
    expect(getCanvasMaps(doc).hotspots.has('h1')).toBe(false);
  });

  it('keeps what someone else adds while the edit is laid out, and still takes off what the edit removes', async () => {
    const doc = await canvasOf(orders);
    const { removed } = await edit(doc, orders, [{ op: 'remove_resource', id: 'OrderCreated' }, { op: 'remove_hotspot', id: 'h1' }], () => {
      // The user (or someone in a live session) adds a service, a connection and a hotspot meanwhile
      const service = { ...node(doc, 'ordering-service')!, id: 'their-service', parentId: undefined, position: { x: 2000, y: 0 } };
      addNodes(doc, [service], [{ id: 'their-edge', source: 'their-service', target: 'OrderPlaced' }]);
      getCanvasMaps(doc).hotspots.set('theirs', { id: 'theirs', title: 'Theirs', resource: 'their-service', createdAt: 0 } as never);
    });
    expect(removed).toEqual(['OrderCreated']);
    expect(node(doc, 'their-service')).toBeDefined();
    expect(getCanvasMaps(doc).edges.has('their-edge')).toBe(true);
    expect(getCanvasMaps(doc).hotspots.has('theirs')).toBe(true);
    expect(getCanvasMaps(doc).hotspots.has('h1')).toBe(false);
  });

  it('removes the notes about a resource with it, and keeps the others', async () => {
    const doc = await canvasOf({
      ...orders,
      notes: [
        { text: 'Retries three times', resource: 'OrderCreated' },
        { text: 'The main flow', resource: 'ordering-service' },
      ],
    });
    const { model } = await edit(doc, orders, [{ op: 'remove_resource', id: 'OrderCreated' }]);
    const texts = [...getCanvasMaps(doc).nodes.values()].filter((node) => node.type === 'note').map((node) => node.data.text);
    expect(texts).toEqual(['The main flow']);
    expect(model.notes?.map((note) => note.text)).toEqual(['The main flow']);
  });

  it('takes a service out of its domain to where it can be seen, and drops a field taken off it from its node', async () => {
    const doc = await canvasOf(Model.parse({ ...orders, resources: orders.resources.map((r) => (r.id === 'ordering-service' ? { ...r, summary: 'Takes orders.' } : r)) }));
    expect(JSON.stringify(node(doc, 'ordering-service')!.data)).toContain('Takes orders.');
    const { results, changed } = await edit(doc, orders, [{ op: 'update_resource', id: 'ordering-service', unset: ['parent', 'summary'] }]);
    expect(results[0].ok).toBe(true);
    expect(changed).toEqual(['ordering-service']);
    const service = node(doc, 'ordering-service')!;
    expect(service.parentId).toBeUndefined();
    expect(JSON.stringify(service.data)).not.toContain('Takes orders.');
    // Placed again on the canvas, not where it was inside the domain (that place was relative to the domain)
    const domain = node(doc, 'order')!;
    const inDomain = service.position.x >= domain.position.x && service.position.x < domain.position.x + (domain.width ?? 0) && service.position.y >= domain.position.y && service.position.y < domain.position.y + (domain.height ?? 0);
    expect(inDomain).toBe(false);
  });

  it('writes nothing when nothing changes', async () => {
    const doc = await canvasOf(orders);
    let writes = 0;
    doc.on('update', () => writes++);
    const { added, changed, removed } = await edit(doc, orders, [{ op: 'set_title', title: 'Orders' }]);
    expect({ added, changed, removed }).toEqual({ added: [], changed: [], removed: [] });
    expect(writes).toBe(0);
  });
});
