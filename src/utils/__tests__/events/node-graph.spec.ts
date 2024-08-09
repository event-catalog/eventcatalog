import { getNodesAndEdges } from '../../events/node-graph';
import { expect, describe, it, vi, beforeEach } from 'vitest';

const mockServices = [
  {
    id: 'OrderService',
    slug: 'OrderService',
    collection: 'services',
    data: {
      id: 'OrderService',
      version: '0.0.1',
      sends: [
        {
          id: 'OrderCreatedEvent',
          version: '0.0.1',
        },
      ],
    },
  },
  {
    id: 'PaymentService',
    slug: 'PaymentService',
    collection: 'services',
    data: {
      id: 'PaymentService',
      version: '0.0.1',
      receives: [
        {
          id: 'OrderCreatedEvent',
          version: '0.0.1',
        },
      ],
    },
  },
  {
    id: 'InventoryService',
    slug: 'InventoryService',
    collection: 'services',
    data: {
      id: 'InventoryService',
      version: '0.0.1',
      sends: [
        {
          id: 'InventoryAdjusted',
          version: '>1.2.0',
        },
      ],
    },
  },
  {
    id: 'CatalogService',
    slug: 'CatalogService',
    collection: 'services',
    data: {
      id: 'CatalogService',
      version: '0.0.1',
      receives: [
        {
          id: 'InventoryAdjusted',
          version: '^1.0.0',
        },
      ],
    },
  },
];
const mockEvents = [
  {
    id: 'OrderCreatedEvent',
    slug: 'OrderCreatedEvent',
    collection: 'events',
    data: {
      id: 'OrderCreatedEvent',
      version: '0.0.1',
    },
  },
  {
    id: 'InventoryAdjusted',
    slug: 'InventoryAdjusted',
    collection: 'events',
    data: {
      id: 'InventoryAdjusted',
      version: '1.5.1',
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
      return Promise.resolve([]);
    },
  };
});

describe('Services NodeGraph', () => {
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
        // data: { mode: 'simple', message: expect.anything(), showTarget: false, showSource: false },
        data: expect.anything(),
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'events',
      };

      const expectedProducerNode = {
        id: 'OrderService-0.0.1',
        type: 'services',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode: 'simple', service: mockServices[0], showTarget: false },
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
          showSource: false,
        },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'services',
      };

      const expectedEdges = [
        {
          id: 'OrderService-0.0.1-OrderCreatedEvent-0.0.1',
          source: 'OrderService-0.0.1',
          target: 'OrderCreatedEvent-0.0.1',
          type: 'smoothstep',
          label: 'publishes event',
          animated: false,
          markerEnd: { type: 'arrow' },
        },
        {
          id: 'OrderCreatedEvent-0.0.1-PaymentService-0.0.1',
          source: 'OrderCreatedEvent-0.0.1',
          target: 'PaymentService-0.0.1',
          type: 'smoothstep',
          label: 'subscribed by',
          animated: false,
          markerEnd: { type: 'arrow' },
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
        data: { mode: 'simple', service: mockServices[2], showTarget: false },
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      const expectedConsumerNode = {
        id: 'CatalogService-0.0.1',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { title: 'CatalogService', mode: 'simple', service: mockServices[3], showSource: false },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'services',
      };

      const expectedEdges = [
        {
          id: 'InventoryService-0.0.1-InventoryAdjusted-1.5.1',
          source: 'InventoryService-0.0.1',
          target: 'InventoryAdjusted-1.5.1',
          type: 'smoothstep',
          label: 'publishes event',
          animated: false,
          markerEnd: { type: 'arrow' },
        },
        {
          id: 'InventoryAdjusted-1.5.1-CatalogService-0.0.1',
          source: 'InventoryAdjusted-1.5.1',
          target: 'CatalogService-0.0.1',
          type: 'smoothstep',
          label: 'subscribed by',
          animated: false,
          markerEnd: { type: 'arrow' },
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
