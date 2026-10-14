import { describe, expect, it } from 'vitest';
import {
  getDocsPath,
  getFavorite,
  getResourceGroups,
  getResourceRelationship,
  getSchemaPath,
  getVisualiserPath,
  hasResources,
} from '@utils/collections/resources';

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
      adrs: [],
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

    expect(collections).toEqual(['services', 'flows', 'entities', 'containers', 'events', 'commands', 'queries', 'adrs']);
  });

  it.each(['domains', 'systems', 'agents', 'data-products'] as const)(
    'makes a domain with only %s eligible for a Resources page',
    (collection) => {
      expect(hasResources({ data: { [collection]: [resource('direct-resource')] } }, 'domains')).toBe(true);
    }
  );

  it('lists the messages, entities, data stores and flows a service uses', () => {
    const ordersDatabase = resource('OrdersDatabase');
    const orderPlaced = message('events', 'OrderPlaced');
    const groups = getResourceGroups(
      {
        sends: [orderPlaced, message('commands', 'ReserveStock')],
        receives: [orderPlaced, message('queries', 'GetOrder')],
        entities: [resource('Order')],
        writesTo: [ordersDatabase],
        readsFrom: [ordersDatabase, resource('ProductCache')],
        flows: [resource('PlaceOrder')],
      },
      'services'
    );

    expect(Object.fromEntries(groups.map(({ collection, items }) => [collection, items.map((item) => item.data.id)]))).toEqual({
      flows: ['PlaceOrder'],
      entities: ['Order'],
      containers: ['OrdersDatabase', 'ProductCache'],
      events: ['OrderPlaced'],
      commands: ['ReserveStock'],
      queries: ['GetOrder'],
      adrs: [],
    });
  });

  it('makes a service with only messages eligible for a Resources page', () => {
    expect(hasResources({ data: { receives: [message('events', 'OrderPlaced')] } }, 'services')).toBe(true);
  });

  it('does not give a service with nothing attached a Resources page', () => {
    expect(hasResources({ data: { sends: [], receives: [] } }, 'services')).toBe(false);
  });
});

describe('decision records and flow steps', () => {
  const adr = (id: string) => ({ collection: 'adrs', ...resource(id) });

  it.each(['domains', 'systems', 'services'] as const)('lists the decision records that apply to %s', (ownerCollection) => {
    const groups = getResourceGroups({}, ownerCollection, { adrs: [adr('UseOutbox')] });

    expect(groups.find(({ collection }) => collection === 'adrs')?.items.map((item) => item.data.id)).toEqual(['UseOutbox']);
  });

  it('adds the flows that have the service in a step, listing each flow once', () => {
    const placeOrder = { collection: 'flows', ...resource('PlaceOrder') };
    const groups = getResourceGroups({ flows: [placeOrder] }, 'services', {
      stepFlows: [placeOrder, { collection: 'flows', ...resource('OrderToDoorstep') }],
    });

    expect(groups.find(({ collection }) => collection === 'flows')?.items.map((item) => item.data.id)).toEqual([
      'PlaceOrder',
      'OrderToDoorstep',
    ]);
  });

  it('makes an owner with only decision records eligible for a Resources page', () => {
    expect(hasResources({ data: {}, adrs: [adr('UseOutbox')] }, 'systems')).toBe(true);
  });

  it('makes a service that only appears in flow steps eligible for a Resources page', () => {
    expect(hasResources({ data: {}, stepFlows: [resource('PlaceOrder')] }, 'services')).toBe(true);
  });
});

