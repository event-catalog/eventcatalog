import { getNodesAndEdges } from '../../services/node-graph';
import { expect, describe, it, vi, beforeEach } from 'vitest';

const mockServices = [
  {
    slug: 'OrderService',
    collection: 'services',
    data: {
      id: 'OrderService',
      version: '1.0.0',
      sends: [
        {
          id: 'OrderCreatedEvent',
          version: '0.0.1',
        },
      ],
      receives: [
        {
          id: 'PaymentProcessed',
          version: '0.0.1',
        },
      ],
    },
  },
  {
    slug: 'InventoryService',
    collection: 'services',
    data: {
      id: 'InventoryService',
      version: '1.0.0',
      receives: [
        {
          id: 'OrderCreatedEvent',
          version: '^1.3.0',
        },
      ],
      sends: [
        {
          id: 'InventoryAdjusted',
          version: '~2',
        },
      ],
    },
  },
];
const mockEvents = [
  {
    slug: 'OrderCreatedEvent',
    collection: 'events',
    data: {
      id: 'OrderCreatedEvent',
      version: '0.0.1',
    },
  },
  {
    slug: 'OrderCreatedEvent',
    collection: 'events',
    data: {
      id: 'OrderCreatedEvent',
      version: '1.0.0',
    },
  },
  {
    slug: 'OrderCreatedEvent',
    collection: 'events',
    data: {
      id: 'OrderCreatedEvent',
      version: '1.3.9',
    },
  },
  {
    slug: 'OrderCreatedEvent',
    collection: 'events',
    data: {
      id: 'OrderCreatedEvent',
      version: '2.0.0',
    },
  },
  {
    slug: 'InventoryAdjusted',
    collection: 'events',
    data: {
      id: 'InventoryAdjusted',
      version: '0.0.1',
    },
  },
  {
    slug: 'InventoryAdjusted',
    collection: 'events',
    data: {
      id: 'InventoryAdjusted',
      version: '1.0.0',
    },
  },
  {
    slug: 'InventoryAdjusted',
    collection: 'events',
    data: {
      id: 'InventoryAdjusted',
      version: '2.0.0',
    },
  },
];
const mockCommands = [
  {
    slug: 'PaymentProcessed',
    collection: 'commands',
    data: {
      id: 'PaymentProcessed',
      version: '0.0.1',
    },
  },
];

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    // this will only affect "foo" outside of the original module
    getCollection: (key: string) => {
      if (key === 'services') {
        return Promise.resolve(mockServices);
      }
      if (key === 'events') {
        return Promise.resolve(mockEvents);
      }
      return Promise.resolve(mockCommands);
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
        data: { mode: 'simple', service: mockServices[0], showSource: true, showTarget: true },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'services',
      };

      // Nodes coming into the service (left)
      const expectedRecivesNode = {
        id: 'PaymentProcessed-0.0.1',
        type: 'commands',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode: 'simple', message: mockCommands[0], showTarget: false },
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      // Nodes going out of the service (right)
      const expectedSendsNode = {
        id: 'OrderCreatedEvent-0.0.1',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode: 'simple', message: mockEvents[0], showSource: false },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'events',
      };

      const expectedEdges = [
        {
          id: 'PaymentProcessed-0.0.1-OrderService-1.0.0',
          source: 'PaymentProcessed-0.0.1',
          target: 'OrderService-1.0.0',
          type: 'smoothstep',
          label: 'accepts',
          animated: false,
          markerEnd: { type: 'arrow' },
        },
        {
          id: 'OrderService-1.0.0-OrderCreatedEvent-0.0.1',
          source: 'OrderService-1.0.0',
          target: 'OrderCreatedEvent-0.0.1',
          type: 'smoothstep',
          label: 'publishes event',
          animated: false,
          markerEnd: { type: 'arrow' },
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
        data: { mode: 'simple', service: mockServices[1], showSource: true, showTarget: true },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'services',
      };

      // Nodes coming into the service (left)
      const expectedRecivesNode = {
        id: 'OrderCreatedEvent-1.3.9',
        type: 'events',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode: 'simple', message: mockEvents[2], showTarget: false },
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      // Nodes going out of the service (right)
      const expectedSendsNode = {
        id: 'InventoryAdjusted-2.0.0',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode: 'simple', message: mockEvents[6], showSource: false },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'events',
      };

      const expectedEdges = [
        {
          id: 'OrderCreatedEvent-1.3.9-InventoryService-1.0.0',
          source: 'OrderCreatedEvent-1.3.9',
          target: 'InventoryService-1.0.0',
          type: 'smoothstep',
          label: 'receives event',
          animated: false,
          markerEnd: { type: 'arrow' },
        },
        {
          id: 'InventoryService-1.0.0-InventoryAdjusted-2.0.0',
          source: 'InventoryService-1.0.0',
          target: 'InventoryAdjusted-2.0.0',
          type: 'smoothstep',
          label: 'publishes event',
          animated: false,
          markerEnd: { type: 'arrow' },
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
  });
});
