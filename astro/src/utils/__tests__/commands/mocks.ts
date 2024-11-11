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
          id: 'AdjustOrder',
          version: '0.0.1',
        },
      ],
      receives: [
        {
          id: 'PlaceOrder',
          version: '>1.5.0',
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
          id: 'AdjustOrder',
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
      sends: [{ id: 'NotifyLowStock' }],
    },
  },
  {
    id: 'NotificationService',
    slug: 'NotificationService',
    collection: 'services',
    data: {
      id: 'NotificationService',
      version: '0.0.1',
      receives: [{ id: 'NotifyLowStock', version: 'latest' }],
    },
  },
  {
    id: 'LegacyOrderService',
    slug: 'LegacyOrderService',
    collection: 'services',
    data: {
      id: 'LegacyOrderService',
      version: '0.0.1',
      receives: [{ id: 'GetOrder', version: 'latest' }],
      sends: [{ id: 'GetOrder', version: 'latest' }],
    },
  },
];

export const mockCommands = [
  {
    id: 'AdjustOrder',
    slug: 'AdjustOrder',
    collection: 'commands',
    data: {
      id: 'AdjustOrder',
      version: '0.0.1',
    },
  },
  {
    id: 'PlaceOrder',
    slug: 'PlaceOrder',
    collection: 'commands',
    data: {
      id: 'PlaceOrder',
      version: '1.5.1',
    },
  },
  {
    id: 'PlaceOrder',
    slug: 'PlaceOrder',
    collection: 'commands',
    data: {
      id: 'PlaceOrder',
      version: '2.0.1',
    },
  },
  {
    id: 'NotifyLowStock',
    slug: 'NotifyLowStock',
    collection: 'commands',
    data: {
      id: 'NotifyLowStock',
      version: '2.0.0',
    },
  },
  {
    id: 'NotifyLowStock',
    slug: 'NotifyLowStock',
    collection: 'commands',
    data: {
      id: 'NotifyLowStock',
      version: '2.0.1',
    },
  },
  {
    id: 'GetOrder',
    slug: 'GetOrder',
    collection: 'commands',
    data: {
      id: 'GetOrder',
      version: '0.0.1',
    },
  },
];
