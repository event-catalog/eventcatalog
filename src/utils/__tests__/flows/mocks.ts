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

export const mockServices = [
  {
    slug: 'SubscriptionService',
    collection: 'services',
    data: {
      id: 'SubscriptionService',
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
  {
    id: 'Subscriptions/CancelSubscription/index.mdx',
    slug: 'subscriptions/CancelSubscription',
    body: '',
    collection: 'flows',
    data: {
      steps: [
        {
          id: 'cancel_subscription_initiated',
          title: 'Cancels Subscription',
          actor: {
            name: 'User',
          },
          next_step: {
            id: 'cancel_subscription_request',
            label: 'Initiate subscription cancellation',
          },
        },
        {
          id: 'cancel_subscription_request',
          title: 'Cancel Subscription',
          message: {
            id: 'CancelSubscription',
            version: '0.0.1',
          },
          next_step: {
            id: 'subscription_service',
            label: 'Proceed to subscription service',
          },
        },
        {
          id: 'subscription_service',
          title: 'Subscription Service',
          service: {
            id: 'SubscriptionService',
            version: 'latest',
          },
          next_steps: [
            {
              id: 'subscription_cancelled',
              label: 'Successful cancellation',
            },
            {
              id: 'subscription_rejected',
              label: 'Failed cancellation',
            },
          ],
        },
        {
          id: 'subscription_cancelled',
          title: 'Subscription has been cancelled',
          message: {
            id: 'UserSubscriptionCancelled',
            version: '0.0.1',
          },
        },
        {
          id: 'subscription_rejected',
          title: 'Subscription cancellation has been rejected',
        },
      ],
      id: 'CancelSubscription',
      name: 'User Cancels Subscription',
      summary: 'Flow for when a user has cancelled a subscription',
      version: '1.0.0',
      // type: 'node',
    },
  },
];
