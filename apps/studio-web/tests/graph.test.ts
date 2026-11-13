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

  it("doesn't say which channels the messages between systems go through on L1 (like the catalog's L1)", async () => {
    // A channel carrying both systems' events sits between them, outside both
    const withSharedChannel = Model.parse({
      ...fixture,
      resources: [...fixture.resources, { id: 'shared-bus', type: 'channel', name: 'shared-bus', technology: 'Kafka' }],
      relations: [
        ...fixture.relations,
        { from: 'OrderPlaced', to: 'shared-bus', kind: 'routes-through' },
        { from: 'PaymentProcessed', to: 'shared-bus', kind: 'routes-through' },
      ],
    });
    const graph = await buildArchitectureGraph(withSharedChannel);

    expect(graph.overview?.edges.map((e) => String(e.label ?? '')).filter((label) => label.includes('via'))).toEqual([]);
    // L2 still says it
    expect(graph.hiddenMessages.edges.some((e) => String(e.label ?? '').includes('via shared-bus'))).toBe(true);
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

  it('places a command with the agent receiving it', () => {
    // The Orders service (Ordering) asks the Refund agent (Payments) to review a refund
    const withAgent = Model.parse({
      ...fixture,
      resources: [
        ...fixture.resources,
        { id: 'refund-agent', type: 'agent', name: 'Refund Agent', parent: 'payments' },
        { id: 'ReviewRefund', type: 'command', name: 'Review Refund' },
      ],
      relations: [
        ...fixture.relations,
        { from: 'orders-service', to: 'ReviewRefund', kind: 'sends' },
        { from: 'refund-agent', to: 'ReviewRefund', kind: 'receives' },
      ],
    });
    const parentOf = new Map(buildDetailedGraph(withAgent).nodes.map((n) => [n.id, n.parentId]));

    expect(parentOf.get('ReviewRefund')).toBe(nodeIdFor({ id: 'payments', type: 'system' }));
  });
});
