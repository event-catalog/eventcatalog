import type { ContentCollectionKey } from 'astro:content';
import { expect, describe, it, vi } from 'vitest';
import { getDomainsCanvasData } from '@utils/node-graphs/domains-canvas';
import { MarkerType } from '@xyflow/react';

// Mock data for domains canvas tests
const mockDomainsForCanvas = [
  {
    id: 'domains/Orders/index.mdx',
    slug: 'domains/Orders',
    collection: 'domains',
    data: {
      id: 'Orders',
      name: 'Orders',
      version: '0.0.1',
      services: [
        {
          id: 'OrderService',
          version: '1.0.0',
          data: {
            id: 'OrderService',
            version: '1.0.0',
            sends: [{ id: 'OrderPlaced', version: '0.0.1' }],
            receives: [{ id: 'PaymentCompleted', version: '1.0.0' }],
          },
        },
      ],
    },
  },
  {
    id: 'domains/Payment/index.mdx',
    slug: 'domains/Payment',
    collection: 'domains',
    data: {
      id: 'Payment',
      name: 'Payment',
      version: '0.0.1',
      services: [
        {
          id: 'PaymentService',
          version: '0.0.1',
          data: {
            id: 'PaymentService',
            version: '0.0.1',
            receives: [{ id: 'OrderPlaced', version: '0.0.1' }],
            sends: [{ id: 'PaymentCompleted', version: '1.0.0' }],
          },
        },
      ],
    },
  },
  {
    id: 'domains/Inventory/index.mdx',
    slug: 'domains/Inventory',
    collection: 'domains',
    data: {
      id: 'Inventory',
      name: 'Inventory',
      version: '0.0.1',
      services: [
        {
          id: 'InventoryService',
          version: '0.0.1',
          data: {
            id: 'InventoryService',
            version: '0.0.1',
            receives: [{ id: 'OrderPlaced', version: '0.0.1' }],
            sends: [],
          },
        },
      ],
    },
  },
];

const mockAllServices = [
  {
    id: 'services/OrderService/index.mdx',
    slug: 'services/OrderService',
    collection: 'services',
    data: {
      id: 'OrderService',
      version: '1.0.0',
      sends: [{ id: 'OrderPlaced', version: '0.0.1' }],
      receives: [{ id: 'PaymentCompleted', version: '1.0.0' }],
    },
  },
  {
    id: 'services/PaymentService/index.mdx',
    slug: 'services/PaymentService',
    collection: 'services',
    data: {
      id: 'PaymentService',
      version: '0.0.1',
      receives: [{ id: 'OrderPlaced', version: '0.0.1' }],
      sends: [{ id: 'PaymentCompleted', version: '1.0.0' }],
    },
  },
  {
    id: 'services/InventoryService/index.mdx',
    slug: 'services/InventoryService',
    collection: 'services',
    data: {
      id: 'InventoryService',
      version: '0.0.1',
      receives: [{ id: 'OrderPlaced', version: '0.0.1' }],
      sends: [],
    },
  },
];

const mockEvents = [
  {
    id: 'events/OrderPlaced/index.mdx',
    slug: 'events/OrderPlaced',
    collection: 'events',
    data: {
      id: 'OrderPlaced',
      name: 'OrderPlaced',
      version: '0.0.1',
    },
  },
  {
    id: 'events/PaymentCompleted/index.mdx',
    slug: 'events/PaymentCompleted',
    collection: 'events',
    data: {
      id: 'PaymentCompleted',
      name: 'PaymentCompleted',
      version: '1.0.0',
    },
  },
];

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getCollection: (key: ContentCollectionKey) => {
      switch (key) {
        case 'services':
          return Promise.resolve(mockAllServices);
        case 'events':
          return Promise.resolve(mockEvents);
        case 'commands':
          return Promise.resolve([]);
        case 'queries':
          return Promise.resolve([]);
        default:
          return Promise.resolve([]);
      }
    },
  };
});

vi.mock('@utils/collections/domains', () => ({
  getDomains: vi.fn(() => Promise.resolve(mockDomainsForCanvas)),
}));

