import { MarkerType } from 'reactflow';
import { getNodesAndEdgesForQueries as getNodesAndEdges } from '../../node-graphs/message-node-graph';
import { expect, describe, it, vi, beforeEach } from 'vitest';
import { mockQueries, mockServices } from './mocks';

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    // this will only affect "foo" outside of the original module
    getCollection: (key: string) => {
      if (key === 'services') {
        return Promise.resolve(mockServices);
      }
      if (key === 'queries') {
        return Promise.resolve(mockQueries);
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
          id: 'OrderService-0.0.1-GetLatestOrder-0.0.1',
          source: 'OrderService-0.0.1',
          target: 'GetLatestOrder-0.0.1',
          type: 'bezier',
          label: 'requests',
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
          id: 'GetLatestOrder-0.0.1-PaymentService-0.0.1',
          source: 'GetLatestOrder-0.0.1',
          target: 'PaymentService-0.0.1',
          type: 'bezier',
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
        data: { mode: 'simple', service: mockServices[4], title: 'LegacyOrderService' },
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
          id: 'LegacyOrderService-0.0.1-GetOrderLegacy-0.0.1',
          source: 'LegacyOrderService-0.0.1',
          target: 'GetOrderLegacy-0.0.1',
          type: 'bezier',
          label: 'requests',
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
          id: 'GetOrderLegacy-0.0.1-LegacyOrderService-0.0.1',
          source: 'GetOrderLegacy-0.0.1',
          target: 'LegacyOrderService-0.0.1',
          type: 'bezier',
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
          id: 'GetOrderLegacy-0.0.1-LegacyOrderService-0.0.1-both',
          source: 'GetOrderLegacy-0.0.1',
          target: 'LegacyOrderService-0.0.1',
          type: 'bezier',
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

          // The query node itself
          expect.objectContaining(expectedQueryNode),

          // Nodes on the right
          expect.objectContaining(expectedProducerNode),
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
        data: { mode: 'simple', service: mockServices[2] },
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      const expectedConsumerNode = {
        id: 'CatalogService-0.0.1',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { title: 'CatalogService', mode: 'simple', service: mockServices[3] },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'services',
      };

      const expectedEdges = [
        {
          id: 'InventoryService-0.0.1-GetInventoryItem-1.5.1',
          source: 'InventoryService-0.0.1',
          target: 'GetInventoryItem-1.5.1',
          type: 'bezier',
          label: 'requests',
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
          id: 'GetInventoryItem-1.5.1-CatalogService-0.0.1',
          source: 'GetInventoryItem-1.5.1',
          target: 'CatalogService-0.0.1',
          type: 'bezier',
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
          expect.objectContaining(expectedProducerNode),

          // The event node itself
          expect.objectContaining(expectedQueryNode),

          // Nodes on the right
          expect.objectContaining(expectedConsumerNode),
        ])
      );

      expect(edges).toEqual(expectedEdges);
    });
  });
});
