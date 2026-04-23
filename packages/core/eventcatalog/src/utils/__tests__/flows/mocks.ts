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

// Parent flow that references SubFlow as a step, plus the SubFlow itself, for
// testing inline sub-flow expansion precomputation.
export const mockFlowsWithSubFlow = [
  {
    id: 'Parent/index.mdx',
    slug: 'parent',
    body: '',
    collection: 'flows',
    data: {
      id: 'ParentFlow',
      name: 'Parent Flow',
      version: '1.0.0',
      steps: [
        {
          id: 'start',
          type: 'node',
          title: 'Start',
          next_step: { id: 'sub', label: 'Run sub-flow' },
        },
        {
          id: 'sub',
          title: 'Sub Flow Reference',
          flow: {
            id: 'SubFlow',
            version: '1.0.0',
          },
          next_step: { id: 'end', label: 'Finish' },
        },
        {
          id: 'end',
          type: 'node',
          title: 'End',
        },
      ],
    },
  },
  {
    id: 'Sub/index.mdx',
    slug: 'sub',
    body: '',
    collection: 'flows',
    data: {
      id: 'SubFlow',
      name: 'Sub Flow',
      version: '1.0.0',
      steps: [
        {
          id: 'inner_1',
          type: 'node',
          title: 'Inner Step 1',
          next_step: { id: 'inner_2' },
        },
        {
          id: 'inner_2',
          type: 'node',
          title: 'Inner Step 2',
        },
      ],
    },
  },
];

// Cycle: A references B, B references A. Expansion must terminate.
export const mockFlowsWithCycle = [
  {
    id: 'A/index.mdx',
    slug: 'a',
    body: '',
    collection: 'flows',
    data: {
      id: 'FlowA',
      name: 'Flow A',
      version: '1.0.0',
      steps: [
        {
          id: 'a_call_b',
          title: 'Call B',
          flow: { id: 'FlowB', version: '1.0.0' },
        },
      ],
    },
  },
  {
    id: 'B/index.mdx',
    slug: 'b',
    body: '',
    collection: 'flows',
    data: {
      id: 'FlowB',
      name: 'Flow B',
      version: '1.0.0',
      steps: [
        {
          id: 'b_call_a',
          title: 'Call A',
          flow: { id: 'FlowA', version: '1.0.0' },
        },
      ],
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
