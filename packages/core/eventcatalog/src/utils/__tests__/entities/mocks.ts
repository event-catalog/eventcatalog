export const mockServices = [
  {
    id: 'OrderService',
    slug: 'OrderService',
    collection: 'services',
    data: {
      id: 'OrderService',
      version: '0.0.1',
      entities: [
        {
          id: 'Supplier',
          version: '0.0.1',
        },
      ],
    },
  },
];

export const mockDomains = [
  {
    id: 'SupplierDomain',
    slug: 'SupplierDomain',
    collection: 'domains',
    data: {
      id: 'SupplierDomain',
      version: '0.0.1',
      entities: [
        {
          id: 'Supplier',
          version: '0.0.1',
        },
      ],
    },
  },
];

export const mockEntities = [
  {
    id: 'Supplier',
    slug: 'Supplier',
    collection: 'entities',
    data: {
      id: 'Supplier',
      version: '0.0.1',
      identifier: 'id',
      aggregateRoot: true,
      properties: [
        {
          id: 'name',
          type: 'string',
          required: true,
          description: 'The name of the supplier',
        },
      ],
    },
  },
];
