import { describe, expect, it } from 'vitest';
import { Model } from '@eventcatalog/visualiser/model';
import { canvasToModel, modelToCanvas } from '@eventcatalog/visualiser/studio';

const model = Model.parse({
  title: 'Summaries',
  resources: [
    { id: 'sales', type: 'domain', name: 'Sales', summary: 'Selling to customers' },
    { id: 'ordering', type: 'system', name: 'Ordering', parent: 'sales', summary: 'Places orders' },
    { id: 'orders', type: 'service', name: 'Orders', parent: 'ordering', summary: 'Takes orders' },
  ],
  relations: [],
});

describe('summaries', () => {
  it('are kept from the model to the canvas and back, for domains and systems drawn as boxes too', async () => {
    const content = await modelToCanvas(model);
    const back = canvasToModel(content.nodes, content.edges, { 1: new Map(), 2: new Map() }, model);
    const summary = (id: string) => back.resources.find((r) => r.id === id)?.summary;
    expect(summary('sales')).toBe('Selling to customers');
    expect(summary('ordering')).toBe('Places orders');
    expect(summary('orders')).toBe('Takes orders');
  });
});
