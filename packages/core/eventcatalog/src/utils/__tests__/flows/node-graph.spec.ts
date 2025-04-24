import { getNodesAndEdges } from '../../node-graphs/flows-node-graph';
import { expect, describe, it, vi, beforeEach } from 'vitest';
import { mockEvents, mockFlow, mockFlowByIds, mockServices } from './mocks';
import { getCollection } from 'astro:content';
let expectedNodes: any;

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
      if (key === 'services') {
        return Promise.resolve(mockServices);
      }
      return Promise.resolve([]);
    },
  };
});

describe('Flows NodeGraph', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    expectedNodes = [
      {
        id: 'step-1',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: expect.anything(),
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'step',
      },
      {
        id: 'step-2',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: expect.anything(),
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'events',
      },
      {
        id: 'step-3',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: {
          mode: 'simple',
          step: {
            id: 3,
            title: 'Payment Processed',
            message: {
              slug: 'PaymentProcessed',
              collection: 'events',
              data: {
                id: 'PaymentProcessed',
                version: '0.0.1',
              },
            },
            type: 'events',
          },
          showTarget: true,
          showSource: true,
          message: {
            slug: 'PaymentProcessed',
            collection: 'events',
            data: {
              id: 'PaymentProcessed',
              version: '0.0.1',
            },
          },
        },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'events',
      },
      {
        id: 'step-4',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: {
          mode: 'simple',
          step: {
            id: 4,
            type: 'step',
            title: 'Payment Failed',
          },
          showTarget: true,
          showSource: true,
        },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'step',
      },
    ];
  });

  describe('getNodesAndEdges', () => {
    it('should return the correct nodes and edges for a given flow', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'PaymentFlow', version: '1.0.0' });

      const expectedEdges = [
        {
          id: 'step-1-step-2',
          source: 'step-1',
          target: 'step-2',
          type: 'flow-edge',
          animated: true,
          markerEnd: expect.objectContaining({ type: 'arrowclosed' }),
          style: expect.any(Object),
        },
      ];

      expect(nodes).toEqual(expect.arrayContaining(expectedNodes));

      expect(edges).toEqual(expect.arrayContaining([expect.objectContaining(expectedEdges[0])]));
    });

    it('should resolves the correct node when it is a service with version as latest', async () => {
      const { nodes } = await getNodesAndEdges({ id: 'CancelSubscription', version: '1.0.0' });

      expect(nodes).toContainEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            step: expect.objectContaining({
              type: 'services',
              service: expect.objectContaining({
                data: {
                  id: 'SubscriptionService',
                  version: '0.0.1',
                },
              }),
            }),
          }),
        })
      );
    });

    describe('when steps are referenced only by id', () => {
      it('should return the correct nodes and edges', async () => {
        // TODO: This mock seems to be overriding the first mock...
        // Mock
        vi.mock('astro:content', async (importOriginal) => {
          return {
            ...(await importOriginal<typeof import('astro:content')>()),
            // this will only affect "foo" outside of the original module
            getCollection: (key: string) => {
              if (key === 'flows') {
                return Promise.resolve(mockFlowByIds);
              }
              if (key === 'events') {
                return Promise.resolve(mockEvents);
              }
              if (key === 'services') {
                return Promise.resolve(mockServices);
              }
              return Promise.resolve([]);
            },
          };
        });

        const { nodes, edges } = await getNodesAndEdges({ id: 'PaymentFlow', version: '1.0.0' });

        const expectedNodes = [
          {
            id: 'step-1',
            sourcePosition: 'right',
            targetPosition: 'left',
            data: expect.anything(),
            position: { x: expect.any(Number), y: expect.any(Number) },
            type: 'step',
          },
          {
            id: 'step-2',
            sourcePosition: 'right',
            targetPosition: 'left',
            data: expect.anything(),
            position: { x: expect.any(Number), y: expect.any(Number) },
            type: 'events',
          },
          {
            id: 'step-3',
            sourcePosition: 'right',
            targetPosition: 'left',
            data: {
              mode: 'simple',
              step: {
                id: 3,
                title: 'Payment Processed',
                message: {
                  slug: 'PaymentProcessed',
                  collection: 'events',
                  data: {
                    id: 'PaymentProcessed',
                    version: '0.0.1',
                  },
                },
                type: 'events',
              },
              showTarget: true,
              showSource: true,
              message: {
                slug: 'PaymentProcessed',
                collection: 'events',
                data: {
                  id: 'PaymentProcessed',
                  version: '0.0.1',
                },
              },
            },
            position: { x: expect.any(Number), y: expect.any(Number) },
            type: 'events',
          },
          {
            id: 'step-4',
            sourcePosition: 'right',
            targetPosition: 'left',
            data: {
              mode: 'simple',
              step: {
                id: 4,
                type: 'step',
                title: 'Payment Failed',
              },
              showTarget: true,
              showSource: true,
            },
            position: { x: expect.any(Number), y: expect.any(Number) },
            type: 'step',
          },
        ];

        const expectedEdges = [
          {
            id: 'step-1-step-2',
            source: 'step-1',
            target: 'step-2',
            type: 'flow-edge',
            animated: true,
            markerEnd: expect.objectContaining({ type: 'arrowclosed' }),
            style: expect.any(Object),
          },
        ];

        expect(nodes).toEqual(expect.arrayContaining(expectedNodes));
        expect(edges).toEqual(expect.arrayContaining([expect.objectContaining(expectedEdges[0])]));
      });
    });

    it('returns empty nodes and edges if no flow is found', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'UnknownFlow', version: '1.0.0' });

      expect(nodes).toEqual([]);
      expect(edges).toEqual([]);
    });
  });
});
