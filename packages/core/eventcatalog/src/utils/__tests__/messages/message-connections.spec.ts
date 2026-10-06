import { describe, expect, it } from 'vitest';
import { getMessageConnections } from '@utils/collections/message-connections';

const entry = (collection: string, id: string, version = '1.0.0', data: Record<string, unknown> = {}) =>
  ({ collection, data: { id, name: id, version, latestVersion: version, ...data } }) as any;

const orderCreated = entry('events', 'order-created');
const reserveStock = entry('commands', 'reserve-stock');
const checkoutCart = entry('commands', 'checkout-cart');
const orderEvents = entry('channels', 'order-events');
const auditChannel = entry('channels', 'audit');
const placeOrder = entry('flows', 'place-order', '1.0.0', {
  steps: [{ id: 1, title: 'Order created', message: [orderCreated] }],
});
const refund = entry('flows', 'refund', '1.0.0', { steps: [{ id: 1, title: 'Refund', message: [checkoutCart] }] });

const catalog = (receivers: any[] = []) => ({
  receivers,
  messages: [orderCreated, reserveStock, checkoutCart],
  channels: [orderEvents, auditChannel],
  flows: [placeOrder, refund],
});

describe('getMessageConnections', () => {
  it('finds the channels a service sends or receives the message on', () => {
    const orderService = entry('services', 'order-service', '1.0.0', {
      sends: [{ id: 'order-created', to: [{ id: 'order-events' }] }],
    });
    const auditService = entry('services', 'audit-service', '1.0.0', {
      receives: [{ id: 'order-created', from: [{ id: 'audit', version: '1.0.0' }] }],
    });

    expect(getMessageConnections(orderCreated, catalog([orderService, auditService])).channels).toEqual([
      orderEvents,
      auditChannel,
    ]);
  });

  it('includes the channels the message lists itself', () => {
    const message = entry('events', 'order-created', '1.0.0', { channels: [{ id: 'audit' }] });

    expect(getMessageConnections(message, catalog()).channels).toEqual([auditChannel]);
  });

  it('finds the flows with a step for the message', () => {
    expect(getMessageConnections(orderCreated, catalog()).flows).toEqual([placeOrder]);
  });

  it('finds the messages it triggers and the messages that trigger it', () => {
    const warehouse = entry('services', 'warehouse', '1.0.0', {
      receives: [
        { id: 'order-created', triggers: [{ id: 'reserve-stock' }] },
        { id: 'checkout-cart', triggers: [{ id: 'order-created' }] },
      ],
    });

    const connections = getMessageConnections(orderCreated, catalog([warehouse]));

    expect(connections.triggers).toEqual([reserveStock]);
    expect(connections.triggeredBy).toEqual([checkoutCart]);
  });

  it('lists each channel, flow and message once', () => {
    const service = entry('services', 'order-service', '1.0.0', {
      sends: [
        { id: 'order-created', to: [{ id: 'order-events' }] },
        { id: 'order-created', to: [{ id: 'order-events' }] },
      ],
      receives: [
        { id: 'order-created', triggers: [{ id: 'reserve-stock' }] },
        { id: 'order-created', triggers: [{ id: 'reserve-stock' }] },
      ],
    });

    const connections = getMessageConnections(orderCreated, catalog([service]));

    expect(connections.channels).toEqual([orderEvents]);
    expect(connections.triggers).toEqual([reserveStock]);
  });
});
