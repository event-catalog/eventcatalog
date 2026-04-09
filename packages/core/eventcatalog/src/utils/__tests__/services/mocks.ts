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
      writesTo: [
        {
          id: 'OrderDatabase',
          version: '1.0.0',
        },
      ],
      readsFrom: [
        {
          id: 'PaymentDatabase',
          version: '1.0.0',
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
          from: [
            {
              id: 'EmailChannel',
              version: '1.0.0',
            },
          ],
        },
      ],
      sends: [
        {
          id: 'PaymentPaid',
          to: [
            {
              id: 'EmailChannel',
              version: '1.0.0',
            },
          ],
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

export const mockContainers = [
  {
    id: 'OrderDatabase',
    collection: 'containers',
    data: {
      id: 'OrderDatabase',
      version: '1.0.0',
    },
  },
  {
    id: 'PaymentDatabase',
    collection: 'containers',
    data: {
      id: 'PaymentDatabase',
      version: '1.0.0',
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

export const mockGroupedService = {
  id: 'services/Student/StudentInfoService/index.mdx',
  slug: 'services/Student/StudentInfoService',
  collection: 'services',
  data: {
    id: 'StudentInfoService',
    version: '1.0.0',
    sends: [
      { id: 'ProgramCreated', version: '1.0.0', group: 'Academic Structure' },
      { id: 'ProgramUpdated', version: '1.0.0', group: 'Academic Structure' },
      { id: 'StudentEnrolled', version: '1.0.0', group: 'Student Lifecycle' },
      { id: 'GradeRecorded', version: '1.0.0' },
    ],
    receives: [
      { id: 'EnrolmentRequested', version: '1.0.0', group: 'Student Lifecycle' },
      { id: 'PaymentProcessed', version: '0.0.1' },
    ],
  },
};

export const mockGroupedEvents = [
  { data: { id: 'ProgramCreated', version: '1.0.0', name: 'ProgramCreated' }, collection: 'events' },
  { data: { id: 'ProgramUpdated', version: '1.0.0', name: 'ProgramUpdated' }, collection: 'events' },
  { data: { id: 'StudentEnrolled', version: '1.0.0', name: 'StudentEnrolled' }, collection: 'events' },
  { data: { id: 'GradeRecorded', version: '1.0.0', name: 'GradeRecorded' }, collection: 'events' },
];

export const mockGroupedCommands = [
  { data: { id: 'EnrolmentRequested', version: '1.0.0', name: 'EnrolmentRequested' }, collection: 'commands' },
];

// Service with grouped messages that have channel routing (for downstream expansion tests)
export const mockGroupedServiceWithChannels = {
  id: 'services/Warehouse/WarehouseService/index.mdx',
  slug: 'services/Warehouse/WarehouseService',
  collection: 'services',
  data: {
    id: 'WarehouseService',
    version: '1.0.0',
    sends: [
      { id: 'ShipmentDispatched', version: '1.0.0', group: 'Shipping', to: [{ id: 'ShippingChannel', version: '1.0.0' }] },
      { id: 'ShipmentFailed', version: '1.0.0', group: 'Shipping' },
    ],
    receives: [
      { id: 'PickRequested', version: '1.0.0', group: 'Picking', from: [{ id: 'PickChannel', version: '1.0.0' }] },
      { id: 'PickCancelled', version: '1.0.0', group: 'Picking' },
    ],
  },
};

export const mockGroupedChannelEvents = [
  { data: { id: 'ShipmentDispatched', version: '1.0.0', name: 'ShipmentDispatched' }, collection: 'events' },
  { data: { id: 'ShipmentFailed', version: '1.0.0', name: 'ShipmentFailed' }, collection: 'events' },
  { data: { id: 'PickRequested', version: '1.0.0', name: 'PickRequested' }, collection: 'commands' },
  { data: { id: 'PickCancelled', version: '1.0.0', name: 'PickCancelled' }, collection: 'commands' },
];

export const mockGroupedChannels = [
  {
    id: 'ShippingChannel',
    slug: 'ShippingChannel',
    collection: 'channels',
    data: { id: 'ShippingChannel', version: '1.0.0' },
  },
  {
    id: 'PickChannel',
    slug: 'PickChannel',
    collection: 'channels',
    data: { id: 'PickChannel', version: '1.0.0' },
  },
];

// A consumer of ShipmentDispatched (for testing downstream consumer nodes)
export const mockShipmentConsumerService = {
  id: 'services/Delivery/DeliveryService/index.mdx',
  slug: 'services/Delivery/DeliveryService',
  collection: 'services',
  data: {
    id: 'DeliveryService',
    version: '1.0.0',
    receives: [{ id: 'ShipmentDispatched', version: '1.0.0' }],
    sends: [],
  },
};

// A producer of PickRequested (for testing upstream producer nodes)
export const mockPickProducerService = {
  id: 'services/WMS/WMSService/index.mdx',
  slug: 'services/WMS/WMSService',
  collection: 'services',
  data: {
    id: 'WMSService',
    version: '1.0.0',
    sends: [{ id: 'PickRequested', version: '1.0.0' }],
    receives: [],
  },
};
