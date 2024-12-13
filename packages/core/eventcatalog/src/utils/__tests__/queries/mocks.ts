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
          id: 'GetLatestOrder',
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
          id: 'GetLatestOrder',
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
          id: 'GetInventoryItem',
          version: '>1.2.0',
        },
        {
          id: 'GetProductStatus',
        },
        {
          id: 'GetStockStatus',
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
          id: 'GetInventoryItem',
        },
        {
          id: 'GetStockStatus',
          version: '*',
        },
      ],
    },
  },
  {
    id: 'LegacyOrderService',
    slug: 'LegacyOrderService',
    collection: 'services',
    data: {
      id: 'LegacyOrderService',
      version: '0.0.1',
      receives: [
        {
          id: 'GetOrderLegacy',
        },
      ],
      sends: [
        {
          id: 'GetOrderLegacy',
        },
      ],
    },
  },
];

export const mockQueries = [
  {
    id: 'GetLatestOrder',
    slug: 'GetLatestOrder',
    collection: 'queries',
    data: {
      id: 'GetLatestOrder',
      version: '0.0.1',
    },
  },
  {
    id: 'GetInventoryItem',
    slug: 'GetInventoryItem',
    collection: 'queries',
    data: {
      id: 'GetInventoryItem',
      version: '1.5.1',
    },
  },
  {
    id: 'GetStockStatus',
    slug: 'GetStockStatus',
    collection: 'queries',
    data: {
      id: 'GetStockStatus',
      version: '0.0.1',
    },
  },
  {
    id: 'GetStockStatus',
    slug: 'GetStockStatus',
    collection: 'queries',
    data: {
      id: 'GetStockStatus',
      version: '1.0.0',
    },
  },
  {
    id: 'GetProductStatus',
    slug: 'GetProductStatus',
    collection: 'queries',
    data: {
      id: 'GetProductStatus',
      version: '0.0.1',
    },
  },
  {
    id: 'GetOrderLegacy',
    slug: 'GetOrderLegacy',
    collection: 'queries',
    data: {
      id: 'GetOrderLegacy',
      version: '0.0.1',
    },
  },
];
