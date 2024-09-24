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
];
