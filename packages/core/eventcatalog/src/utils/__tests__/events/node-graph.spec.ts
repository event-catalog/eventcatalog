import { MarkerType } from 'reactflow';
import { getNodesAndEdgesForEvents as getNodesAndEdges } from '../../node-graphs/message-node-graph';
import { expect, describe, it, vi, beforeEach } from 'vitest';
import { mockEvents, mockServices, mockChannels } from './mocks';

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    // this will only affect "foo" outside of the original module
    getCollection: (key: string) => {
      if (key === 'services') {
        return Promise.resolve(mockServices);
      }
      if (key === 'channels') {
        return Promise.resolve(mockChannels);
      }
      if (key === 'events') {
        return Promise.resolve(mockEvents);
      }
      return Promise.resolve([]);
    },
  };
});

describe('Events NodeGraph', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getNodesAndEdges', () => {
    it('should return nodes and edges for a given event', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'OrderCreatedEvent', version: '0.0.1' });

      // The middle node itself, the service
      const expectedEventNode = {
        id: 'OrderCreatedEvent-0.0.1',
        sourcePosition: 'right',
        targetPosition: 'left',
        // data: { mode: 'simple', message: expect.anything(), showSource: false },
        data: expect.anything(),
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'events',
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
          id: 'OrderService-0.0.1-OrderCreatedEvent-0.0.1',
          source: 'OrderService-0.0.1',
          target: 'OrderCreatedEvent-0.0.1',
          label: 'publishes event',
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
          id: 'OrderCreatedEvent-0.0.1-PaymentService-0.0.1',
          source: 'OrderCreatedEvent-0.0.1',
          target: 'PaymentService-0.0.1',
          label: 'subscribed by',
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
          expect.objectContaining(expectedEventNode),

          // Nodes on the right
          expect.objectContaining(expectedProducerNode),
        ])
      );

      expect(edges).toEqual(expectedEdges);
    });

    it('if the event is produced and consumed by a service it will render a custom edge', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'EmailSent', version: '1.0.0' });

      // The middle node itself, the service
      const expectedEventNode = {
        id: 'EmailSent-1.0.0',
        sourcePosition: 'right',
        targetPosition: 'left',
        // data: { mode: 'simple', message: expect.anything(), showSource: false },
        data: expect.anything(),
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'events',
      };

      const expectedProducerNode = {
        id: 'NotificationsService-0.0.1',
        type: 'services',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode: 'simple', service: mockServices[4] },
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      const expectedConsumerNode = {
        id: 'NotificationsService-0.0.1',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: {
          title: 'NotificationsService',
          mode: 'simple',
          service: mockServices[4],
        },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'services',
      };

      const expectedEdges = [
        {
          id: 'NotificationsService-0.0.1-EmailSent-1.0.0',
          source: 'NotificationsService-0.0.1',
          target: 'EmailSent-1.0.0',
          label: 'publishes event',
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
          id: 'EmailSent-1.0.0-NotificationsService-0.0.1',
          source: 'EmailSent-1.0.0',
          target: 'NotificationsService-0.0.1',
          label: 'subscribed by',
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
          id: 'EmailSent-1.0.0-NotificationsService-0.0.1-both',
          source: 'EmailSent-1.0.0',
          target: 'NotificationsService-0.0.1',
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
          expect.objectContaining(expectedEventNode),

          // Nodes on the right
          expect.objectContaining(expectedProducerNode),
        ])
      );

      expect(edges).toEqual(expectedEdges);
    });

    it('creates channel nodes and edges between the producer and the event if the event has a channel specified', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'EmailVerified', version: '1.0.0' });

      const expectedProducerNode = {
        id: 'NotificationsService-0.0.1',
        type: 'services',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode: 'simple', service: mockServices[4] },
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      const expectedChannelNode = {
        sourcePosition: 'right',
        targetPosition: 'left',
        id: 'NotificationsService-0.0.1-EmailChannel-1.0.0-EmailVerified-1.0.0',
        data: {
          title: 'EmailChannel',
          mode: 'simple',
          channel: expect.anything(),
          source: expect.anything(),
          target: expect.anything(),
        },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'channels',
      };

      // The middle node itself, the service
      const expectedEventNode = {
        id: 'EmailVerified-1.0.0',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: expect.anything(),
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'events',
      };

      expect(nodes).toHaveLength(3);

      expect(nodes).toEqual(
        expect.arrayContaining([
          // Nodes on the left
          expect.objectContaining(expectedProducerNode),

          // channel
          expect.objectContaining(expectedChannelNode),

          // The event node itself
          expect.objectContaining(expectedEventNode),
        ])
      );

      expect(edges).toEqual([
        {
          label: '',
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed, width: 40, height: 40 },
          style: { strokeWidth: 1 },
          id: 'NotificationsService-0.0.1-EmailChannel-1.0.0-EmailVerified-1.0.0',
          source: 'NotificationsService-0.0.1',
          target: 'NotificationsService-0.0.1-EmailChannel-1.0.0-EmailVerified-1.0.0',
          data: { message: expect.anything(), source: expect.anything(), target: expect.anything(), channel: expect.anything() },
        },
        {
          label: 'publishes event',
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed, width: 40, height: 40 },
          style: { strokeWidth: 1 },
          id: 'EmailChannel-1.0.0-EmailVerified-1.0.0-NotificationsService-0.0.1',
          source: 'NotificationsService-0.0.1-EmailChannel-1.0.0-EmailVerified-1.0.0',
          target: 'EmailVerified-1.0.0',
          data: { message: expect.anything(), source: expect.anything(), target: expect.anything(), channel: expect.anything() },
        },
      ]);
    });

    it('returns empty nodes and edges if no event is found', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'UnknownEvent', version: '1.0.0' });

      expect(nodes).toEqual([]);
      expect(edges).toEqual([]);
    });

    it('should return nodes and edges for a given event using semver range', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'InventoryAdjusted', version: '1.5.1' });

      // The middle node itself, the service
      const expectedEventNode = {
        id: 'InventoryAdjusted-1.5.1',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: expect.anything(),
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'events',
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
          id: 'InventoryService-0.0.1-InventoryAdjusted-1.5.1',
          source: 'InventoryService-0.0.1',
          target: 'InventoryAdjusted-1.5.1',
          label: 'publishes event',
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
          id: 'InventoryAdjusted-1.5.1-CatalogService-0.0.1',
          source: 'InventoryAdjusted-1.5.1',
          target: 'CatalogService-0.0.1',
          label: 'subscribed by',
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
          expect.objectContaining(expectedEventNode),

          // Nodes on the right
          expect.objectContaining(expectedConsumerNode),
        ])
      );

      expect(edges).toEqual(expectedEdges);
    });
  });
});
