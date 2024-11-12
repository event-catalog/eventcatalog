import { MarkerType } from 'reactflow';
import { getNodesAndEdges } from '../../node-graphs/services-node-graph';
import { expect, describe, it, vi, beforeEach } from 'vitest';
import { mockCommands, mockEvents, mockQueries, mockServices, mockChannels } from './mocks';
import type { ContentCollectionKey } from 'astro:content';

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    // this will only affect "foo" outside of the original module
    getCollection: (key: ContentCollectionKey) => {
      switch (key) {
        case 'services':
          return Promise.resolve(mockServices);
        case 'channels':
          return Promise.resolve(mockChannels);
        case 'events':
          return Promise.resolve(mockEvents);
        case 'commands':
          return Promise.resolve(mockCommands);
        case 'queries':
          return Promise.resolve(mockQueries);
      }
    },
  };
});

describe('Services NodeGraph', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getNodesAndEdges', () => {
    it('should return nodes and edges for a given service', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'OrderService', version: '1.0.0' });

      // The middle node itself, the service
      const expectedServiceNode = {
        id: 'OrderService-1.0.0',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode: 'simple', service: mockServices[0] },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'services',
      };

      // Nodes coming into the service (left)
      const expectedRecivesNode = {
        id: 'PaymentProcessed-0.0.1',
        type: 'commands',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode: 'simple', message: mockCommands[0] },
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      // Nodes going out of the service (right)
      const expectedSendsNode = {
        id: 'OrderCreatedEvent-0.0.1',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode: 'simple', message: mockEvents[0] },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'events',
      };

      const expectedEdges = [
        {
          id: 'PaymentProcessed-0.0.1-OrderService-1.0.0',
          source: 'PaymentProcessed-0.0.1',
          target: 'OrderService-1.0.0',
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
          id: 'OrderService-1.0.0-OrderCreatedEvent-0.0.1',
          source: 'OrderService-1.0.0',
          target: 'OrderCreatedEvent-0.0.1',
          label: 'publishes event',
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 40,
            height: 40,
          },
          data: { message: expect.anything() },
          style: {
            strokeWidth: 1,
          },
        },
      ];

      expect(nodes).toEqual(
        expect.arrayContaining([
          // Nodes on the left
          expect.objectContaining(expectedRecivesNode),

          // The service node itself
          expect.objectContaining(expectedServiceNode),

          // Nodes on the right
          expect.objectContaining(expectedSendsNode),
        ])
      );

      expect(edges).toEqual(expectedEdges);
    });

    it('if a message is sent and received by the same service it will render a custom edge', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'NotificationsService', version: '1.0.0' });

      // The middle node itself, the service
      const expectedServiceNode = {
        id: 'NotificationsService-1.0.0',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode: 'simple', service: mockServices[3] },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'services',
      };

      // Nodes coming into the service (left)
      const expectedRecivesNode = {
        id: 'OrderCreatedEvent-2.0.0',
        type: 'events',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode: 'simple', message: mockEvents[3] },
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      // Nodes going out of the service (right)
      const expectedSendsNode = {
        id: 'OrderCreatedEvent-2.0.0',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode: 'simple', message: mockEvents[3] },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'events',
      };

      const expectedEdges = [
        {
          id: 'OrderCreatedEvent-2.0.0-NotificationsService-1.0.0',
          source: 'OrderCreatedEvent-2.0.0',
          target: 'NotificationsService-1.0.0',
          label: 'receives event',
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed, width: 40, height: 40 },
          style: { strokeWidth: 1 },
          data: { message: expect.anything() },
        },
        {
          id: 'NotificationsService-1.0.0-OrderCreatedEvent-2.0.0',
          source: 'NotificationsService-1.0.0',
          target: 'OrderCreatedEvent-2.0.0',
          label: 'publishes event',
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed, width: 40, height: 40 },
          style: { strokeWidth: 1 },
          data: { message: expect.anything() },
        },
        {
          id: 'NotificationsService-1.0.0-OrderCreatedEvent-2.0.0-both',
          source: 'NotificationsService-1.0.0',
          target: 'OrderCreatedEvent-2.0.0',
          label: 'publishes event & receives event',
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed, width: 40, height: 40 },
          style: { strokeWidth: 1 },
          data: { message: expect.anything() },
        },
      ];

      expect(nodes).toEqual(
        expect.arrayContaining([
          // Nodes on the left
          expect.objectContaining(expectedRecivesNode),

          // The service node itself
          expect.objectContaining(expectedServiceNode),

          // Nodes on the right
          expect.objectContaining(expectedSendsNode),
        ])
      );

      expect(edges).toEqual(expectedEdges);
    });

    it('returns empty nodes and edges if no service is found', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'UnknownService', version: '1.0.0' });

      expect(nodes).toEqual([]);
      expect(edges).toEqual([]);
    });

    it('should return nodes and edges for a given service using semver range', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'InventoryService', version: '1.0.0' });

      // The middle node itself, the service
      const expectedServiceNode = {
        id: 'InventoryService-1.0.0',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode: 'simple', service: mockServices[1] },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'services',
      };

      // Nodes coming into the service (left)
      const expectedRecivesNode = {
        id: 'OrderCreatedEvent-1.3.9',
        type: 'events',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode: 'simple', message: mockEvents[2] },
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      // Nodes going out of the service (right)
      const expectedSendsNode = {
        id: 'InventoryAdjusted-2.0.0',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode: 'simple', message: mockEvents[7] },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'events',
      };

      const expectedEdges = [
        {
          id: 'OrderCreatedEvent-1.3.9-InventoryService-1.0.0',
          source: 'OrderCreatedEvent-1.3.9',
          target: 'InventoryService-1.0.0',
          label: 'receives event',
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
          id: 'InventoryService-1.0.0-InventoryAdjusted-2.0.0',
          source: 'InventoryService-1.0.0',
          target: 'InventoryAdjusted-2.0.0',
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
      ];

      expect(nodes).toEqual(
        expect.arrayContaining([
          // Nodes on the left
          expect.objectContaining(expectedRecivesNode),

          // The service node itself
          expect.objectContaining(expectedServiceNode),

          // Nodes on the right
          expect.objectContaining(expectedSendsNode),
        ])
      );

      expect(edges).toEqual(expectedEdges);
    });

    it('creates channel nodes and edges between the service and messages if the message has a channel defined', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'PaymentService', version: '1.0.0' });

      // The middle node itself, the service
      const expectedServiceNode = {
        id: 'PaymentService-1.0.0',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode: 'simple', service: mockServices[2] },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'services',
      };

      // Message coming into the service with a channel
      const expectedRecivesNode = {
        id: 'OrderDeletedEvent-2.0.0',
        type: 'events',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode: 'simple', message: expect.anything() },
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      // Message coming into the service with a channel
      const expectedRecivesChannelNode = {
        id: 'PaymentService-1.0.0-EmailChannel-1.0.0-EmailVerified-1.0.0',
        type: 'channels',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: {
          title: 'EmailChannel',
          mode: 'simple',
          channel: expect.anything(),
          source: expect.anything(),
          target: expect.anything(),
        },
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      // Nodes going out of the service (right)
      const expectedSendsNode = {
        id: 'EmailVerified-1.0.0',
        sourcePosition: 'right',
        targetPosition: 'left',
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'events',
      };

      // Nodes going out of the service with channel (right)
      const expectedSendsChannelNode = {
        id: 'PaymentService-1.0.0-EmailChannel-1.0.0-EmailVerified-1.0.0',
        sourcePosition: 'right',
        targetPosition: 'left',
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'channels',
      };

      expect(nodes).toEqual(
        expect.arrayContaining([
          // Nodes on the left
          expect.objectContaining(expectedRecivesNode),
          expect.objectContaining(expectedRecivesChannelNode),

          expect.objectContaining(expectedServiceNode),

          // The event node itself
          expect.objectContaining(expectedSendsNode),
          expect.objectContaining(expectedSendsChannelNode),
        ])
      );

      expect(edges).toEqual([
        {
          label: 'receives event',
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed, width: 40, height: 40 },
          style: { strokeWidth: 1 },
          id: 'OrderCreatedEvent-2.0.0-PaymentService-1.0.0',
          source: 'OrderCreatedEvent-2.0.0',
          target: 'PaymentService-1.0.0',
          data: { message: expect.anything() },
        },
        {
          label: '',
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed, width: 40, height: 40 },
          style: { strokeWidth: 1 },
          id: 'OrderDeletedEvent-2.0.0-OrderChannel-1.0.0-PaymentService-1.0.0',
          source: 'OrderDeletedEvent-2.0.0',
          target: 'OrderDeletedEvent-2.0.0-OrderChannel-1.0.0-PaymentService-1.0.0',
          data: { message: expect.anything() },
        },
        {
          label: 'receives event',
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed, width: 40, height: 40 },
          style: { strokeWidth: 1 },
          id: 'OrderChannel-1.0.0-PaymentService-1.0.0-OrderDeletedEvent-2.0.0',
          source: 'OrderDeletedEvent-2.0.0-OrderChannel-1.0.0-PaymentService-1.0.0',
          target: 'PaymentService-1.0.0',
          data: { message: expect.anything() },
        },
        {
          label: 'publishes event',
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed, width: 40, height: 40 },
          style: { strokeWidth: 1 },
          id: 'PaymentService-1.0.0-PaymentPaid-2.0.0',
          source: 'PaymentService-1.0.0',
          target: 'PaymentPaid-2.0.0',
          data: { message: expect.anything() },
        },
        {
          label: 'publishes event',
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed, width: 40, height: 40 },
          style: { strokeWidth: 1 },
          id: 'PaymentService-1.0.0-PaymentFailed-1.2.3',
          source: 'PaymentService-1.0.0',
          target: 'PaymentFailed-1.2.3',
          data: { message: expect.anything() },
        },
        {
          label: '',
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed, width: 40, height: 40 },
          style: { strokeWidth: 1 },
          id: 'PaymentService-1.0.0-EmailChannel-1.0.0-EmailVerified-1.0.0',
          source: 'PaymentService-1.0.0',
          target: 'PaymentService-1.0.0-EmailChannel-1.0.0-EmailVerified-1.0.0',
          data: { message: expect.anything() },
        },
        {
          label: 'publishes event',
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed, width: 40, height: 40 },
          style: { strokeWidth: 1 },
          id: 'EmailChannel-1.0.0-EmailVerified-1.0.0-PaymentService-1.0.0',
          source: 'PaymentService-1.0.0-EmailChannel-1.0.0-EmailVerified-1.0.0',
          target: 'EmailVerified-1.0.0',
          data: { message: expect.anything() },
        },
      ]);
    });
  });
});
