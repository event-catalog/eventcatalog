export const mockEvents = [
  {
    slug: 'PaymentInitiated',
    collection: 'events',
    data: {
      id: 'PaymentInitiated',
      version: '0.0.1',
    },
  },
  {
    slug: 'PaymentProcessed',
    collection: 'events',
    data: {
      id: 'PaymentProcessed',
      version: '0.0.1',
    },
  },
];

export const mockFlow = [
  {
    id: 'Payment/PaymentProcessed/index.mdx',
    slug: 'payment/paymentprocessed',
    body: '',
    collection: 'flows',
    data: {
      steps: [
        {
          id: 1,
          type: 'node',
          title: 'Order Placed',
          next_step: {
            id: 2,
            label: 'Proceed to payment',
          },
        },
        {
          id: 2,
          title: 'Payment Initiated',
          message: {
            id: 'PaymentInitiated',
            version: '0.0.1',
          },
          next_steps: [
            {
              id: 3,
              label: 'Payment successful',
            },
            {
              id: 4,
              label: 'Payment failed',
            },
          ],
        },
        {
          id: 3,
          title: 'Payment Processed',
          message: {
            id: 'PaymentProcessed',
            version: '0.0.1',
          },
        },
        {
          id: 4,
          type: 'node',
          title: 'Payment Failed',
        },
      ],
      id: 'PaymentFlow',
      name: 'Payment Flow for E-commerce',
      summary: 'Business flow for processing payments in an e-commerce platform',
      version: '1.0.0',
      type: 'node',
    },
  },
];

export const mockFlowByIds = [
  {
    id: 'Payment/PaymentProcessed/index.mdx',
    slug: 'payment/paymentprocessed',
    body: '',
    collection: 'flows',
    data: {
      steps: [
        {
          id: 1,
          type: 'node',
          title: 'Order Placed',
          next_step: 2,
        },
        {
          id: 2,
          title: 'Payment Initiated',
          message: {
            id: 'PaymentInitiated',
            version: '0.0.1',
          },
          next_steps: [3, 4],
        },
        {
          id: 3,
          title: 'Payment Processed',
          message: {
            id: 'PaymentProcessed',
            version: '0.0.1',
          },
        },
        {
          id: 4,
          type: 'node',
          title: 'Payment Failed',
        },
      ],
      id: 'PaymentFlow',
      name: 'Payment Flow for E-commerce',
      summary: 'Business flow for processing payments in an e-commerce platform',
      version: '1.0.0',
      type: 'node',
    },
  },
];