describe('flow resources', () => {
  const step = (collection: string, id: string) => ({ collection, ...resource(id) });

  it('groups the resources a flow steps through by type', () => {
    const groups = getResourceGroups({}, 'flows', {
      stepResources: [step('services', 'CheckoutApi'), step('commands', 'CheckoutCart'), step('flows', 'PaymentSaga')],
    });

    expect(
      Object.fromEntries(
        groups
          .filter(({ items }) => items.length > 0)
          .map(({ collection, items }) => [collection, items.map((item) => item.data.id)])
      )
    ).toEqual({ services: ['CheckoutApi'], flows: ['PaymentSaga'], commands: ['CheckoutCart'] });
  });

  it('lists the decision records that apply to a flow', () => {
    const groups = getResourceGroups({}, 'flows', { adrs: [step('adrs', 'UseSaga')] });

    expect(groups.find(({ collection }) => collection === 'adrs')?.items.map((item) => item.data.id)).toEqual(['UseSaga']);
  });

  it('makes a flow with steps that point at resources eligible for a Resources page', () => {
    expect(hasResources({ data: {}, stepResources: [step('services', 'CheckoutApi')] }, 'flows')).toBe(true);
    expect(hasResources({ data: {} }, 'flows')).toBe(false);
  });

  it('says a flow includes the resources in its steps', () => {
    expect(getResourceRelationship({}, 'flows', 'services', resource('CheckoutApi'))).toBe('includes');
    expect(getResourceRelationship({}, 'flows', 'commands', message('commands', 'CheckoutCart'))).toBe('includes');
    expect(getResourceRelationship({}, 'flows', 'adrs', resource('UseSaga'))).toBe('governed-by');
  });
});

describe('channel resources', () => {
  const orderService = { collection: 'services', ...resource('OrderService') };
  const shippingService = { collection: 'services', ...resource('ShippingService') };
  const auditService = { collection: 'services', ...resource('AuditService') };
  const orderCreated = message('events', 'OrderCreated');
  const related = {
    channelProducers: [orderService, auditService],
    channelConsumers: [shippingService, auditService],
    channelMessages: [orderCreated],
  };

  it('lists the services and messages that use the channel, each service once', () => {
    const groups = getResourceGroups({}, 'channels', related);

    expect(
      Object.fromEntries(
        groups
          .filter(({ items }) => items.length > 0)
          .map(({ collection, items }) => [collection, items.map((item) => item.data.id)])
      )
    ).toEqual({ services: ['OrderService', 'AuditService', 'ShippingService'], events: ['OrderCreated'] });
  });

  it('lists agents that use the channel apart from services, and says what they do', () => {
    const fraudAgent = { collection: 'agents', ...resource('FraudAgent') };
    const withAgent = { ...related, channelConsumers: [...related.channelConsumers, fraudAgent] };

    const groups = getResourceGroups({}, 'channels', withAgent);

    expect(groups.find(({ collection }) => collection === 'agents')?.items).toEqual([fraudAgent]);
    expect(getResourceRelationship({}, 'channels', 'agents', fraudAgent, withAgent)).toBe('receives-messages');
  });

  it('makes a channel with services or messages eligible for a Resources page', () => {
    expect(hasResources({ data: {}, channelMessages: [orderCreated] }, 'channels')).toBe(true);
    expect(hasResources({ data: {} }, 'channels')).toBe(false);
  });

  it.each([
    ['a service that sends to it', orderService, 'services', 'produces-messages'],
    ['a service that receives from it', shippingService, 'services', 'receives-messages'],
    ['a service that does both', auditService, 'services', 'produces-and-receives-messages'],
    ['a message on it', orderCreated, 'events', 'transports'],
  ] as const)('describes %s', (_case, item, collection, relationship) => {
    expect(getResourceRelationship({}, 'channels', collection, item, related)).toBe(relationship);
  });
});

