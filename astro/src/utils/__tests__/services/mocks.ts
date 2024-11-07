export const mockServices = [
  {
    id: 'services/Order/OrderService/index.mdx',
    slug: 'services/Order/OrderService',
    collection: 'services',
    data: {
      id: 'OrderService',
      version: '1.0.0',
      sends: [
        {
          id: 'OrderCreatedEvent',
          version: '0.0.1',
        },
      ],
      receives: [
        {
          id: 'PaymentProcessed',
          version: '0.0.1',
        },
      ],
    },
  },
  {
    id: 'services/Inventory/InventoryService/index.mdx',
    slug: 'services/Inventory/InventoryService',
    collection: 'services',
    data: {
      id: 'InventoryService',
      version: '1.0.0',
      receives: [
        {
          id: 'OrderCreatedEvent',
          version: '^1.3.0',
        },
      ],
      sends: [
        {
          id: 'InventoryAdjusted',
          version: '~2',
        },
      ],
    },
  },
  {
    id: 'services/Payment/PaymentService/index.mdx',
    slug: 'services/Payment/PaymentService',
    collection: 'services',
    data: {
      id: 'PaymentService',
      version: '1.0.0',
      receives: [
        {
          id: 'OrderCreatedEvent',
        },
      ],
      sends: [
        {
          id: 'PaymentPaid',
        },
        {
          id: 'PaymentFailed',
          version: 'latest',
        },
      ],
    },
  },
];

export const mockEvents = [
  {
    slug: 'OrderCreatedEvent',
    collection: 'events',
    data: {
      id: 'OrderCreatedEvent',
      version: '0.0.1',
    },
  },
  {
    slug: 'OrderCreatedEvent',
    collection: 'events',
    data: {
      id: 'OrderCreatedEvent',
      version: '1.0.0',
    },
  },
  {
    slug: 'OrderCreatedEvent',
    collection: 'events',
    data: {
      id: 'OrderCreatedEvent',
      version: '1.3.9',
    },
  },
  {
    slug: 'OrderCreatedEvent',
    collection: 'events',
    data: {
      id: 'OrderCreatedEvent',
      version: '2.0.0',
    },
  },
  {
    slug: 'InventoryAdjusted',
    collection: 'events',
    data: {
      id: 'InventoryAdjusted',
      version: '0.0.1',
    },
  },
  {
    slug: 'InventoryAdjusted',
    collection: 'events',
    data: {
      id: 'InventoryAdjusted',
      version: '1.0.0',
    },
  },
  {
    slug: 'InventoryAdjusted',
    collection: 'events',
    data: {
      id: 'InventoryAdjusted',
      version: '2.0.0',
    },
  },
  // 7
  {
    slug: 'PaymentPaid',
    collection: 'events',
    data: {
      id: 'PaymentPaid',
      version: '1.0.0',
    },
  },
  // 8
  {
    slug: 'PaymentPaid',
    collection: 'events',
    data: {
      id: 'PaymentPaid',
      version: '2.0.0',
    },
  },
  // 9
  {
    slug: 'PaymentFailed',
    collection: 'events',
    data: {
      id: 'PaymentFailed',
      version: '1.0.0',
    },
  },
  // 10
  {
    slug: 'PaymentFailed',
    collection: 'events',
    data: {
      id: 'PaymentFailed',
      version: '1.2.3',
    },
  },
];

export const mockCommands = [
  {
    slug: 'PaymentProcessed',
    collection: 'commands',
    data: {
      id: 'PaymentProcessed',
      version: '0.0.1',
    },
  },
];
export const mockQueries = [
  {
    slug: 'GetOrder',
    collection: 'queries',
    data: {
      id: 'GetOrder',
      version: '0.0.1',
    },
  },
];
