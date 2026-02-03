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

export const mockEntities = [
  {
    id: 'PaymentAggregate-1.0.0',
    collection: 'entities',
    data: {
      id: 'PaymentAggregate',
      name: 'Payment Aggregate',
      version: '1.0.0',
      aggregateRoot: true,
      sends: [{ id: 'PaymentProcessed', version: '0.0.1' }],
      receives: [],
    },
  },
  {
    id: 'OrderAggregate-1.0.0',
    collection: 'entities',
    data: {
      id: 'OrderAggregate',
      name: 'Order Aggregate',
      version: '1.0.0',
      aggregateRoot: true,
      sends: [],
      receives: [{ id: 'PaymentProcessed', version: '0.0.1' }],
    },
  },
  {
    id: 'EntityWithLatestVersion-1.0.0',
    collection: 'entities',
    data: {
      id: 'EntityWithLatestVersion',
      name: 'Entity With Latest Version',
      version: '1.0.0',
      sends: [{ id: 'PaymentProcessed', version: 'latest' }],
      receives: [{ id: 'PaymentProcessed', version: 'latest' }],
    },
  },
  {
    id: 'EntityWithNoMessaging-1.0.0',
    collection: 'entities',
    data: {
      id: 'EntityWithNoMessaging',
      name: 'Entity With No Messaging',
      version: '1.0.0',
    },
  },
];

// Mock event with hydrated entity producer for testing entity integration
export const mockEventWithEntityProducer = {
  id: 'EntityProducedEvent-1.0.0',
  collection: 'events',
  data: {
    id: 'EntityProducedEvent',
    name: 'Entity Produced Event',
    version: '1.0.0',
    producers: [
      {
        id: 'PaymentAggregate-1.0.0',
        collection: 'entities',
        data: {
          id: 'PaymentAggregate',
          name: 'Payment Aggregate',
          version: '1.0.0',
        },
      },
    ],
    consumers: [],
  },
};

// Mock event with hydrated entity consumer for testing entity integration
export const mockEventWithEntityConsumer = {
  id: 'EntityConsumedEvent-1.0.0',
  collection: 'events',
  data: {
    id: 'EntityConsumedEvent',
    name: 'Entity Consumed Event',
    version: '1.0.0',
    producers: [],
    consumers: [
      {
        id: 'OrderAggregate-1.0.0',
        collection: 'entities',
        data: {
          id: 'OrderAggregate',
          name: 'Order Aggregate',
          version: '1.0.0',
        },
      },
    ],
  },
};