describe('message resources', () => {
  const orderService = { collection: 'services', ...resource('OrderService') };
  const shippingService = { collection: 'services', ...resource('ShippingService') };
  const auditService = { collection: 'services', ...resource('AuditService') };
  const fraudAgent = { collection: 'agents', ...resource('FraudAgent') };
  const orderEvents = { collection: 'channels', ...resource('order-events') };
  const placeOrder = { collection: 'flows', ...resource('PlaceOrder') };
  const reserveStock = message('commands', 'ReserveStock');
  const checkoutCart = message('commands', 'CheckoutCart');
  const data = { producers: [orderService, auditService], consumers: [shippingService, auditService, fraudAgent] };
  const related = {
    messageChannels: [orderEvents],
    messageFlows: [placeOrder],
    messageTriggers: [reserveStock],
    messageTriggeredBy: [checkoutCart],
  };

  it.each(['events', 'commands', 'queries'] as const)('lists what a message in %s connects to', (ownerCollection) => {
    const groups = getResourceGroups(data, ownerCollection, related);

    expect(
      Object.fromEntries(
        groups
          .filter(({ items }) => items.length > 0)
          .map(({ collection, items }) => [collection, items.map((item) => item.data.id)])
      )
    ).toEqual({
      services: ['OrderService', 'AuditService', 'ShippingService'],
      agents: ['FraudAgent'],
      channels: ['order-events'],
      flows: ['PlaceOrder'],
      commands: ['ReserveStock', 'CheckoutCart'],
    });
  });

  it('makes a message with producers or consumers eligible for a Resources page', () => {
    expect(hasResources({ data: { producers: [orderService] } }, 'events')).toBe(true);
    expect(hasResources({ data: { producers: [], consumers: [] } }, 'events')).toBe(false);
  });

  it.each([
    ['a service that produces it', orderService, 'services', 'produces'],
    ['a service that consumes it', shippingService, 'services', 'consumes'],
    ['a service that does both', auditService, 'services', 'produces-and-consumes'],
    ['a channel it travels on', orderEvents, 'channels', 'transports'],
    ['a flow it appears in', placeOrder, 'flows', 'appears-in'],
    ['a message it triggers', reserveStock, 'commands', 'triggers'],
    ['a message that triggers it', checkoutCart, 'commands', 'triggered-by'],
  ] as const)('describes %s', (_case, item, collection, relationship) => {
    expect(getResourceRelationship(data, 'events', collection, item, related)).toBe(relationship);
  });
});

describe('resources that share an id and version across collections', () => {
  const service = { collection: 'services', ...resource('Payments') };
  const agent = { collection: 'agents', ...resource('Payments') };

  it('keeps a service and an agent with the same id and version as separate rows', () => {
    const groups = getResourceGroups({ producers: [service], consumers: [agent] }, 'events');

    expect(groups.find(({ collection }) => collection === 'services')?.items).toEqual([service]);
    expect(groups.find(({ collection }) => collection === 'agents')?.items).toEqual([agent]);
  });

  it('gives each its own relationship', () => {
    const data = { producers: [service], consumers: [agent] };

    expect(getResourceRelationship(data, 'events', 'services', service)).toBe('produces');
    expect(getResourceRelationship(data, 'events', 'agents', agent)).toBe('consumes');
  });
});

describe('resource relationships', () => {
  const orderPlaced = message('events', 'OrderPlaced');
  const checkoutCart = message('commands', 'CheckoutCart');
  const stockReserved = message('events', 'StockReserved');
  const ordersDatabase = { collection: 'containers', ...resource('OrdersDatabase') };
  const productCache = { collection: 'containers', ...resource('ProductCache') };
  const auditLog = { collection: 'containers', ...resource('AuditLog') };
  const service = {
    sends: [orderPlaced, stockReserved],
    receives: [checkoutCart, stockReserved],
    writesTo: [ordersDatabase, auditLog],
    readsFrom: [productCache, auditLog],
  };

  it.each([
    ['a received message', 'events', checkoutCart, 'receives'],
    ['a sent message', 'events', orderPlaced, 'sends'],
    ['a message that is sent and received', 'events', stockReserved, 'sends-and-receives'],
    ['a data store it writes to', 'containers', ordersDatabase, 'writes'],
    ['a data store it reads from', 'containers', productCache, 'reads'],
    ['a data store it reads and writes', 'containers', auditLog, 'reads-and-writes'],
    ['an entity it owns', 'entities', resource('Order'), 'owns'],
    ['a flow it appears in', 'flows', resource('PlaceOrder'), 'appears-in'],
  ] as const)('describes %s for a service', (_case, collection, item, relationship) => {
    expect(getResourceRelationship(service, 'services', collection, item)).toBe(relationship);
  });

  it.each([
    ['subdomains', 'domains'],
    ['systems', 'systems'],
    ['services', 'services'],
    ['agents', 'agents'],
    ['data products', 'data-products'],
    ['flows', 'flows'],
    ['data stores', 'containers'],
  ] as const)('says a domain contains its %s', (_case, collection) => {
    expect(getResourceRelationship({}, 'domains', collection, resource('Child'))).toBe('contains');
  });

  it('says a domain owns its entities', () => {
    expect(getResourceRelationship({}, 'domains', 'entities', resource('Order'))).toBe('owns');
  });

  it('describes the messages a domain sends and receives', () => {
    const domain = { sends: [orderPlaced], receives: [checkoutCart] };

    expect(getResourceRelationship(domain, 'domains', 'events', orderPlaced)).toBe('sends');
    expect(getResourceRelationship(domain, 'domains', 'commands', checkoutCart)).toBe('receives');
  });

  it.each([
    ['services', 'contains'],
    ['flows', 'contains'],
    ['containers', 'contains'],
    ['entities', 'owns'],
  ] as const)('describes a system relationship to its %s', (collection, relationship) => {
    expect(getResourceRelationship({}, 'systems', collection, resource('Child'))).toBe(relationship);
  });

  it.each(['domains', 'systems', 'services'] as const)('says %s are governed by their decision records', (ownerCollection) => {
    expect(getResourceRelationship({}, ownerCollection, 'adrs', resource('UseOutbox'))).toBe('governed-by');
  });

  it('matches messages by version as well as id', () => {
    expect(getResourceRelationship(service, 'services', 'events', message('events', 'OrderPlaced', '2.0.0'))).toBeUndefined();
  });
});

