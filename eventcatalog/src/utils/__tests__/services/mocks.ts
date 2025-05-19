export const mockServices = [
  {
    id: 'services/Order/OrderService/index.mdx',
    slug: 'services/Order/OrderService',
    collection: 'services',
    data: {
      id: 'OrderService',
      version: '1.0.0',
      specifications: [
        {
          type: 'asyncapi',
          path: 'asyncapi.yml',
          name: 'AsyncAPI Custom Name',
        },
        {
          type: 'openapi',
          path: 'openapi.yml',
          name: 'OpenAPI Custom Name',
        },
      ],
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
      specifications: {
        asyncapiPath: 'asyncapi.yml',
        openapiPath: 'openapi.yml',
      },
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
        {
          id: 'OrderDeletedEvent',
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
        {
          id: 'EmailVerified',
          version: '1.0.0',
        },
      ],
    },
  },
  {
    id: 'services/Notifications/NotificationsService/index.mdx',
    slug: 'services/Notifications/NotificationsService',
    collection: 'services',
    data: {
      id: 'NotificationsService',
      version: '1.0.0',
      receives: [
        {
          id: 'OrderCreatedEvent',
        },
      ],
      sends: [
        {
          id: 'OrderCreatedEvent',
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
    slug: 'OrderDeletedEvent',
    collection: 'events',
    data: {
      id: 'OrderDeletedEvent',
      version: '2.0.0',
      channels: [
        {
          id: 'OrderChannel',
          version: '1.0.0',
        },
      ],
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
  // 9
  {
    slug: 'PaymentPaid',
    collection: 'events',
    data: {
      id: 'PaymentPaid',
      version: '2.0.0',
    },
  },
  // 10
  {
    slug: 'PaymentFailed',
    collection: 'events',
    data: {
      id: 'PaymentFailed',
      version: '1.0.0',
    },
  },
  // 11
  {
    slug: 'PaymentFailed',
    collection: 'events',
    data: {
      id: 'PaymentFailed',
      version: '1.2.3',
    },
  },
  // 12
  {
    id: 'EmailVerified',
    slug: 'EmailVerified',
    collection: 'events',
    data: {
      id: 'EmailVerified',
      version: '1.0.0',
      channels: [
        {
          id: 'EmailChannel',
          version: '1.0.0',
        },
      ],
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

export const mockChannels = [
  {
    id: 'EmailChannel',
    slug: 'EmailChannel',
    collection: 'channels',
    data: {
      id: 'EmailChannel',
      version: '1.0.0',
      messages: [
        {
          id: 'OrderCreatedEvent',
          version: '0.0.1',
        },
      ],
    },
  },
  {
    id: 'OrderChannel',
    slug: 'OrderChannel',
    collection: 'channels',
    data: {
      id: 'OrderChannel',
      version: '1.0.0',
    },
  },
];
