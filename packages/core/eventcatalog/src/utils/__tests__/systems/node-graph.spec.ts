import type { CollectionKey } from 'astro:content';
import { expect, describe, it, vi } from 'vitest';
import { mockSystems, mockServices, mockEvents, mockCommands, mockQueries, mockContainers } from './mocks';
import { getNodesAndEdges } from '@utils/node-graphs/systems-node-graph';

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    // this will only affect "foo" outside of the original module
    getCollection: (key: CollectionKey) => {
      switch (key) {
        case 'systems':
          return Promise.resolve(mockSystems);
        case 'services':
          return Promise.resolve(mockServices);
        case 'events':
          return Promise.resolve(mockEvents);
        case 'commands':
          return Promise.resolve(mockCommands);
        case 'queries':
          return Promise.resolve(mockQueries);
        case 'containers':
          return Promise.resolve(mockContainers);
        case 'channels':
        case 'data-products':
          return Promise.resolve([]);
        default:
          return Promise.resolve([]);
      }
    },
  };
});

describe('Systems NodeGraph', () => {
  describe('getNodesAndEdges', () => {
    it('returns an empty array if no systems are found', async () => {
      // @ts-ignore
      const { nodes, edges } = await getNodesAndEdges({ id: 'UnknownSystem', version: '1.0.0' });

      expect(nodes).toEqual([]);
      expect(edges).toEqual([]);
    });

    it('returns an empty array if the system has no services', async () => {
      // @ts-ignore
      const { nodes, edges } = await getNodesAndEdges({ id: 'EmptySystem', version: '1.0.0' });

      expect(nodes).toEqual([]);
      expect(edges).toEqual([]);
    });

    it('should return the merged nodes and edges for the services in a given system', async () => {
      // @ts-ignore
      const { nodes, edges } = await getNodesAndEdges({ id: 'CoreMonolith', version: '1.0.0' });

      const expectedOrderServiceNode = {
        id: 'OrderService-1.0.0',
        type: 'services',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: expect.objectContaining({ mode: 'simple', service: expect.objectContaining({ id: 'OrderService' }) }),
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      const expectedPaymentServiceNode = {
        id: 'PaymentService-1.0.0',
        type: 'services',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: expect.objectContaining({ mode: 'simple', service: expect.objectContaining({ id: 'PaymentService' }) }),
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      const expectedEventNode = {
        id: 'OrderPlaced-1.0.0',
        type: 'events',
        data: expect.objectContaining({ mode: 'simple', message: expect.objectContaining({ id: 'OrderPlaced' }) }),
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      expect(nodes).toEqual(
        expect.arrayContaining([
          expect.objectContaining(expectedOrderServiceNode),
          expect.objectContaining(expectedPaymentServiceNode),
          expect.objectContaining(expectedEventNode),
        ])
      );

      // The shared message is only rendered once (the two service graphs are merged, not duplicated)
      const orderPlacedNodes = nodes.filter((node: any) => node.id === 'OrderPlaced-1.0.0');
      expect(orderPlacedNodes).toHaveLength(1);
    });

    it('should connect services in the system through the messages they share', async () => {
      // @ts-ignore
      const { edges } = await getNodesAndEdges({ id: 'CoreMonolith', version: '1.0.0' });

      // OrderService sends OrderPlaced...
      const sendsEdge = edges.find((e: any) => e.source === 'OrderService-1.0.0' && e.target === 'OrderPlaced-1.0.0');
      // ...and PaymentService receives it
      const receivesEdge = edges.find((e: any) => e.source === 'OrderPlaced-1.0.0' && e.target === 'PaymentService-1.0.0');

      expect(sendsEdge).toBeDefined();
      expect(receivesEdge).toBeDefined();
    });

    it('should render the data stores (containers) mapped to the system', async () => {
      // @ts-ignore
      const { nodes } = await getNodesAndEdges({ id: 'CoreMonolith', version: '1.0.0' });

      const dataStoreNode = nodes.find((node: any) => node.id === 'OrdersDB-1.0.0');

      expect(dataStoreNode).toEqual(
        expect.objectContaining({
          id: 'OrdersDB-1.0.0',
          type: 'data',
          data: expect.objectContaining({ data: expect.objectContaining({ id: 'OrdersDB' }) }),
        })
      );

      // The data store is only rendered once even though it is reachable via both the
      // service node-graph and the container node-graph (they are merged, not duplicated)
      const dataStoreNodes = nodes.filter((node: any) => node.id === 'OrdersDB-1.0.0');
      expect(dataStoreNodes).toHaveLength(1);
    });

    it('should connect the system services to the data stores they write to', async () => {
      // @ts-ignore
      const { edges } = await getNodesAndEdges({ id: 'CoreMonolith', version: '1.0.0' });

      // OrderService writes to OrdersDB
      const writesToEdge = edges.find((e: any) => e.source === 'OrderService-1.0.0' && e.target === 'OrdersDB-1.0.0');

      expect(writesToEdge).toBeDefined();
    });

    it('should tag nodes with the system group when rendered as a group', async () => {
      // @ts-ignore
      const { nodes } = await getNodesAndEdges({ id: 'CoreMonolith', version: '1.0.0', group: true });

      expect(nodes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'OrderService-1.0.0',
            data: expect.objectContaining({
              group: { type: 'System', value: 'Core Monolith', id: 'CoreMonolith' },
            }),
          }),
        ])
      );
    });
  });
});
