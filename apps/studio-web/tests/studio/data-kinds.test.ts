import { describe, expect, it } from 'vitest';
import { Model } from '@eventcatalog/visualiser/model';
import { canvasToModel, modelToCanvas } from '@eventcatalog/visualiser/studio';
import { componentKey, getNodeDefinition, nodeDefinitions } from '@eventcatalog/visualiser/studio';

const model = Model.parse({
  title: 'Data kinds',
  resources: [
    { id: 'orders', type: 'service', name: 'Orders' },
    { id: 'orders-db', type: 'container', name: 'Orders DB', technology: 'PostgreSQL' },
    { id: 'sessions', type: 'container', name: 'Sessions', containerType: 'cache', technology: 'Redis' },
  ],
  relations: [
    { from: 'orders', to: 'orders-db', kind: 'writes' },
    { from: 'orders', to: 'sessions', kind: 'reads' },
  ],
});

describe('kinds of data store', () => {
  it('are data nodes with their container type, kept from the model to the canvas and back', async () => {
    const content = await modelToCanvas(model);
    const node = (id: string) => content.nodes.find((n) => n.id === id)!;
    expect(node('sessions').type).toBe('data');
    expect((node('sessions').data.data as { container_type: string }).container_type).toBe('cache');
    expect((node('orders-db').data.data as { container_type: string }).container_type).toBe('database');

    const back = canvasToModel(content.nodes, content.edges, { 1: new Map(), 2: new Map() }, model);
    const resource = (id: string) => back.resources.find((r) => r.id === id)!;
    expect(resource('sessions').containerType).toBe('cache');
    // A database is the default: not written
    expect(resource('orders-db').containerType).toBeUndefined();
  });

  it('are each in the components list, under Data, making a data node of their kind', () => {
    const data = nodeDefinitions.filter((definition) => definition.category === 'data' && definition.type === 'data');
    expect(data.map((definition) => definition.label)).toEqual(['Database', 'Cache', 'Search index', 'Object store']);
    for (const definition of data) {
      const found = getNodeDefinition(componentKey(definition))!;
      expect(found.type).toBe('data');
      expect((found.createData().data as { container_type: string }).container_type).toBe(
        { Database: 'database', Cache: 'cache', 'Search index': 'searchIndex', 'Object store': 'objectStore' }[definition.label]
      );
    }
    // A data node's type still finds the database (e.g. for nodes already on canvases)
    expect(getNodeDefinition('data')!.label).toBe('Database');
  });
});
