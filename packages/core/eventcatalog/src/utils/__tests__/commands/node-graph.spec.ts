import { MarkerType } from '@xyflow/react';
import { getNodesAndEdgesForCommands as getNodesAndEdges } from '../../node-graphs/message-node-graph';
import { expect, describe, it, vi } from 'vitest';
import { mockCommands, mockServices, mockChannels, mockDataProducts } from './mocks';

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getCollection: (key: string) => {
      if (key === 'services') {
        return Promise.resolve(mockServices);
      }
      if (key === 'commands') {
        return Promise.resolve(mockCommands);
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

describe('Commands NodeGraph', () => {
  describe('getNodesAndEdges', () => {
    it('should return nodes and edges for a given command', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'AdjustOrder', version: '0.0.1' });

      // The middle node itself, the service
      const expectedCommandNode = {
        id: 'AdjustOrder-0.0.1',
        sourcePosition: 'right',
        targetPosition: 'left',
        type: 'commands',
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
          id: 'OrderService-0.0.1-AdjustOrder-0.0.1',
          source: 'OrderService-0.0.1',
          target: 'AdjustOrder-0.0.1',
          label: 'invokes',
        }),
        expect.objectContaining({
          id: 'AdjustOrder-0.0.1-PaymentService-0.0.1',
          source: 'AdjustOrder-0.0.1',
          target: 'PaymentService-0.0.1',
          label: 'accepts',
        }),
      ]);

      expect(nodes).toEqual(
        expect.arrayContaining([
          // Nodes on the left
          expect.objectContaining(expectedConsumerNode),

          // The command node itself
          expect.objectContaining(expectedCommandNode),

          // Nodes on the right
          expect.objectContaining(expectedProducerNode),
        ])
      );

      expect(edges).toEqual(expectedEdges);
    });

    it('if the command is produced and consumed by a service it will render a custom edge', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'GetOrder', version: '0.0.1' });

      // The middle node itself, the service
      const expectedCommandNode = {
        id: 'GetOrder-0.0.1',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode: 'simple', message: expect.anything() },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'commands',
      };

      const expectedProducerNode = {
        id: 'LegacyOrderService-0.0.1',
        type: 'services',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode: 'simple', service: { ...mockServices[4].data } },
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
          id: 'LegacyOrderService-0.0.1-GetOrder-0.0.1',
          source: 'LegacyOrderService-0.0.1',
          target: 'GetOrder-0.0.1',
          label: 'invokes',
          animated: false,
        }),
        expect.objectContaining({
          id: 'GetOrder-0.0.1-LegacyOrderService-0.0.1',
          source: 'GetOrder-0.0.1',
          target: 'LegacyOrderService-0.0.1',
          label: 'accepts',
          animated: false,
        }),
        expect.objectContaining({
          id: 'GetOrder-0.0.1-LegacyOrderService-0.0.1-both',
          source: 'GetOrder-0.0.1',
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

          // The event node itself
          expect.objectContaining(expectedCommandNode),

          // Nodes on the right
          expect.objectContaining(expectedProducerNode),
        ])
      );

      expect(edges).toEqual(expectedEdges);
    });

    it('if the consumer of a command has defined a channel, it will render the channel node and edges', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'GetOrder', version: '0.0.1' });

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

      const expectedCommandNode = {
        id: 'GetOrder-0.0.1',
        sourcePosition: 'right',
        targetPosition: 'left',
        type: 'commands',
      };

      const expectedEdges = expect.arrayContaining([
        // Message to the channel
        expect.objectContaining({
          id: 'GetOrder-0.0.1-EmailChannel-1.0.0',
          source: 'GetOrder-0.0.1',
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

          // The command node itself
          expect.objectContaining(expectedCommandNode),
        ])
      );

      expect(edges).toEqual(expectedEdges);
    });

    it('if the producer of an event has defined a channel, it will render the channel node and edges', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'GetOrder', version: '0.0.1' });

      const expectedProducerNode = {
        id: 'PaymentService-0.0.1',
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

      const expectedCommandNode = {
        id: 'GetOrder-0.0.1',
        sourcePosition: 'right',
        targetPosition: 'left',
        type: 'commands',
      };

      const expectedEdges = expect.arrayContaining([
        // Producer to the message
        expect.objectContaining({
          id: 'PaymentService-0.0.1-GetOrder-0.0.1',
          source: 'PaymentService-0.0.1',
          target: 'GetOrder-0.0.1',
          label: 'invokes',
          animated: false,
        }),
        // Message to the channel
        expect.objectContaining({
          id: 'GetOrder-0.0.1-EmailChannel-1.0.0',
          source: 'GetOrder-0.0.1',
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

          // The command node itself
          expect.objectContaining(expectedCommandNode),
        ])
      );

      expect(edges).toEqual(expectedEdges);
    });

    it('returns an empty array if no commands are found', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'UnknownCommand', version: '1.0.0' });

      expect(nodes).toEqual([]);
      expect(edges).toEqual([]);
    });

    it('should return nodes and edges for a given event using semver range', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'PlaceOrder', version: '2.0.1' });

      // The middle node itself, the service
      const expectedCommandNode = {
        id: 'PlaceOrder-2.0.1',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode: 'simple', message: expect.anything() },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'commands',
      };

      const expectedConsumerNode = {
        id: 'OrderService-0.0.1',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: {
          title: 'OrderService',
          mode: 'simple',
          service: { ...mockServices[0].data },
        },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'services',
      };

      const expectedEdges = expect.arrayContaining([
        expect.objectContaining({
          id: 'PlaceOrder-2.0.1-OrderService-0.0.1',
          source: 'PlaceOrder-2.0.1',
          target: 'OrderService-0.0.1',
          label: 'accepts',
        }),
      ]);

      expect(nodes).toEqual(
        expect.arrayContaining([
          // The command node itself
          expect.objectContaining(expectedCommandNode),

          // Nodes on the Right
          expect.objectContaining(expectedConsumerNode),
        ])
      );

      expect(edges).toEqual(expectedEdges);
    });

    describe('data products', () => {
      it('should render data product as a consumer when it has the command as an input', async () => {
        const { nodes, edges } = await getNodesAndEdges({ id: 'AdjustOrder', version: '0.0.1' });

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
              id: 'AdjustOrder-0.0.1-OrderAnalytics-1.0.0',
              source: 'AdjustOrder-0.0.1',
              target: 'OrderAnalytics-1.0.0',
              label: 'consumed by',
            }),
          ])
        );
      });

      it('should render data product as a producer when it has the command as an output', async () => {
        const { nodes, edges } = await getNodesAndEdges({ id: 'AdjustOrder', version: '0.0.1' });

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
              id: 'OrderDataPipeline-1.0.0-AdjustOrder-0.0.1',
              source: 'OrderDataPipeline-1.0.0',
              target: 'AdjustOrder-0.0.1',
              label: 'produces',
            }),
          ])
        );
      });

      it('should render both services and data products as producers and consumers', async () => {
        const { nodes } = await getNodesAndEdges({ id: 'AdjustOrder', version: '0.0.1' });

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
