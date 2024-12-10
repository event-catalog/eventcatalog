import { MarkerType } from '@xyflow/react';
import { getNodesAndEdgesForCommands as getNodesAndEdges } from '../../node-graphs/message-node-graph';
import { expect, describe, it, vi } from 'vitest';
import { mockCommands, mockServices } from './mocks';

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    // this will only affect "foo" outside of the original module
    getCollection: (key: string) => {
      if (key === 'services') {
        return Promise.resolve(mockServices);
      }
      if (key === 'commands') {
        return Promise.resolve(mockCommands);
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
        data: { mode: 'simple', message: expect.anything() },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'commands',
      };

      const expectedProducerNode = {
        id: 'OrderService-0.0.1',
        type: 'services',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode: 'simple', service: mockServices[0] },
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      const expectedConsumerNode = {
        id: 'PaymentService-0.0.1',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: {
          title: 'PaymentService',
          mode: 'simple',
          service: mockServices[1],
        },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'services',
      };

      const expectedEdges = [
        {
          id: 'OrderService-0.0.1-AdjustOrder-0.0.1',
          source: 'OrderService-0.0.1',
          target: 'AdjustOrder-0.0.1',
          label: 'invokes',
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 40,
            height: 40,
          },
          style: {
            strokeWidth: 1,
          },
          data: { message: expect.anything() },
        },
        {
          id: 'AdjustOrder-0.0.1-PaymentService-0.0.1',
          source: 'AdjustOrder-0.0.1',
          target: 'PaymentService-0.0.1',
          label: 'accepts',
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 40,
            height: 40,
          },
          style: {
            strokeWidth: 1,
          },
          data: { message: expect.anything() },
        },
      ];

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
        data: { mode: 'simple', service: mockServices[4] },
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      const expectedConsumerNode = {
        id: 'LegacyOrderService-0.0.1',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: {
          title: 'LegacyOrderService',
          mode: 'simple',
          service: mockServices[4],
        },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'services',
      };

      const expectedEdges = [
        {
          id: 'LegacyOrderService-0.0.1-GetOrder-0.0.1',
          source: 'LegacyOrderService-0.0.1',
          target: 'GetOrder-0.0.1',
          label: 'invokes',
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 40,
            height: 40,
          },
          style: {
            strokeWidth: 1,
          },
          data: { message: expect.anything() },
        },
        {
          id: 'GetOrder-0.0.1-LegacyOrderService-0.0.1',
          source: 'GetOrder-0.0.1',
          target: 'LegacyOrderService-0.0.1',
          label: 'accepts',
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 40,
            height: 40,
          },
          style: {
            strokeWidth: 1,
          },
          data: { message: expect.anything() },
        },
        {
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
          style: {
            strokeWidth: 1,
          },
          data: { message: expect.anything() },
        },
      ];

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
          service: mockServices[0],
        },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'services',
      };

      const expectedEdges = [
        {
          id: 'PlaceOrder-2.0.1-OrderService-0.0.1',
          source: 'PlaceOrder-2.0.1',
          target: 'OrderService-0.0.1',
          label: 'accepts',
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 40,
            height: 40,
          },
          style: {
            strokeWidth: 1,
          },
          data: { message: expect.anything() },
        },
      ];

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
  });
});
