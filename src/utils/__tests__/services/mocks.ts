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
    id: 'events/OrderCreatedEvent/versioned/0.0.1/index.mdx',
    slug: 'OrderCreatedEvent',
    collection: 'events',
    data: {
      id: 'OrderCreatedEvent',
      version: '0.0.1',
    },
  },
  {
    id: 'events/OrderCreatedEvent/versioned/1.0.0/index.mdx',
    slug: 'OrderCreatedEvent',
    collection: 'events',
    data: {
      id: 'OrderCreatedEvent',
      version: '1.0.0',
    },
  },
  {
    id: 'events/OrderCreatedEvent/versioned/1.3.9/index.mdx',
    slug: 'OrderCreatedEvent',
    collection: 'events',
    data: {
      id: 'OrderCreatedEvent',
      version: '1.3.9',
    },
  },
  {
    id: 'events/OrderCreatedEvent/index.mdx',
    slug: 'OrderCreatedEvent',
    collection: 'events',
    data: {
      id: 'OrderCreatedEvent',
      version: '2.0.0',
    },
  },
  {
    id: 'events/OrderDeletedEvent/index.mdx',
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
    id: 'events/InventoryAdjusted/versioned/0.0.1/index.mdx',
    slug: 'InventoryAdjusted',
    collection: 'events',
    data: {
      id: 'InventoryAdjusted',
      version: '0.0.1',
    },
  },
  {
    id: 'events/InventoryAdjusted/versioned/1.0.0/index.mdx',
    slug: 'InventoryAdjusted',
    collection: 'events',
    data: {
      id: 'InventoryAdjusted',
      version: '1.0.0',
    },
  },
  {
    id: 'events/InventoryAdjusted/index.mdx',
    slug: 'InventoryAdjusted',
    collection: 'events',
    data: {
      id: 'InventoryAdjusted',
      version: '2.0.0',
    },
  },
  // 7
  {
    id: 'events/PaymentPaid/versioned/1.0.0/index.mdx',
    slug: 'PaymentPaid',
    collection: 'events',
    data: {
      id: 'PaymentPaid',
      version: '1.0.0',
    },
  },
  // 9
  {
    id: 'events/PaymentPaid/index.mdx',
    slug: 'PaymentPaid',
    collection: 'events',
    data: {
      id: 'PaymentPaid',
      version: '2.0.0',
    },
  },
  // 10
  {
    id: 'events/PaymentFailed/versioned/1.0.0/index.mdx',
    slug: 'PaymentFailed',
    collection: 'events',
    data: {
      id: 'PaymentFailed',
      version: '1.0.0',
    },
  },
  // 11
  {
    id: 'events/PaymentFailed/1.2.3/index.mdx',
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
    id: 'commands/PaymentProcessed/index.mdx',
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
    id: 'queries/GetOrder/index.mdx',
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
