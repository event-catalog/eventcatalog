import { getNodesAndEdges } from '../../node-graphs/flows-node-graph';
import { expect, describe, it, vi, beforeEach } from 'vitest';
import { mockAgents, mockContainers, mockDataProducts, mockEvents, mockFlow, mockFlowByIds, mockServices } from './mocks';
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
      if (key === 'agents') {
        return Promise.resolve(mockAgents);
      }
      if (key === 'containers') {
        return Promise.resolve(mockContainers);
      }
      if (key === 'data-products') {
        return Promise.resolve(mockDataProducts);
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
            id: 'PaymentProcessed',
            version: '0.0.1',
          },
          contextMenu: expect.any(Array),
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

    it('attaches a contextMenu to message step nodes so right-click shows the custom menu (issue #2216)', async () => {
      const { nodes } = await getNodesAndEdges({ id: 'PaymentFlow', version: '1.0.0' });

      const messageNode = nodes.find((n: any) => n.id === 'step-3');
      expect(messageNode).toBeDefined();
      expect(messageNode?.data.contextMenu).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            label: 'Read documentation',
            href: expect.stringContaining('/docs/events/PaymentProcessed/0.0.1'),
          }),
          expect.objectContaining({
            label: 'Focus node',
            href: expect.stringContaining('/visualiser/events/PaymentProcessed/0.0.1'),
          }),
          expect.objectContaining({ label: 'Read changelog' }),
        ])
      );
    });

    it('attaches a contextMenu to service step nodes', async () => {
      const { nodes } = await getNodesAndEdges({ id: 'CancelSubscription', version: '1.0.0' });

      const serviceNode = nodes.find((n: any) => n.data?.service?.data?.id === 'SubscriptionService');
      expect(serviceNode).toBeDefined();
      expect(serviceNode?.data.contextMenu).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            label: 'Read documentation',
            href: expect.stringContaining('/docs/services/SubscriptionService/0.0.1'),
          }),
          expect.objectContaining({
            label: 'Focus node',
            href: expect.stringContaining('/visualiser/services/SubscriptionService/0.0.1'),
          }),
        ])
      );
    });

    it('resolves agent step nodes and attaches an agent context menu', async () => {
      const { nodes } = await getNodesAndEdges({ id: 'DataProductFlow', version: '1.0.0' });

      const agentNode = nodes.find((n: any) => n.id === 'step-fraud-review');

      expect(agentNode).toEqual(
        expect.objectContaining({
          type: 'agents',
          data: expect.objectContaining({
            agent: expect.objectContaining({
              id: 'FraudReviewAgent',
              version: '1.0.0',
            }),
            contextMenu: expect.arrayContaining([
              expect.objectContaining({
                label: 'Read documentation',
                href: expect.stringContaining('/docs/agents/FraudReviewAgent/1.0.0'),
              }),
              expect.objectContaining({
                label: 'Focus node',
                href: expect.stringContaining('/visualiser/agents/FraudReviewAgent/1.0.0'),
              }),
            ]),
          }),
        })
      );
    });

    it('resolves container step nodes to the latest container version when no version is given', async () => {
      const { nodes } = await getNodesAndEdges({ id: 'DataStoreFlow', version: '1.0.0' });

      const containerNode = nodes.find((n: any) => n.id === 'step-orders-db');

      expect(containerNode).toEqual(
        expect.objectContaining({
          type: 'data',
          data: expect.objectContaining({
            data: expect.objectContaining({
              id: 'OrdersDB',
              version: '1.0.0',
              container_type: 'database',
            }),
            container: expect.objectContaining({
              id: 'OrdersDB',
              version: '1.0.0',
            }),
            contextMenu: expect.arrayContaining([
              expect.objectContaining({
                label: 'Read documentation',
                href: expect.stringContaining('/docs/containers/OrdersDB/1.0.0'),
              }),
              expect.objectContaining({
                label: 'Focus node',
                href: expect.stringContaining('/visualiser/containers/OrdersDB/1.0.0'),
              }),
            ]),
          }),
        })
      );
    });

    it('resolves data product step nodes to the latest data product version when no version is given', async () => {
      const { nodes } = await getNodesAndEdges({ id: 'DataProductFlow', version: '1.0.0' });

      const dataProductNode = nodes.find((n: any) => n.id === 'step-order-analytics');

      expect(dataProductNode).toEqual(
        expect.objectContaining({
          type: 'data-products',
          data: expect.objectContaining({
            dataProduct: expect.objectContaining({
              id: 'OrderAnalytics',
              version: '1.0.0',
            }),
            contextMenu: expect.arrayContaining([
              expect.objectContaining({
                label: 'Read documentation',
                href: expect.stringContaining('/docs/data-products/OrderAnalytics/1.0.0'),
              }),
              expect.objectContaining({
                label: 'Focus node',
                href: expect.stringContaining('/visualiser/data-products/OrderAnalytics/1.0.0'),
              }),
            ]),
          }),
        })
      );
    });

    it('does not attach a contextMenu to plain step nodes (no resource)', async () => {
      const { nodes } = await getNodesAndEdges({ id: 'PaymentFlow', version: '1.0.0' });

      const plainStep = nodes.find((n: any) => n.id === 'step-1');
      expect(plainStep).toBeDefined();
      expect(plainStep?.data.contextMenu).toBeUndefined();
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
              if (key === 'agents') {
                return Promise.resolve(mockAgents);
              }
              if (key === 'containers') {
                return Promise.resolve(mockContainers);
              }
              if (key === 'data-products') {
                return Promise.resolve(mockDataProducts);
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
                id: 'PaymentProcessed',
                version: '0.0.1',
              },
              contextMenu: expect.any(Array),
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

    it('should populate actor node data with name and summary from the actor step', async () => {
      const { nodes } = await getNodesAndEdges({ id: 'CancelSubscription', version: '1.0.0' });

      const actorNode = nodes.find((node: any) => node.type === 'actor');

      expect(actorNode).toBeDefined();
      expect(actorNode?.data?.name).toBe('User');
    });

    it('returns empty nodes and edges if no flow is found', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'UnknownFlow', version: '1.0.0' });

      expect(nodes).toEqual([]);
      expect(edges).toEqual([]);
    });
  });
});
