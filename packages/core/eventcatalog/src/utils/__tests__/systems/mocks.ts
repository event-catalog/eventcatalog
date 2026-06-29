export const mockSystems = [
  {
    id: 'systems/CoreMonolith/index.mdx',
    slug: 'systems/CoreMonolith',
    collection: 'systems',
    filePath: 'systems/CoreMonolith/index.mdx',
    data: {
      id: 'CoreMonolith',
      name: 'Core Monolith',
      version: '1.0.0',
      // OrderService and PaymentService live in different domains but the same system
      services: [
        { id: 'OrderService', version: '1.0.0' },
        { id: 'PaymentService', version: '1.0.0' },
      ],
      // The data store (container) mapped directly to the system
      containers: [{ id: 'OrdersDB', version: '1.0.0' }],
    },
  },
  {
    id: 'systems/EmptySystem/index.mdx',
    slug: 'systems/EmptySystem',
    collection: 'systems',
    filePath: 'systems/EmptySystem/index.mdx',
    data: {
      id: 'EmptySystem',
      name: 'Empty System',
      version: '1.0.0',
    },
  },
];

export const mockServices = [
  {
    id: 'services/OrderService/index.mdx',
    slug: 'services/OrderService',
    collection: 'services',
    data: {
      id: 'OrderService',
      version: '1.0.0',
      sends: [{ id: 'OrderPlaced', version: '1.0.0' }],
      // OrderService writes to the system's data store
      writesTo: [{ id: 'OrdersDB', version: '1.0.0' }],
    },
  },
  {
    id: 'services/PaymentService/index.mdx',
    slug: 'services/PaymentService',
    collection: 'services',
    data: {
      id: 'PaymentService',
      version: '1.0.0',
      // PaymentService receives the message OrderService sends, so they connect inside the system
      receives: [{ id: 'OrderPlaced', version: '1.0.0' }],
    },
  },
];

export const mockEvents = [
  {
    id: 'events/OrderPlaced/index.mdx',
    slug: 'events/OrderPlaced',
    collection: 'events',
    data: {
      id: 'OrderPlaced',
      version: '1.0.0',
    },
  },
];

export const mockCommands = [];
export const mockQueries = [];
export const mockChannels = [];
export const mockContainers = [
  {
    id: 'containers/OrdersDB/index.mdx',
    slug: 'containers/OrdersDB',
    collection: 'containers',
    data: {
      id: 'OrdersDB',
      name: 'Orders DB',
      version: '1.0.0',
      container_type: 'database',
      technology: 'postgres@14',
    },
  },
];
