export const mockDomains = [
  {
    id: 'domains/Shipping/index.mdx',
    slug: 'domains/Shipping',
    collection: 'domains',
    data: {
      id: 'Shipping',
      name: 'Shipping',
      version: '0.0.1',
      services: [{ id: 'LocationService', version: '0.0.1' }],
      domains: [{ id: 'Checkout', version: '0.0.1' }],
    },
  },
  {
    id: 'domains/Checkout/index.mdx',
    slug: 'domains/Checkout',
    collection: 'domains',
    data: {
      id: 'Checkout',
      name: 'Checkout',
      version: '0.0.1',
      services: [{ id: 'OrderService' /* version: latest */ }, { id: 'PaymentService', version: '0.0.1' }],
    },
  },
  {
    id: 'domains/Notification/index.mdx',
    slug: 'domains/Notification',
    collection: 'domains',
    data: {
      id: 'Notification',
      name: 'Notification',
      version: '0.0.1',
      services: [{ id: 'MailService' }],
    },
  },
];

export const mockServices = [
  {
    id: 'services/LocationService/index.mdx',
    slug: 'services/LocationService',
    collection: 'services',
    data: {
      id: 'LocationService',
      version: '0.0.1',
      receives: [{ id: 'OrderPlaced', version: '0.0.1' }],
    },
  },
  {
    id: 'services/OrderService/versioned/001/index.mdx',
    slug: 'services/OrderService/versioned/001',
    collection: 'services',
    data: {
      id: 'OrderService',
      version: '0.0.1',
      receives: [{ id: 'PlaceOrder', version: '>1.5.0' }],
      sends: [{ id: 'OrderPlaced', version: '0.0.1' }],
    },
  },
  {
    id: 'services/OrderService/index.mdx',
    slug: 'services/OrderService',
    collection: 'services',
    data: {
      id: 'OrderService',
      version: '1.0.0',
      receives: [{ id: 'PlaceOrder', version: '>1.5.0' }],
      sends: [{ id: 'OrderPlaced', version: '0.0.1' }],
    },
  },
  {
    id: 'services/PaymentService/index.mdx',
    slug: 'services/PaymentService',
    collection: 'services',
    data: {
      id: 'PaymentService',
      version: '0.0.1',
      receives: [{ id: 'OrderPlaced' }],
      sends: [{ id: 'PaymentPaid', version: 'x' }, { id: 'PaymentRefunded' }, { id: 'PaymentFailed', version: '^1.0.0' }],
    },
  },
  {
    id: 'services/ServiceWithoutDomains/index.mdx',
    slug: 'services/ServiceWithoutDomains',
    collection: 'services',
    data: {
      id: 'ServiceWithoutDomains',
      version: '0.0.1',
    },
  },
];

export const mockCommands = [
  // PlaceOrder
  {
    id: 'commands/PlaceOrder/versioned/100/index.mdx',
    slug: 'commands/PlaceOrder/versoined/100',
    collection: 'commands',
    data: {
      id: 'PlaceOrder',
      version: '1.0.0',
    },
  },
  {
    id: 'commands/PlaceOrder/versioned/150/index.mdx',
    slug: 'commands/PlaceOrder/versoined/150',
    collection: 'commands',
    data: {
      id: 'PlaceOrder',
      version: '1.5.0',
    },
  },
  {
    id: 'commands/PlaceOrder/versioned/177/index.mdx',
    slug: 'commands/PlaceOrder/versoined/177',
    collection: 'commands',
    data: {
      id: 'PlaceOrder',
      version: '1.7.7',
    },
  },
];

export const mockEvents = [
  // OrderPlaced
  {
    id: 'events/OrderPlaced/index.mdx',
    slug: 'events/OrderPlaced',
    collection: 'events',
    data: {
      id: 'OrderPlaced',
      version: '0.0.1',
    },
  },

  // PaymentPaid
  {
    id: 'events/PaymentPaid/versioned/001/index.mdx',
    slug: 'events/PaymentPaid/versioned/001',
    collection: 'events',
    data: {
      id: 'PaymentPaid',
      version: '0.0.1',
    },
  },
  {
    id: 'events/PaymentPaid/index.mdx',
    slug: 'events/PaymentPaid',
    collection: 'events',
    data: {
      id: 'PaymentPaid',
      version: '0.0.2',
    },
  },

  // PaymentRefunded
  {
    id: 'events/PaymentRefunded/index.mdx',
    slug: 'events/PaymentRefunded',
    collection: 'events',
    data: {
      id: 'PaymentRefunded',
      version: '0.0.1',
    },
  },
  {
    id: 'events/PaymentRefunded/index.mdx',
    slug: 'events/PaymentRefunded',
    collection: 'events',
    data: {
      id: 'PaymentRefunded',
      version: '1.0.0',
    },
  },

  // PaymentFailed
  {
    id: 'events/PaymentFailed/index.mdx',
    slug: 'events/PaymentFailed',
    collection: 'events',
    data: {
      id: 'PaymentFailed',
      version: '0.0.1',
    },
  },
  {
    id: 'events/PaymentFailed/index.mdx',
    slug: 'events/PaymentFailed',
    collection: 'events',
    data: {
      id: 'PaymentFailed',
      version: '1.0.0',
    },
  },
  {
    id: 'events/PaymentFailed/index.mdx',
    slug: 'events/PaymentFailed',
    collection: 'events',
    data: {
      id: 'PaymentFailed',
      version: '2.0.0',
    },
  },
];

export const mockUbiquitousLanguages = [
  {
    id: 'domains/Shipping/ubiquitous-language.mdx',
    slug: 'domains/Shipping/ubiquitous-language',
    collection: 'ubiquitousLanguages',
    data: {
      id: 'Shipping',
      dictionary: [{ id: 'Payment', name: 'Payment' }],
    },
  },
];
