import { describe, expect, it } from 'vitest';
import fixture from './fixtures/orders-model.json';
import { Model } from '@eventcatalog/visualiser/model';
import { canvasToModel, modelToCanvas } from '@eventcatalog/visualiser/studio';
import { designChanges, syncMessage } from '../view/sync';

const model = Model.parse(fixture);

describe('Sync to agent', () => {
  it('finds nothing to send when the design is the same', () => {
    expect(designChanges(model, structuredClone(model))).toEqual([]);
  });

  it('finds nothing to send for the agent’s own diagram, once it’s on the canvas', async () => {
    const content = await modelToCanvas(model);
    const onCanvas = canvasToModel(content.nodes, content.edges, { 1: new Map(), 2: new Map() }, model);
    expect(designChanges(model, onCanvas)).toEqual([]);
  });

  it('ignores where things are and how they are drawn', () => {
    const moved = { ...model, layout: { messages: { 'orders-service': { x: 400, y: 120 } } }, resources: model.resources.map((r) => ({ ...r, evidence: 'elsewhere.ts:1' })) } as Model;
    expect(designChanges(model, moved)).toEqual([]);
  });

  it('lists resources added, removed, renamed and changed', () => {
    const after: Model = {
      ...model,
      resources: [
        ...model.resources
          .filter((r) => r.id !== 'billing-service')
          .map((r) => (r.id === 'orders-service' ? { ...r, name: 'Order Service' } : r.id === 'payment-service' ? { ...r, summary: 'Takes card payments', technology: 'Lambda' } : r)),
        { id: 'refunds', type: 'service', name: 'Refunds', parent: 'payments', summary: 'Pays customers back' },
      ],
      relations: model.relations.filter((r) => r.from !== 'billing-service' && r.to !== 'billing-service'),
    };
    const changes = designChanges(model, after);
    expect(changes).toContain('Added service "Refunds" (in "Payments"): Pays customers back');
    expect(changes).toContain('Removed service "Billing Service"');
    expect(changes).toContain('Renamed service "Orders Service" to "Order Service"');
    expect(changes).toContain('Changed the summary, technology of service "Payment Service"');
  });

  it('leaves out the summary the palette starts a new node with', () => {
    const after: Model = { ...model, resources: [...model.resources, { id: 'new', type: 'service', name: 'New Service', summary: 'Describe what this service does.' }] };
    expect(designChanges(model, after)).toEqual(['Added service "New Service"']);
  });

  it('lists connections made and taken away, by name', () => {
    const after: Model = {
      ...model,
      relations: [...model.relations.filter((r) => !(r.from === 'orders-service' && r.to === 'OrderPlaced')), { from: 'inventory-service', to: 'PaymentProcessed', kind: 'receives' }],
    };
    expect(designChanges(model, after)).toEqual([
      'Connected "Inventory Service" → "Payment Processed" (receives)',
      'Disconnected "Orders Service" → "Order Placed" (sends)',
    ]);
  });

  it('lists notes and text written and removed', () => {
    const before: Model = { ...model, notes: [{ text: 'Old idea' }] };
    const after: Model = { ...model, notes: [{ text: 'Retry payments', resource: 'payment-service' }, { text: 'Food Ordering', kind: 'text' }] };
    expect(designChanges(before, after)).toEqual([
      'Wrote a note on "Payment Service": "Retry payments"',
      'Wrote text: "Food Ordering"',
      'Removed a note: "Old idea"',
    ]);
  });

  it('asks the agent to make the changes in the code, listing at most 30', () => {
    const message = syncMessage(Array.from({ length: 32 }, (_, index) => `Change ${index + 1}`));
    expect(message).toContain('- Change 30');
    expect(message).not.toContain('- Change 31');
    expect(message).toContain('…and 2 more');
    expect(message).toContain('Make these changes in the code');
  });
});