describe('Domains Canvas', () => {
  describe('getDomainsCanvasData', () => {
    it('should return domain nodes for all domains', async () => {
      const { domainNodes, messageNodes, edges } = await getDomainsCanvasData();

      expect(domainNodes).toHaveLength(3);

      // Check Orders domain node
      const ordersNode = domainNodes.find((n) => n.id === 'Orders-0.0.1');
      expect(ordersNode).toBeTruthy();
      expect(ordersNode?.type).toBe('domains');
      expect(ordersNode?.data).toMatchObject({
        mode: 'full',
        servicesCount: 1,
        messagesCount: 2,
      });

      // Check Payment domain node
      const paymentNode = domainNodes.find((n) => n.id === 'Payment-0.0.1');
      expect(paymentNode).toBeTruthy();
      expect(paymentNode?.type).toBe('domains');
      expect(paymentNode?.data).toMatchObject({
        mode: 'full',
        servicesCount: 1,
        messagesCount: 2,
      });

      // Check Inventory domain node
      const inventoryNode = domainNodes.find((n) => n.id === 'Inventory-0.0.1');
      expect(inventoryNode).toBeTruthy();
      expect(inventoryNode?.type).toBe('domains');
      expect(inventoryNode?.data).toMatchObject({
        mode: 'full',
        servicesCount: 1,
        messagesCount: 1,
      });
    });

    it('should create message nodes between domains with relationships', async () => {
      const { domainNodes, messageNodes, edges } = await getDomainsCanvasData();

      // Should have message nodes for domain relationships
      expect(messageNodes.length).toBeGreaterThan(0);

      // Check for OrderPlaced message node between Orders and Payment
      const orderPlacedNode = messageNodes.find((n: any) => n.data?.message?.data?.id === 'OrderPlaced');
      expect(orderPlacedNode).toBeTruthy();
      expect(orderPlacedNode?.type).toBe('events');
      expect(orderPlacedNode?.data).toMatchObject({
        mode: 'simple',
      });
    });

    it('should create animated edges between domains and messages', async () => {
      const { domainNodes, messageNodes, edges } = await getDomainsCanvasData();

      // Check edges are created with animation
      const domainToMessageEdges = edges.filter((e) => e.data?.type === 'domain-to-message');
      expect(domainToMessageEdges.length).toBeGreaterThan(0);

      domainToMessageEdges.forEach((edge) => {
        expect(edge.type).toBe('animated');
        expect(edge.animated).toBe(true);
        expect(edge.markerEnd).toMatchObject({
          type: MarkerType.ArrowClosed,
          width: 40,
          height: 40,
        });
      });

      // Check message to domain edges
      const messageToDomainEdges = edges.filter((e) => e.data?.type === 'message-to-domain');
      expect(messageToDomainEdges.length).toBeGreaterThan(0);

      messageToDomainEdges.forEach((edge) => {
        expect(edge.type).toBe('animated');
        expect(edge.animated).toBe(true);
      });
    });

    it('should detect domain relationships through message flows', async () => {
      const { domainNodes, messageNodes, edges } = await getDomainsCanvasData();

      // Orders -> OrderPlaced -> Payment
      const orderPlacedEdges = edges.filter(
        (e) => e.id.includes('OrderPlaced') && (e.source.includes('Orders') || e.target.includes('Payment'))
      );
      expect(orderPlacedEdges.length).toBeGreaterThan(0);

      // Payment -> PaymentCompleted -> Orders
      const paymentCompletedEdges = edges.filter(
        (e) => e.id.includes('PaymentCompleted') && (e.source.includes('Payment') || e.target.includes('Orders'))
      );
      expect(paymentCompletedEdges.length).toBeGreaterThan(0);
    });

    it('should position nodes using dagre layout', async () => {
      const { domainNodes, messageNodes, edges } = await getDomainsCanvasData();

      // All nodes should have calculated positions
      [...domainNodes, ...messageNodes].forEach((node) => {
        expect(node.position).toBeDefined();
        expect(node.position.x).toBeTypeOf('number');
        expect(node.position.y).toBeTypeOf('number');
        // Dagre should position nodes, not at origin
        expect(node.position.x !== 0 || node.position.y !== 0).toBe(true);
      });
    });

    it('should not create duplicate message nodes for the same relationship', async () => {
      const { domainNodes, messageNodes, edges } = await getDomainsCanvasData();

      // Check that each unique message relationship only creates one node
      const messageNodeIds = messageNodes.map((n) => n.id);
      const uniqueIds = new Set(messageNodeIds);
      expect(messageNodeIds.length).toBe(uniqueIds.size);
    });

    it('should handle domains with no relationships', async () => {
      const { domainNodes, messageNodes, edges } = await getDomainsCanvasData();

      // Even domains with no external relationships should appear
      const allDomainIds = domainNodes.map((n: any) => n.data?.domain?.data?.id);
      expect(allDomainIds).toContain('Orders');
      expect(allDomainIds).toContain('Payment');
      expect(allDomainIds).toContain('Inventory');
    });
  });
});
