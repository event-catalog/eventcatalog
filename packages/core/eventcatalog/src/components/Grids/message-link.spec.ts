import { describe, expect, it } from 'vitest';
import { getMessageLinkProps } from './message-link';

describe('getMessageLinkProps', () => {
  it('builds a command docs url and prefers the resource name over the id', () => {
    expect(
      getMessageLinkProps({
        collection: 'commands',
        data: { id: 'order-create', name: 'Create Order', version: '0.0.1' },
      })
    ).toEqual({
      collection: 'commands',
      id: 'order-create',
      name: 'Create Order',
      version: '0.0.1',
      href: '/docs/commands/order-create/0.0.1',
    });
  });

  it('builds a query docs url from a hydrated collection entry', () => {
    expect(
      getMessageLinkProps({
        collection: 'queries',
        data: { id: 'get-stock-level', name: 'Get Stock Level', version: '1.0.0' },
      })
    ).toEqual({
      collection: 'queries',
      id: 'get-stock-level',
      name: 'Get Stock Level',
      version: '1.0.0',
      href: '/docs/queries/get-stock-level/1.0.0',
    });
  });

  it('does not default a missing collection to events', () => {
    expect(getMessageLinkProps({ id: 'order-create', version: '0.0.1' })).toEqual({
      collection: undefined,
      id: 'order-create',
      name: 'order-create',
      version: '0.0.1',
      href: undefined,
    });
  });

  it('ignores unknown collection values instead of linking to events', () => {
    expect(
      getMessageLinkProps({
        collection: 'services',
        data: { id: 'order-service', name: 'Order Service', version: '1.0.0' },
      })
    ).toEqual({
      collection: undefined,
      id: 'order-service',
      name: 'Order Service',
      version: '1.0.0',
      href: undefined,
    });
  });
});
