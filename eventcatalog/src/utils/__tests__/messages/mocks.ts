export const mockCommands = [
  {
    id: 'ProcessPayment',
    collection: 'commands',
    data: {
      id: 'ProcessPayment',
      version: '0.0.1',
      pathToFile: 'commands/ProcessPayment/versioned/0.0.1/index.md',
    },
  },
  {
    id: 'ProcessPayment',
    collection: 'commands',
    data: {
      id: 'ProcessPayment',
      version: '0.0.2',
      pathToFile: 'commands/ProcessPayment/versioned/0.0.2/index.md',
    },
  },
  {
    id: 'ProcessPayment',
    collection: 'commands',
    data: {
      id: 'ProcessPayment',
      version: '0.1.0',
      pathToFile: 'commands/ProcessPayment/index.md',
    },
  },
];

export const mockEvents = [
  {
    id: 'PaymentProcessed',
    collection: 'events',
    data: {
      id: 'PaymentProcessed',
      version: '0.0.1',
      pathToFile: 'events/PaymentProcessed/versioned/0.0.1/index.md',
    },
  },
  {
    id: 'PaymentProcessed',
    collection: 'events',
    data: {
      id: 'PaymentProcessed',
      version: '0.0.2',
      pathToFile: 'events/PaymentProcessed/versioned/0.0.2/index.md',
    },
  },
  {
    id: 'PaymentProcessed',
    collection: 'events',
    data: {
      id: 'PaymentProcessed',
      version: '0.1.0',
      pathToFile: 'events/PaymentProcessed/index.md',
    },
  },
  // Additional versions for testing semver pattern matching
  {
    id: 'PaymentProcessed',
    collection: 'events',
    data: {
      id: 'PaymentProcessed',
      version: '1.0.0',
      pathToFile: 'events/PaymentProcessed/versioned/1.0.0/index.md',
    },
  },
  {
    id: 'PaymentProcessed',
    collection: 'events',
    data: {
      id: 'PaymentProcessed',
      version: '1.2.3',
      pathToFile: 'events/PaymentProcessed/versioned/1.2.3/index.md',
    },
  },
  {
    id: 'PaymentProcessed',
    collection: 'events',
    data: {
      id: 'PaymentProcessed',
      version: '1.2.5',
      pathToFile: 'events/PaymentProcessed/versioned/1.2.5/index.md',
    },
  },
  {
    id: 'PaymentProcessed',
    collection: 'events',
    data: {
      id: 'PaymentProcessed',
      version: '1.9.9',
      pathToFile: 'events/PaymentProcessed/versioned/1.9.9/index.md',
    },
  },
  {
    id: 'PaymentProcessed',
    collection: 'events',
    data: {
      id: 'PaymentProcessed',
      version: '2.0.0',
      pathToFile: 'events/PaymentProcessed/versioned/2.0.0/index.md',
    },
  },
];

export const mockQueries = [];

export const mockServices = [
  {
    id: 'OrdersService',
    collection: 'services',
    data: {
      id: 'OrdersService',
      version: '1.0.0',
      pathToFile: 'services/OrdersService/index.md',
      receives: [
        {
          id: 'PaymentProcessed',
          version: '0.0.1',
        },
      ],
    },
  },
  {
    id: 'ServiceThatReceivesMessagesFromAChannel',
    collection: 'services',
    data: {
      id: 'ServiceThatReceivesMessagesFromAChannel',
      version: '1.0.0',
      pathToFile: 'services/OrdersService/index.md',
      receives: [
        {
          id: 'PaymentProcessed',
          version: '0.0.1',
          from: [{ id: 'EmailChannel', version: '1.0.0' }],
        },
      ],
    },
  },
  {
    id: 'ServiceThatProducesMessages',
    collection: 'services',
    data: {
      id: 'ServiceThatProducesMessages',
      version: '1.0.0',
      pathToFile: 'services/ServiceThatProducesMessages/index.md',
      sends: [
        {
          id: 'PaymentProcessed',
          version: '0.0.1',
        },
      ],
    },
  },
  {
    id: 'ServiceThatProducesMessagesOverManyChannels',
    collection: 'services',
    data: {
      id: 'ServiceThatProducesMessagesOverManyChannels',
      version: '1.0.0',
      pathToFile: 'services/ServiceThatProducesMessagesOverManyChannels/index.md',
      sends: [
        {
          id: 'PaymentProcessed',
          version: '0.0.1',
          to: [
            { id: 'EmailChannel', version: '1.0.0' },
            { id: 'SNSChannel', version: '1.0.0' },
            { id: 'SQSChannel', version: '1.0.0' },
          ],
        },
      ],
    },
  },
];

