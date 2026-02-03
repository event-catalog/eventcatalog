export const mockServices = [
  {
    id: 'OrderService',
    slug: 'OrderService',
    collection: 'services',
    data: {
      id: 'OrderService',
      version: '0.0.1',
      entities: [
        {
          id: 'Supplier',
          version: '0.0.1',
        },
      ],
    },
  },
];

export const mockDomains = [
  {
    id: 'SupplierDomain',
    slug: 'SupplierDomain',
    collection: 'domains',
    data: {
      id: 'SupplierDomain',
      version: '0.0.1',
      entities: [
        {
          id: 'Supplier',
          version: '0.0.1',
        },
      ],
    },
  },
];

export const mockEvents = [
  {
    id: 'OrderCreated-1.0.0',
    slug: 'OrderCreated',
    collection: 'events',
    data: {
      id: 'OrderCreated',
      name: 'Order Created',
      version: '1.0.0',
    },
  },
  {
    id: 'OrderShipped-1.0.0',
    slug: 'OrderShipped',
    collection: 'events',
    data: {
      id: 'OrderShipped',
      name: 'Order Shipped',
      version: '1.0.0',
    },
  },
];

export const mockCommands = [
  {
    id: 'CreateOrder-1.0.0',
    slug: 'CreateOrder',
    collection: 'commands',
    data: {
      id: 'CreateOrder',
      name: 'Create Order',
      version: '1.0.0',
    },
  },
  {
    id: 'ShipOrder-1.0.0',
    slug: 'ShipOrder',
    collection: 'commands',
    data: {
      id: 'ShipOrder',
      name: 'Ship Order',
      version: '1.0.0',
    },
  },
];

export const mockQueries = [
  {
    id: 'GetOrder-1.0.0',
    slug: 'GetOrder',
    collection: 'queries',
    data: {
      id: 'GetOrder',
      name: 'Get Order',
      version: '1.0.0',
    },
  },
];

export const mockEntities = [
  {
    id: 'Supplier',
    slug: 'Supplier',
    collection: 'entities',
    data: {
      id: 'Supplier',
      version: '0.0.1',
      identifier: 'id',
      aggregateRoot: true,
      properties: [
        {
          id: 'name',
          type: 'string',
          required: true,
          description: 'The name of the supplier',
        },
      ],
    },
  },
  {
    id: 'Order-1.0.0',
    slug: 'Order',
    collection: 'entities',
    data: {
      id: 'Order',
      name: 'Order',
      version: '1.0.0',
      identifier: 'orderId',
      aggregateRoot: true,
      sends: [
        { id: 'OrderCreated', version: '1.0.0' },
        { id: 'OrderShipped', version: '1.0.0' },
      ],
      receives: [
        { id: 'CreateOrder', version: '1.0.0' },
        { id: 'ShipOrder', version: '1.0.0' },
      ],
    },
  },
  {
    id: 'SimpleEntity-1.0.0',
    slug: 'SimpleEntity',
    collection: 'entities',
    data: {
      id: 'SimpleEntity',
      name: 'Simple Entity',
      version: '1.0.0',
      // No sends/receives - testing entities without messaging
    },
  },
];
