export const mockServices = [
  {
    id: 'OrderService',
    slug: 'OrderService',
    collection: 'services',
    data: {
      id: 'OrderService',
      version: '0.0.1',
      sends: [
        {
          id: 'OrderCreatedEvent',
          version: '0.0.1',
        },
      ],
    },
  },
  {
    id: 'PaymentService',
    slug: 'PaymentService',
    collection: 'services',
    data: {
      id: 'PaymentService',
      version: '0.0.1',
      receives: [
        {
          id: 'OrderCreatedEvent',
          version: '0.0.1',
        },
      ],
    },
  },
  {
    id: 'InventoryService',
    slug: 'InventoryService',
    collection: 'services',
    data: {
      id: 'InventoryService',
      version: '0.0.1',
      sends: [
        {
          id: 'InventoryAdjusted',
          version: '>1.2.0',
        },
        {
          id: 'ProductOutOfStock',
        },
        {
          id: 'ProductDiscontinued',
          version: 'latest',
        },
      ],
    },
  },
  {
    id: 'CatalogService',
    slug: 'CatalogService',
    collection: 'services',
    data: {
      id: 'CatalogService',
      version: '0.0.1',
      receives: [
        {
          id: 'InventoryAdjusted',
        },
        {
          id: 'ProductDiscontinued',
          version: '*',
        },
      ],
    },
  },
  {
    id: 'NotificationsService',
    slug: 'NotificationsService',
    collection: 'services',
    data: {
      id: 'NotificationsService',
      version: '0.0.1',
      receives: [
        {
          id: 'EmailSent',
        },
      ],
      sends: [
        {
          id: 'EmailSent',
        },
        {
          id: 'EmailVerified',
        },
      ],
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
];

export const mockEvents = [
  {
    id: 'OrderCreatedEvent',
    slug: 'OrderCreatedEvent',
    collection: 'events',
    data: {
      id: 'OrderCreatedEvent',
      version: '0.0.1',
    },
  },
  {
    id: 'InventoryAdjusted',
    slug: 'InventoryAdjusted',
    collection: 'events',
    data: {
      id: 'InventoryAdjusted',
      version: '1.5.1',
    },
  },
  {
    id: 'ProductOutOfStock',
    slug: 'ProductOutOfStock',
    collection: 'events',
    data: {
      id: 'ProductOutOfStock',
      version: '1.0.0',
    },
  },
  {
    id: 'ProductDiscontinued',
    slug: 'ProductDiscontinued',
    collection: 'events',
    data: {
      id: 'ProductDiscontinued',
      version: '0.0.1',
    },
  },
  {
    id: 'ProductDiscontinued',
    slug: 'ProductDiscontinued',
    collection: 'events',
    data: {
      id: 'ProductDiscontinued',
      version: '1.0.0',
    },
  },
  {
    id: 'EmailSent',
    slug: 'EmailSent',
    collection: 'events',
    data: {
      id: 'EmailSent',
      version: '1.0.0',
    },
  },
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
