import type { ContentCollectionKey } from 'astro:content';
import { expect, describe, it, vi } from 'vitest';
import { mockDomains, mockServices, mockEvents, mockCommands } from './mocks';
import { getNodesAndEdges } from '@utils/node-graphs/domains-node-graph';
import { MarkerType } from 'reactflow';

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    // this will only affect "foo" outside of the original module
    getCollection: (key: ContentCollectionKey) => {
      switch (key) {
        case 'domains':
          return Promise.resolve(mockDomains);
        case 'services':
          return Promise.resolve(mockServices);
        case 'events':
          return Promise.resolve(mockEvents);
        case 'commands':
          return Promise.resolve(mockCommands);
        default:
          return Promise.resolve([]);
      }
    },
  };
});

describe('Domains NodeGraph', () => {
  describe('getNodesAndEdges', () => {
    it('returns an empty array if no domains are found', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'UnknownDomain', version: '1.0.0' });

      expect(nodes).toEqual([]);
      expect(edges).toEqual([]);
    });

    it('should return nodes and edges for a given domain', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'Shipping', version: '0.0.1' });

      const expectedServiceNode = {
        id: 'LocationService-0.0.1',
        type: 'services',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode: 'simple', service: mockServices[0] },
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      const expectedEventNode = {
        id: 'OrderPlaced-0.0.1',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode: 'simple', message: expect.objectContaining({ id: mockEvents[0].id }) },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'events',
      };

      const expectedEdges = [
        {
          id: 'OrderPlaced-0.0.1-LocationService-0.0.1',
          source: 'OrderPlaced-0.0.1',
          target: 'LocationService-0.0.1',
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
      ];

      expect(nodes).toEqual(
        expect.arrayContaining([
          // Nodes on the left
          expect.objectContaining(expectedEventNode),

          // The command node itself
          expect.objectContaining(expectedServiceNode),
        ])
      );

      expect(edges).toEqual(expectedEdges);
    });

    it('should return nodes and edges for a given domain with services using semver range or latest version (version undefind)', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'Checkout', version: '0.0.1' });

      const expectedNodes = [
        {
          id: 'PlaceOrder-1.7.7',
          sourcePosition: 'right',
          targetPosition: 'left',
          data: { mode: 'simple', message: expect.objectContaining({ id: mockCommands[2].id }) },
          position: { x: expect.any(Number), y: expect.any(Number) },
          type: 'commands',
        },
        {
          id: 'OrderService-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          data: {
            mode: 'simple',
            service: mockServices[2],
          },
          position: { x: expect.any(Number), y: expect.any(Number) },
          type: 'services',
        },
        {
          id: 'OrderPlaced-0.0.1',
          sourcePosition: 'right',
          targetPosition: 'left',
          data: { mode: 'simple', message: expect.objectContaining({ id: mockEvents[0].id }) },
          position: { x: expect.any(Number), y: expect.any(Number) },
          type: 'events',
        },
        /** PAYMENT SERVICE */
        {
          id: 'PaymentService-0.0.1',
          sourcePosition: 'right',
          targetPosition: 'left',
          data: {
            mode: 'simple',
            service: mockServices[3],
          },
          position: { x: expect.any(Number), y: expect.any(Number) },
          type: 'services',
        },
        {
          id: 'PaymentPaid-0.0.1',
          sourcePosition: 'right',
          targetPosition: 'left',
          data: { mode: 'simple', message: expect.objectContaining({ id: mockEvents[1].id }) },
          position: { x: expect.any(Number), y: expect.any(Number) },
          type: 'events',
        },
        {
          id: 'PaymentPaid-0.0.2',
          sourcePosition: 'right',
          targetPosition: 'left',
          data: { mode: 'simple', message: expect.objectContaining({ id: mockEvents[2].id }) },
          position: { x: expect.any(Number), y: expect.any(Number) },
          type: 'events',
        },
        {
          id: 'PaymentRefunded-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          data: { mode: 'simple', message: expect.objectContaining({ id: mockEvents[4].id }) },
          position: { x: expect.any(Number), y: expect.any(Number) },
          type: 'events',
        },
        {
          id: 'PaymentFailed-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          data: { mode: 'simple', message: expect.objectContaining({ id: mockEvents[6].id }) },
          position: { x: expect.any(Number), y: expect.any(Number) },
          type: 'events',
        },
      ];

      const expectedEdges = [
        {
          id: 'PlaceOrder-1.7.7-OrderService-1.0.0',
          source: 'PlaceOrder-1.7.7',
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
          id: 'OrderService-1.0.0-OrderPlaced-0.0.1',
          source: 'OrderService-1.0.0',
          target: 'OrderPlaced-0.0.1',
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
          id: 'OrderPlaced-0.0.1-PaymentService-0.0.1',
          source: 'OrderPlaced-0.0.1',
          target: 'PaymentService-0.0.1',
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
          id: 'PaymentService-0.0.1-PaymentRefunded-1.0.0',
          source: 'PaymentService-0.0.1',
          target: 'PaymentRefunded-1.0.0',
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
          id: 'PaymentService-0.0.1-PaymentFailed-1.0.0',
          source: 'PaymentService-0.0.1',
          target: 'PaymentFailed-1.0.0',
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
          id: 'PaymentService-0.0.1-PaymentPaid-0.0.1',
          source: 'PaymentService-0.0.1',
          target: 'PaymentPaid-0.0.1',
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
          id: 'PaymentService-0.0.1-PaymentPaid-0.0.2',
          source: 'PaymentService-0.0.1',
          target: 'PaymentPaid-0.0.2',
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

      expect(nodes).toStrictEqual(expect.arrayContaining(expectedNodes.map((n) => expect.objectContaining(n))));

      expect(edges).toStrictEqual(expect.arrayContaining(expectedEdges));
    });
  });
});