export const mockChannels = [
  {
    id: 'EmailChannel',
    collection: 'channels',
    data: {
      id: 'EmailChannel',
      version: '1.0.0',
      pathToFile: 'channels/EmailChannel/index.md',
    },
  },
  {
    id: 'SNSChannel',
    collection: 'channels',
    data: {
      id: 'SNSChannel',
      version: '1.0.0',
      pathToFile: 'channels/SmsChannel/index.md',
    },
  },
  {
    id: 'SQSChannel',
    collection: 'channels',
    data: {
      id: 'SQSChannel',
      version: '1.0.0',
      pathToFile: 'channels/SQSChannel/index.md',
    },
  },
];

export const mockDataProducts = [
  {
    id: 'PaymentAnalytics-1.0.0',
    collection: 'data-products',
    data: {
      id: 'PaymentAnalytics',
      name: 'Payment Analytics',
      version: '1.0.0',
      inputs: [{ id: 'PaymentProcessed', version: '0.0.1' }],
      outputs: [],
    },
  },
  {
    id: 'OrderDataPipeline-1.0.0',
    collection: 'data-products',
    data: {
      id: 'OrderDataPipeline',
      name: 'Order Data Pipeline',
      version: '1.0.0',
      inputs: [],
      outputs: [{ id: 'PaymentProcessed', version: '0.0.1' }],
    },
  },
  {
    id: 'DataProductWithLatestVersion-1.0.0',
    collection: 'data-products',
    data: {
      id: 'DataProductWithLatestVersion',
      name: 'Data Product With Latest Version',
      version: '1.0.0',
      inputs: [{ id: 'PaymentProcessed', version: 'latest' }],
      outputs: [{ id: 'PaymentProcessed', version: 'latest' }],
    },
  },
];

// Service that uses caret range pattern (^1.0.0) in sends configuration
export const mockServiceWithCaretRangeSends = {
  id: 'OrderProcessingService',
  collection: 'services',
  data: {
    id: 'OrderProcessingService',
    version: '1.0.0',
    pathToFile: 'services/OrderProcessingService/index.md',
    sends: [
      {
        id: 'PaymentProcessed',
        version: '^1.0.0',
      },
    ],
  },
};

// Service that uses caret range pattern (^1.0.0) in receives configuration
export const mockServiceWithCaretRangeReceives = {
  id: 'InventoryService',
  collection: 'services',
  data: {
    id: 'InventoryService',
    version: '1.0.0',
    pathToFile: 'services/InventoryService/index.md',
    receives: [
      {
        id: 'PaymentProcessed',
        version: '^1.0.0',
      },
    ],
  },
};

// Service that uses tilde range pattern (~1.2.0) in receives configuration
export const mockServiceWithTildeRange = {
  id: 'NotificationService',
  collection: 'services',
  data: {
    id: 'NotificationService',
    version: '1.0.0',
    pathToFile: 'services/NotificationService/index.md',
    receives: [
      {
        id: 'PaymentProcessed',
        version: '~1.2.0',
      },
    ],
  },
};

// Service that uses x-pattern (1.x) in receives configuration
export const mockServiceWithXPattern = {
  id: 'AnalyticsService',
  collection: 'services',
  data: {
    id: 'AnalyticsService',
    version: '1.0.0',
    pathToFile: 'services/AnalyticsService/index.md',
    receives: [
      {
        id: 'PaymentProcessed',
        version: '1.x',
      },
    ],
  },
};

// Service that uses x-pattern (1.2.x) in sends configuration
export const mockServiceWithXPatternMinor = {
  id: 'AuditService',
  collection: 'services',
  data: {
    id: 'AuditService',
    version: '1.0.0',
    pathToFile: 'services/AuditService/index.md',
    sends: [
      {
        id: 'PaymentProcessed',
        version: '1.2.x',
      },
    ],
  },
};

// Service that uses caret range with channel configuration
export const mockServiceWithCaretRangeAndChannel = {
  id: 'OrderServiceWithChannel',
  collection: 'services',
  data: {
    id: 'OrderServiceWithChannel',
    version: '1.0.0',
    pathToFile: 'services/OrderServiceWithChannel/index.md',
    sends: [
      {
        id: 'PaymentProcessed',
        version: '^1.0.0',
        to: [{ id: 'SNSChannel', version: '1.0.0' }],
      },
    ],
  },
};

// Service that uses x-pattern with channel configuration
export const mockServiceWithXPatternAndChannel = {
  id: 'ConsumerServiceWithChannel',
  collection: 'services',
  data: {
    id: 'ConsumerServiceWithChannel',
    version: '1.0.0',
    pathToFile: 'services/ConsumerServiceWithChannel/index.md',
    receives: [
      {
        id: 'PaymentProcessed',
        version: '1.x',
        from: [{ id: 'SQSChannel', version: '1.0.0' }],
      },
    ],
  },
};
