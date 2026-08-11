import { describe, expect, it } from 'vitest';
import { getResourceGroups, hasResources } from './_resources';

const resource = (id: string, version = '1.0.0') => ({ data: { id, name: id, version } });
const message = (collection: 'events' | 'commands' | 'queries', id: string, version = '1.0.0') => ({
  collection,
  data: { id, name: id, version },
});

describe('resource page groups', () => {
  it('includes every resource directly attached to a domain', () => {
    const sharedEvent = message('events', 'OrderPlaced');
    const groups = getResourceGroups(
      {
        domains: [resource('Fulfilment')],
        systems: [resource('OrderingSystem')],
        agents: [resource('OrderAgent')],
        'data-products': [resource('OrderAnalytics')],
        services: [resource('OrdersService')],
        flows: [resource('PlaceOrder')],
        entities: [resource('Order')],
        sends: [sharedEvent, message('commands', 'PlaceOrder')],
        receives: [sharedEvent, message('queries', 'GetOrder')],
      },
      'domains'
    );

    expect(Object.fromEntries(groups.map(({ collection, items }) => [collection, items.map((item) => item.data.id)]))).toEqual({
      domains: ['Fulfilment'],
      systems: ['OrderingSystem'],
      agents: ['OrderAgent'],
      'data-products': ['OrderAnalytics'],
      services: ['OrdersService'],
      flows: ['PlaceOrder'],
      entities: ['Order'],
      containers: [],
      events: ['OrderPlaced'],
      commands: ['PlaceOrder'],
      queries: ['GetOrder'],
    });
  });

  it('keeps domain-only resources off system resource pages', () => {
    const collections = getResourceGroups(
      {
        domains: [resource('Fulfilment')],
        systems: [resource('OrderingSystem')],
        agents: [resource('OrderAgent')],
        'data-products': [resource('OrderAnalytics')],
        services: [resource('OrdersService')],
        containers: [resource('OrdersDatabase')],
      },
      'systems'
    ).map(({ collection }) => collection);

    expect(collections).toEqual(['services', 'flows', 'entities', 'containers', 'events', 'commands', 'queries']);
  });

  it.each(['domains', 'systems', 'agents', 'data-products'] as const)(
    'makes a domain with only %s eligible for a Resources page',
    (collection) => {
      expect(hasResources({ data: { [collection]: [resource('direct-resource')] } }, 'domains')).toBe(true);
    }
  );
});
