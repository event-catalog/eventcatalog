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
          id: 'OrderService-0.0.1-OrderCreatedEvent-0.0.1',
          source: 'OrderService-0.0.1',
          target: 'OrderCreatedEvent-0.0.1',
          label: 'publishes \nevent',
          animated: false,
        }),
        // The channel to the event
        expect.objectContaining({
          id: 'OrderCreatedEvent-0.0.1-EmailChannel-1.0.0',
          source: 'OrderCreatedEvent-0.0.1',
          target: 'EmailChannel-1.0.0',
          label: 'routes to',
          animated: false,
        }),
        // The event to the consumer
        expect.objectContaining({
          id: 'OrderCreatedEvent-0.0.1-PaymentService-0.0.1',
          source: 'OrderCreatedEvent-0.0.1',
          target: 'PaymentService-0.0.1',
          label: 'subscribed by',
          animated: false,
        }),
      ]);

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
        data: { mode: 'simple', service: { ...mockServices[4].data } },
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      const expectedConsumerNode = {
        id: 'NotificationsService-0.0.1',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: {
          title: 'NotificationsService',
          mode: 'simple',
          service: { ...mockServices[4].data },
        },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'services',
      };

      const expectedEdges = expect.arrayContaining([
        // Producer to the event
        expect.objectContaining({
          id: 'NotificationsService-0.0.1-EmailSent-1.0.0',
          source: 'NotificationsService-0.0.1',
          target: 'EmailSent-1.0.0',
          label: 'publishes \nevent',
        }),
        // Event to the channel
        expect.objectContaining({
          id: 'EmailSent-1.0.0-EmailChannel-1.0.0',
          source: 'EmailSent-1.0.0',
          target: 'EmailChannel-1.0.0',
          label: 'routes to',
          animated: false,
        }),
        expect.objectContaining({
          id: 'EmailSent-1.0.0-NotificationsService-0.0.1-both',
          source: 'EmailSent-1.0.0',
          target: 'NotificationsService-0.0.1',
          label: 'publishes and subscribes',
        }),
      ]);

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

    it('if the consumer of an event has defined a channel, it will render the channel node and edges', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'EmailSent', version: '1.0.0' });

      const expectedConsumerNode = {
        id: 'NotificationsService-0.0.1',
        type: 'services',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode: 'simple', service: { ...mockServices[4].data } },
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      const expectedChannelNode = {
        sourcePosition: 'right',
        targetPosition: 'left',
        id: 'EmailChannel-1.0.0',
        type: 'channels',
      };

      const expectedEventNode = {
        id: 'EmailSent-1.0.0',
        sourcePosition: 'right',
        targetPosition: 'left',
        type: 'events',
      };

      const expectedEdges = expect.arrayContaining([
        // Message to the channel
        expect.objectContaining({
          id: 'EmailSent-1.0.0-EmailChannel-1.0.0',
          source: 'EmailSent-1.0.0',
          target: 'EmailChannel-1.0.0',
        }),
        // Channel to the consumer
        expect.objectContaining({
          id: 'EmailChannel-1.0.0-NotificationsService-0.0.1',
          source: 'EmailChannel-1.0.0',
          target: 'NotificationsService-0.0.1',
        }),
      ]);

      expect(nodes).toEqual(
        expect.arrayContaining([
          // Nodes on the left
          expect.objectContaining(expectedConsumerNode),

          // channel
          expect.objectContaining(expectedChannelNode),

          // The event node itself
          expect.objectContaining(expectedEventNode),
        ])
      );

      expect(edges).toEqual(expectedEdges);
    });

    it('if the producer of an event has defined a channel, it will render the channel node and edges', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'OrderCreatedEvent', version: '0.0.1' });

      const expectedProducerNode = {
        id: 'OrderService-0.0.1',
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

      const expectedEventNode = {
        id: 'OrderCreatedEvent-0.0.1',
        sourcePosition: 'right',
        targetPosition: 'left',
        type: 'events',
      };

      const expectedEdges = expect.arrayContaining([
        // Producer to the message
        expect.objectContaining({
          id: 'OrderService-0.0.1-OrderCreatedEvent-0.0.1',
          source: 'OrderService-0.0.1',
          target: 'OrderCreatedEvent-0.0.1',
          label: 'publishes \nevent',
          animated: false,
        }),
        // Message to the channel
        expect.objectContaining({
          id: 'OrderCreatedEvent-0.0.1-EmailChannel-1.0.0',
          source: 'OrderCreatedEvent-0.0.1',
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

          // The event node itself
          expect.objectContaining(expectedEventNode),
        ])
      );

      expect(edges).toEqual(expectedEdges);
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
          id: 'InventoryService-0.0.1-InventoryAdjusted-1.5.1',
          source: 'InventoryService-0.0.1',
          target: 'InventoryAdjusted-1.5.1',
          label: 'publishes \nevent',
          animated: false,
        }),
        expect.objectContaining({
          id: 'InventoryAdjusted-1.5.1-CatalogService-0.0.1',
          source: 'InventoryAdjusted-1.5.1',
          target: 'CatalogService-0.0.1',
          label: 'subscribed by',
          animated: false,
        }),
      ]);

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
