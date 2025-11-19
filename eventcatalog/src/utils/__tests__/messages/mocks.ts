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
