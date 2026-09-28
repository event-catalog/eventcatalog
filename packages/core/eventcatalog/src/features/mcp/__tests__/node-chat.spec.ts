import { describe, expect, it } from 'vitest';
import type { Node } from '@xyflow/react';
import { describeNode, describeNodeForModel } from '../apps/architecture-diagram/node-chat';

const node = (type: string, data: Record<string, unknown>, id = 'node-id') =>
  ({ id, type, position: { x: 0, y: 0 }, data }) as Node;

describe('describing a clicked diagram node for the conversation', () => {
  it('describes a service by its catalog id, name and version', () => {
    const service = node('services', { service: { id: 'order-service', name: 'Order Service', version: '1.0.0' } });

    expect(describeNode(service)).toEqual({
      nodeId: 'node-id',
      type: 'Service',
      id: 'order-service',
      name: 'Order Service',
      version: '1.0.0',
      diagram: { collection: 'services', id: 'order-service', version: '1.0.0' },
    });
  });

  it('describes a message whose catalog entry is nested in its data', () => {
    const event = node('events', { message: { data: { id: 'order-created', name: 'Order Created', version: '2.0.0' } } });

    expect(describeNode(event)).toEqual({
      nodeId: 'node-id',
      type: 'Event',
      id: 'order-created',
      name: 'Order Created',
      version: '2.0.0',
      diagram: { collection: 'events', id: 'order-created', version: '2.0.0' },
    });
  });

  it('describes another domain and a system boundary shown on a domain diagram', () => {
    const domain = node('context-domain', { domain: { id: 'payments', name: 'Payments', version: '1.0.0' } });
    const system = node('system-group', { system: { name: 'Checkout System', version: '1.0.0' } }, 'system-group-checkout');

    expect(describeNode(domain)).toEqual({
      nodeId: 'node-id',
      type: 'Domain',
      id: 'payments',
      name: 'Payments',
      version: '1.0.0',
      diagram: { collection: 'domains', id: 'payments', version: '1.0.0' },
    });
    expect(describeNode(system)).toEqual(expect.objectContaining({ type: 'System', name: 'Checkout System' }));
  });

  it('describes an actor by its name', () => {
    expect(describeNode(node('context-actor', { name: 'Shopper' }, 'actor-shopper'))).toEqual(
      expect.objectContaining({ type: 'Actor', name: 'Shopper' })
    );
  });

  it('tells the model which resource to look up in EventCatalog', () => {
    expect(describeNodeForModel({ type: 'Service', id: 'order-service', name: 'Order Service', version: '1.0.0' })).toBe(
      'the service "Order Service" (id: order-service, version: 1.0.0)'
    );
  });

  it('describes domain and system boundaries by their catalog id, which is only in the node id', () => {
    const domain = node('domain-group', { domain: { name: 'Ordering', version: '1.0.0' } }, 'domain-group-ordering-1.0.0');
    const system = node(
      'system-group',
      { system: { name: 'Checkout System', version: '1.0.0' } },
      'system-group-checkout-system-1.0.0'
    );

    expect(describeNode(domain)).toEqual(
      expect.objectContaining({ id: 'ordering', diagram: { collection: 'domains', id: 'ordering', version: '1.0.0' } })
    );
    expect(describeNode(system)).toEqual(
      expect.objectContaining({
        id: 'checkout-system',
        diagram: { collection: 'systems', id: 'checkout-system', version: '1.0.0' },
      })
    );
  });

  it('only offers to open a diagram for resources that have one', () => {
    expect(describeNode(node('context-actor', { name: 'Shopper' }, 'actor-shopper')).diagram).toBeUndefined();
    expect(
      describeNode(node('channels', { channel: { id: 'order-events', name: 'Order Events', version: '1.0.0' } })).diagram
    ).toBeUndefined();
  });

  it('describes custom flow steps and actors by the title and name they show', () => {
    const customStep = node(
      'custom',
      {
        custom: { title: 'Order Confirmed', summary: 'The customer sees their order is confirmed' },
        step: { title: 'Order Confirmed' },
      },
      'step-order_confirmed'
    );
    const actor = node('actor', { name: 'Shopper', step: { title: 'Shopper checks out' } }, 'step-shopper_checks_out');

    expect(describeNode(customStep)).toEqual(
      expect.objectContaining({ type: 'Step', name: 'Order Confirmed', summary: 'The customer sees their order is confirmed' })
    );
    expect(describeNode(actor)).toEqual(expect.objectContaining({ type: 'Actor', name: 'Shopper' }));
  });
});
