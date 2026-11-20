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
          name: 'Order Created',
          version: '0.0.1',
        },
      ],
      receives: [
        {
          id: 'PaymentProcessed',
          name: 'Payment Processed',
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
          name: 'Order Created',
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
    id: 'OrderCreatedEvent',
    slug: 'OrderCreatedEvent',
    collection: 'events',
    data: {
      id: 'OrderCreatedEvent',
      version: '0.0.1',
      name: 'Order Created',
      channels: [
        {
          id: 'orders.{env}.events',
          version: '1.0.0',
        },
      ],
    },
  },
];

export const mockCommands = [
  {
    id: 'PaymentProcessed',
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
    id: 'GetOrder',
    slug: 'GetOrder',
    collection: 'queries',
    data: {
      id: 'GetOrder',
      version: '0.0.1',
      name: 'Get Order',
      channels: [
        {
          id: 'orders.{env}.events',
          version: '1.0.0',
        },
      ],
    },
  },
];

export const mockChannels = [
  {
    id: 'orders.{env}.events',
    slug: 'orders.{env}.events',
    collection: 'channels',
    data: {
      id: 'orders.{env}.events',
      version: '1.0.0',
    },
  },
  {
    id: 'inventory.{env}.events',
    slug: 'inventory.{env}.events',
    collection: 'channels',
    data: {
      id: 'inventory.{env}.events',
      version: '1.0.0',
    },
  },
  // Dead letters: the latest orders queue sends its dead letters to orders.dlq; an older version sent them to
  // legacy.dlq, which doesn't make legacy.dlq a dead letter channel now
  {
    id: 'orders.queue-1.0.0',
    slug: 'orders.queue',
    collection: 'channels',
    data: { id: 'orders.queue', name: 'Orders Queue', version: '1.0.0', deadLetterChannel: { id: 'orders.dlq' } },
  },
  {
    id: 'orders.queue-0.0.1',
    slug: 'orders.queue',
    collection: 'channels',
    filePath: 'channels/orders.queue/versioned/0.0.1/index.mdx',
    data: { id: 'orders.queue', name: 'Orders Queue', version: '0.0.1', deadLetterChannel: { id: 'legacy.dlq' } },
  },
  {
    id: 'orders.dlq-1.0.0',
    slug: 'orders.dlq',
    collection: 'channels',
    data: { id: 'orders.dlq', name: 'Orders DLQ', version: '1.0.0' },
  },
  {
    id: 'legacy.dlq-1.0.0',
    slug: 'legacy.dlq',
    collection: 'channels',
    data: { id: 'legacy.dlq', name: 'Legacy DLQ', version: '1.0.0' },
  },
];
