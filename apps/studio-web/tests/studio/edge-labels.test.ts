import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { Model } from '@eventcatalog/visualiser/model';
import { canvasToModel, modelToCanvas } from '@eventcatalog/visualiser/studio';
import { addNodes, getCanvasMaps, setEdgeLabel } from '@eventcatalog/visualiser/studio';

const model = Model.parse({
  title: 'Labels',
  resources: [
    { id: 'orders', type: 'service', name: 'Orders' },
    { id: 'OrderPlaced', type: 'event', name: 'OrderPlaced' },
    { id: 'db', type: 'container', name: 'Orders DB' },
  ],
  relations: [
    { from: 'orders', to: 'OrderPlaced', kind: 'sends', label: 'publishes on checkout' },
    { from: 'orders', to: 'db', kind: 'writes' },
  ],
});
const layouts = { 1: new Map(), 2: new Map() };

describe('what connections say', () => {
  it('is what was written on them, from the model to the canvas and back', async () => {
    const content = await modelToCanvas(model);
    const sends = content.edges.find((edge) => edge.source === 'orders' && edge.target === 'OrderPlaced')!;
    expect(sends.label).toBe('publishes on checkout');
    const back = canvasToModel(content.nodes, content.edges, layouts, model);
    expect(back.relations.find((r) => r.kind === 'sends')?.label).toBe('publishes on checkout');
    // Nothing written: EventCatalog's wording, not kept in the model
    expect(back.relations.find((r) => r.kind === 'writes')?.label).toBeUndefined();
  });

  it('can be written on any connection, and cleared back to the usual wording', async () => {
    const content = await modelToCanvas(model);
    const doc = new Y.Doc();
    addNodes(doc, content.nodes, content.edges);
    const writes = content.edges.find((edge) => edge.target === 'db')!;
    setEdgeLabel(doc, writes.id, 'every order, in one transaction');
    let edges = Array.from(getCanvasMaps(doc).edges.values());
    expect(canvasToModel(content.nodes, edges, layouts, model).relations.find((r) => r.kind === 'writes')?.label).toBe('every order, in one transaction');

    setEdgeLabel(doc, writes.id, undefined);
    edges = Array.from(getCanvasMaps(doc).edges.values());
    expect(edges.find((edge) => edge.id === writes.id)?.label).toBe(writes.label);
    expect(canvasToModel(content.nodes, edges, layouts, model).relations.find((r) => r.kind === 'writes')?.label).toBeUndefined();
  });
});