describe('schema paths', () => {
  const schemaKeys = new Set(['commands:CheckoutCart:1.0.0']);

  it('links a message with a schema to its schema page', () => {
    expect(getSchemaPath('commands', message('commands', 'CheckoutCart'), schemaKeys)).toBe(
      '/schemas/commands/CheckoutCart/1.0.0'
    );
  });

  it('has no schema path for a message without a schema', () => {
    expect(getSchemaPath('events', message('events', 'OrderPlaced'), schemaKeys)).toBeUndefined();
  });

  it('links a data product to its first output contract', () => {
    const analytics = {
      data: {
        id: 'OrderAnalytics',
        version: '1.0.0',
        outputs: [{ id: 'raw' }, { id: 'daily', contract: { path: 'daily.json' } }],
      },
    };

    expect(getSchemaPath('data-products', analytics, schemaKeys)).toBe(
      '/schemas/data-products/OrderAnalytics/1.0.0?contract=daily.json'
    );
  });

  it('has no schema path for other resources', () => {
    expect(getSchemaPath('services', resource('OrderService'), schemaKeys)).toBeUndefined();
  });
});

describe('row links', () => {
  it('links every row to its docs page', () => {
    expect(getDocsPath('entities', resource('Order'))).toBe('/docs/entities/Order/1.0.0');
    expect(getDocsPath('adrs', resource('UseOutbox'))).toBe('/docs/adrs/UseOutbox/1.0.0');
  });

  it.each([
    'domains',
    'systems',
    'agents',
    'services',
    'flows',
    'containers',
    'channels',
    'data-products',
    'events',
    'commands',
    'queries',
  ] as const)('links %s to the visualiser', (collection) => {
    expect(getVisualiserPath(collection, resource('Thing'), true)).toBe(`/visualiser/${collection}/Thing/1.0.0`);
  });

  it.each(['entities', 'adrs'] as const)('does not link %s to the visualiser, which has no page for them', (collection) => {
    expect(getVisualiserPath(collection, resource('Thing'), true)).toBeUndefined();
  });

  it('does not link to the visualiser when it is turned off or the resource opts out', () => {
    expect(getVisualiserPath('services', resource('OrderService'), false)).toBeUndefined();
    expect(
      getVisualiserPath('services', { data: { id: 'OrderService', version: '1.0.0', visualiser: false } }, true)
    ).toBeUndefined();
  });

  it('uses the same favorite key and badge as the docs page favorite button', () => {
    expect(getFavorite('data-products', resource('OrderAnalytics'))).toEqual({
      nodeKey: 'data-product:OrderAnalytics:1.0.0',
      badge: 'Data-product',
    });
  });
});
