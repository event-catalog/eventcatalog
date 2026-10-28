import { describe, expect, it } from 'vitest';
import fixture from './fixtures/orders-model.json';
import { Model, validateModel } from '@eventcatalog/visualiser/model';
import { buildArchitectureGraph, buildDetailedGraph, nodeIdFor } from '../src/model/to-graph';

const model = Model.parse(fixture);

describe('orders fixture', () => {
  it('is valid', () => {
    expect(validateModel(model).errors).toEqual([]);
  });

  it('builds and lays out three levels', async () => {
    const graph = await buildArchitectureGraph(model, 'orders-service');
    expect(graph.overview?.nodes.length).toBeGreaterThan(0);
    expect(graph.nodes.every((n) => typeof n.position?.x === 'number')).toBe(true);
  });

  it('places an event with its sender, and a command and its channel with their receiver', () => {
    // The Orders service (Ordering) sends ProcessPayment through a queue to the Payment service (Payments)
    const withCommand = Model.parse({
      ...fixture,
      resources: [
        ...fixture.resources,
        { id: 'ProcessPayment', type: 'command', name: 'Process Payment' },
        { id: 'payments-queue', type: 'channel', name: 'payments-queue' },
      ],
      relations: [
        ...fixture.relations,
        { from: 'orders-service', to: 'ProcessPayment', kind: 'sends' },
        { from: 'ProcessPayment', to: 'payments-queue', kind: 'routes-through' },
        { from: 'payment-service', to: 'ProcessPayment', kind: 'receives' },
      ],
    });
    const parentOf = new Map(buildDetailedGraph(withCommand).nodes.map((n) => [n.id, n.parentId]));

    expect(parentOf.get('OrderPlaced')).toBe(nodeIdFor({ id: 'ordering', type: 'system' }));
    expect(parentOf.get('ProcessPayment')).toBe(nodeIdFor({ id: 'payments', type: 'system' }));
    expect(parentOf.get('payments-queue')).toBe(nodeIdFor({ id: 'payments', type: 'system' }));
  });
});
