import { MarkerType } from '@xyflow/react';
import { getNodesAndEdgesForQueries as getNodesAndEdges } from '../../node-graphs/message-node-graph';
import { expect, describe, it, vi, beforeEach } from 'vitest';
import { mockQueries, mockServices, mockChannels, mockDataProducts } from './mocks';

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getCollection: (key: string) => {
      if (key === 'services') {
        return Promise.resolve(mockServices);
      }
      if (key === 'queries') {
        return Promise.resolve(mockQueries);
      }
      if (key === 'channels') {
        return Promise.resolve(mockChannels);
      }
      if (key === 'data-products') {
        return Promise.resolve(mockDataProducts);
      }
      return Promise.resolve([]);
    },
  };
});

describe('Queries NodeGraph', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getNodesAndEdges', () => {
    it('should return nodes and edges for a given query', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'GetLatestOrder', version: '0.0.1' });

      // The middle node itself, the service
      const expectedQueryNode = {
        id: 'GetLatestOrder-0.0.1',
        sourcePosition: 'right',
        targetPosition: 'left',
        // data: { mode: 'simple', message: expect.anything(), showTarget: false, showSource: false },
        data: expect.anything(),
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'queries',
      };

      const expectedProducerNode = {
        id: 'OrderService-0.0.1',
        type: 'services',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode: 'simple', service: { ...mockServices[0].data } },
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      const expectedConsumerNode = {
        id: 'PaymentService-0.0.1',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: {
          title: 'PaymentService',
          mode: 'simple',
          service: { ...mockServices[1].data },
        },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'services',
      };

      const expectedEdges = expect.arrayContaining([
        expect.objectContaining({
          id: 'OrderService-0.0.1-GetLatestOrder-0.0.1',
          source: 'OrderService-0.0.1',
          target: 'GetLatestOrder-0.0.1',
          label: 'requests',
        }),
        expect.objectContaining({
          id: 'GetLatestOrder-0.0.1-PaymentService-0.0.1',
          source: 'GetLatestOrder-0.0.1',
          target: 'PaymentService-0.0.1',
          label: 'accepts',
        }),
      ]);

      expect(nodes).toEqual(
        expect.arrayContaining([
          // Nodes on the left
          expect.objectContaining(expectedConsumerNode),

          // The event node itself
          expect.objectContaining(expectedQueryNode),

          // Nodes on the right
          expect.objectContaining(expectedProducerNode),
        ])
      );

      expect(edges).toEqual(expectedEdges);
    });

    it('if the query is produced and consumed by a service it will render a custom edge', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'GetOrderLegacy', version: '0.0.1' });

      // The middle node itself, the service
      const expectedQueryNode = {
        id: 'GetOrderLegacy-0.0.1',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode: 'simple', message: expect.anything() },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'queries',
      };

      const expectedProducerNode = {
        id: 'LegacyOrderService-0.0.1',
        type: 'services',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode: 'simple', service: { ...mockServices[4].data }, title: 'LegacyOrderService' },
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      const expectedConsumerNode = {
        id: 'LegacyOrderService-0.0.1',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: {
          title: 'LegacyOrderService',
          mode: 'simple',
          service: { ...mockServices[4].data },
        },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'services',
      };

      const expectedEdges = expect.arrayContaining([
        expect.objectContaining({
          id: 'LegacyOrderService-0.0.1-GetOrderLegacy-0.0.1',
          source: 'LegacyOrderService-0.0.1',
          target: 'GetOrderLegacy-0.0.1',
          label: 'requests',
        }),
        expect.objectContaining({
          id: 'GetOrderLegacy-0.0.1-LegacyOrderService-0.0.1',
          source: 'GetOrderLegacy-0.0.1',
          target: 'LegacyOrderService-0.0.1',
          label: 'accepts',
        }),
        expect.objectContaining({
          id: 'GetOrderLegacy-0.0.1-LegacyOrderService-0.0.1-both',
          source: 'GetOrderLegacy-0.0.1',
          target: 'LegacyOrderService-0.0.1',
          label: 'publishes and subscribes',
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 40,
            height: 40,
          },
        }),
      ]);

      expect(nodes).toEqual(
        expect.arrayContaining([
          // Nodes on the left
          expect.objectContaining(expectedConsumerNode),

          // The query node itself
          expect.objectContaining(expectedQueryNode),

          // Nodes on the right
          expect.objectContaining(expectedProducerNode),
        ])
      );

      expect(edges).toEqual(expectedEdges);
    });

    it('if the consumer of a query has defined a channel, it will render the channel node and edges', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'GetProductStatus', version: '0.0.1' });

      const expectedConsumerNode = {
        id: 'OrderService-0.0.1',
        type: 'services',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode: 'simple', service: { ...mockServices[0].data }, title: 'OrderService' },
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      const expectedChannelNode = {
        sourcePosition: 'right',
        targetPosition: 'left',
        id: 'EmailChannel-1.0.0',
        type: 'channels',
      };

      const expectedQueryNode = {
        id: 'GetProductStatus-0.0.1',
        sourcePosition: 'right',
        targetPosition: 'left',
        type: 'queries',
      };

      const expectedEdges = expect.arrayContaining([
        // Message to the channel
        expect.objectContaining({
          id: 'GetProductStatus-0.0.1-EmailChannel-1.0.0',
          source: 'GetProductStatus-0.0.1',
          target: 'EmailChannel-1.0.0',
        }),
        // Channel to the consumer
        expect.objectContaining({
          id: 'EmailChannel-1.0.0-OrderService-0.0.1',
          source: 'EmailChannel-1.0.0',
          target: 'OrderService-0.0.1',
        }),
      ]);

      expect(nodes).toEqual(
        expect.arrayContaining([
          // Nodes on the left
          expect.objectContaining(expectedConsumerNode),

          // channel
          expect.objectContaining(expectedChannelNode),

          // The query node itself
          expect.objectContaining(expectedQueryNode),
        ])
      );

      expect(edges).toEqual(expectedEdges);
    });

    it('if the producer of a query has defined a channel, it will render the channel node and edges', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'GetProductStatus', version: '0.0.1' });

      const expectedProducerNode = {
        id: 'InventoryService-0.0.1',
        type: 'services',
        sourcePosition: 'right',
        targetPosition: 'left',
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      const expectedChannelNode = {
        sourcePosition: 'right',
        targetPosition: 'left',
        id: 'EmailChannel-1.0.0',
        type: 'channels',
      };

      const expectedQueryNode = {
        id: 'GetProductStatus-0.0.1',
        sourcePosition: 'right',
        targetPosition: 'left',
        type: 'queries',
      };

      const expectedEdges = expect.arrayContaining([
        // Producer to the message
        expect.objectContaining({
          id: 'InventoryService-0.0.1-GetProductStatus-0.0.1',
          source: 'InventoryService-0.0.1',
          target: 'GetProductStatus-0.0.1',
          label: 'requests',
          animated: false,
        }),
        // Message to the channel
        expect.objectContaining({
          id: 'GetProductStatus-0.0.1-EmailChannel-1.0.0',
          source: 'GetProductStatus-0.0.1',
          target: 'EmailChannel-1.0.0',
          label: 'routes to',
          animated: false,
        }),
      ]);

      expect(nodes).toEqual(
        expect.arrayContaining([
          // Nodes on the left
          expect.objectContaining(expectedProducerNode),

          // channel
          expect.objectContaining(expectedChannelNode),

          // The query node itself
          expect.objectContaining(expectedQueryNode),
        ])
      );

      expect(edges).toEqual(expectedEdges);
    });

    it('returns empty nodes and edges if no query is found', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'UnknownQuery', version: '1.0.0' });

      expect(nodes).toEqual([]);
      expect(edges).toEqual([]);
    });

    it('should return nodes and edges for a given query using semver range', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'GetInventoryItem', version: '1.5.1' });

      // The middle node itself, the service
      const expectedQueryNode = {
        id: 'GetInventoryItem-1.5.1',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: expect.anything(),
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'queries',
      };

      const expectedProducerNode = {
        id: 'InventoryService-0.0.1',
        type: 'services',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode: 'simple', service: { ...mockServices[2].data } },
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      const expectedConsumerNode = {
        id: 'CatalogService-0.0.1',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { title: 'CatalogService', mode: 'simple', service: { ...mockServices[3].data } },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'services',
      };

      const expectedEdges = expect.arrayContaining([
        expect.objectContaining({
          id: 'InventoryService-0.0.1-GetInventoryItem-1.5.1',
          source: 'InventoryService-0.0.1',
          target: 'GetInventoryItem-1.5.1',
          label: 'requests',
        }),
        expect.objectContaining({
          id: 'GetInventoryItem-1.5.1-CatalogService-0.0.1',
          source: 'GetInventoryItem-1.5.1',
          target: 'CatalogService-0.0.1',
          label: 'accepts',
        }),
      ]);

      expect(nodes).toEqual(
        expect.arrayContaining([
          // Nodes on the left
          expect.objectContaining(expectedProducerNode),

          // The event node itself
          expect.objectContaining(expectedQueryNode),

          // Nodes on the right
          expect.objectContaining(expectedConsumerNode),
        ])
      );

      expect(edges).toEqual(expectedEdges);
    });

    describe('data products', () => {
      it('should render data product as a consumer when it has the query as an input', async () => {
        const { nodes, edges } = await getNodesAndEdges({ id: 'GetLatestOrder', version: '0.0.1' });

        const expectedDataProductConsumerNode = {
          id: 'OrderAnalytics-1.0.0',
          type: 'data-products',
          sourcePosition: 'right',
          targetPosition: 'left',
          data: {
            title: 'OrderAnalytics',
            mode: 'simple',
            dataProduct: expect.objectContaining({
              id: 'OrderAnalytics',
              version: '1.0.0',
            }),
          },
          position: { x: expect.any(Number), y: expect.any(Number) },
        };

        expect(nodes).toEqual(expect.arrayContaining([expect.objectContaining(expectedDataProductConsumerNode)]));

        expect(edges).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: 'GetLatestOrder-0.0.1-OrderAnalytics-1.0.0',
              source: 'GetLatestOrder-0.0.1',
              target: 'OrderAnalytics-1.0.0',
              label: 'consumed by',
            }),
          ])
        );
      });

      it('should render data product as a producer when it has the query as an output', async () => {
        const { nodes, edges } = await getNodesAndEdges({ id: 'GetLatestOrder', version: '0.0.1' });

        const expectedDataProductProducerNode = {
          id: 'OrderDataPipeline-1.0.0',
          type: 'data-products',
          sourcePosition: 'right',
          targetPosition: 'left',
          data: {
            mode: 'simple',
            dataProduct: expect.objectContaining({
              id: 'OrderDataPipeline',
              version: '1.0.0',
            }),
          },
          position: { x: expect.any(Number), y: expect.any(Number) },
        };

        expect(nodes).toEqual(expect.arrayContaining([expect.objectContaining(expectedDataProductProducerNode)]));

        expect(edges).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: 'OrderDataPipeline-1.0.0-GetLatestOrder-0.0.1',
              source: 'OrderDataPipeline-1.0.0',
              target: 'GetLatestOrder-0.0.1',
              label: 'produces',
            }),
          ])
        );
      });

      it('should render both services and data products as producers and consumers', async () => {
        const { nodes } = await getNodesAndEdges({ id: 'GetLatestOrder', version: '0.0.1' });

        // Should have service producer
        expect(nodes).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: 'OrderService-0.0.1',
              type: 'services',
            }),
          ])
        );

        // Should have service consumer
        expect(nodes).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: 'PaymentService-0.0.1',
              type: 'services',
            }),
          ])
        );

        // Should have data product producer
        expect(nodes).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: 'OrderDataPipeline-1.0.0',
              type: 'data-products',
            }),
          ])
        );

        // Should have data product consumer
        expect(nodes).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: 'OrderAnalytics-1.0.0',
              type: 'data-products',
            }),
          ])
        );
      });
    });
  });
});
