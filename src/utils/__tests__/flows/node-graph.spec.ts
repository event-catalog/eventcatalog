import { getNodesAndEdges } from '../../flows/node-graph';
import { expect, describe, it, vi, beforeEach } from 'vitest';

const mockEvents = [
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

const mockFlow = [
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
          paths: [
            {
              step: 2,
              label: 'Proceed to payment',
            },
          ],
        },
        {
          id: 2,
          title: 'Payment Initiated',
          message: {
            id: 'PaymentInitiated',
            version: '0.0.1',
          },
          paths: [
            {
              step: 3,
              label: 'Payment successful',
            },
            {
              step: 4,
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

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    // this will only affect "foo" outside of the original module
    getCollection: (key: string) => {
      if (key === 'flows') {
        return Promise.resolve(mockFlow);
      }
      if (key === 'events') {
        return Promise.resolve(mockEvents);
      }
      return Promise.resolve([]);
    },
  };
});

describe('Flows NodeGraph', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getNodesAndEdges', () => {
    it.only('should return nodes and edges for a given flow', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'PaymentFlow', version: '1.0.0' });

      const expectedNodes = [
        {
          id: 'step-1',
          sourcePosition: 'right',
          targetPosition: 'left',
          data: expect.anything(),
          position: { x: expect.any(Number), y: expect.any(Number) },
          type: 'node',
        },
        {
          id: 'step-2',
          sourcePosition: 'right',
          targetPosition: 'left',
          data: expect.anything(),
          position: { x: expect.any(Number), y: expect.any(Number) },
          type: 'message',
        },
      ];

      const expectedEdges = [
        {
          id: 'step-1-step-2',
          source: 'step-1',
          target: 'step-2',
          type: 'smoothstep',
          label: 'Proceed to payment',
          animated: false,
          markerEnd: { type: 'arrow' },
        },
      ];

      expect(nodes).toEqual(
        expect.arrayContaining([expect.objectContaining(expectedNodes[0]), expect.objectContaining(expectedNodes[1])])
      );

      expect(edges[0]).toEqual(expectedEdges[0]);
    });

    it('returns empty nodes and edges if no flow is found', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'UnknownFlow', version: '1.0.0' });

      expect(nodes).toEqual([]);
      expect(edges).toEqual([]);
    });
  });
});
