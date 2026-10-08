import { describe, expect, it } from 'vitest';
import { getChannelConnections } from '@utils/collections/channels';

const entry = (collection: string, id: string, version = '1.0.0', data: Record<string, unknown> = {}) =>
  ({ collection, data: { id, version, ...data } }) as any;

const orderEvents = entry('channels', 'order-events');
const orderEventsV2 = entry('channels', 'order-events', '2.0.0');
const orderCreated = entry('events', 'order-created');
const orderCancelled = entry('events', 'order-cancelled');
const createOrder = entry('commands', 'create-order');
const catalog = {
  channels: [orderEvents, orderEventsV2],
  messages: [orderCreated, orderCancelled, createOrder],
};

const service = (id: string, sends: any[] = [], receives: any[] = []) => entry('services', id, '1.0.0', { sends, receives });

describe('getChannelConnections', () => {
  it('finds the services that send to and receive from the channel, and the messages they move through it', () => {
    const orderService = service('order-service', [{ id: 'order-created', to: [{ id: 'order-events', version: '1.0.0' }] }]);
    const shippingService = service(
      'shipping-service',
      [],
      [{ id: 'order-created', from: [{ id: 'order-events', version: '1.0.0' }] }]
    );
    const unrelated = service('billing-service', [{ id: 'order-cancelled' }]);

    const connections = getChannelConnections(orderEvents, { ...catalog, endpoints: [orderService, shippingService, unrelated] });

    expect(connections.producers).toEqual([orderService]);
    expect(connections.consumers).toEqual([shippingService]);
    expect(connections.messages).toEqual([orderCreated]);
  });

  it('treats a channel pointer without a version as the latest channel', () => {
    const orderService = service('order-service', [{ id: 'order-created', to: [{ id: 'order-events' }] }]);

    expect(getChannelConnections(orderEvents, { ...catalog, endpoints: [orderService] }).producers).toEqual([]);
    expect(getChannelConnections(orderEventsV2, { ...catalog, endpoints: [orderService] }).producers).toEqual([orderService]);
  });

  it('includes messages that list the channel themselves', () => {
    const channel = entry('channels', 'order-events', '1.0.0', {
      messages: [{ id: 'order-cancelled', version: '1.0.0', collection: 'events' }],
    });

    expect(getChannelConnections(channel, { ...catalog, endpoints: [] }).messages).toEqual([orderCancelled]);
  });

  it('lists each service and message once', () => {
    const orderService = service(
      'order-service',
      [
        { id: 'order-created', to: [{ id: 'order-events', version: '1.0.0' }] },
        { id: 'create-order', to: [{ id: 'order-events', version: '1.0.0' }] },
      ],
      [{ id: 'order-created', from: [{ id: 'order-events', version: '1.0.0' }] }]
    );

    const connections = getChannelConnections(orderEvents, { ...catalog, endpoints: [orderService] });

    expect(connections.producers).toEqual([orderService]);
    expect(connections.consumers).toEqual([orderService]);
    expect(connections.messages).toEqual([orderCreated, createOrder]);
  });

  it('counts agents that send to or receive from the channel', () => {
    const fraudAgent = entry('agents', 'fraud-agent', '1.0.0', {
      receives: [{ id: 'order-created', from: [{ id: 'order-events', version: '1.0.0' }] }],
    });

    const connections = getChannelConnections(orderEvents, { ...catalog, endpoints: [fraudAgent] });

    expect(connections.consumers).toEqual([fraudAgent]);
    expect(connections.messages).toEqual([orderCreated]);
  });
});
