import { getNodesAndEdges } from '../../commands/node-graph';
import { expect, describe, it, vi } from 'vitest';

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
          id: 'AdjustOrder',
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
          id: 'AdjustOrder',
          version: '0.0.1',
        },
      ],
    },
  },
];
const mockCommands = [
  {
    id: 'AdjustOrder',
    slug: 'AdjustOrder',
    collection: 'commands',
    data: {
      id: 'AdjustOrder',
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
      if (key === 'commands') {
        return Promise.resolve(mockCommands);
      }
      return Promise.resolve([]);
    },
  };
});

describe('Commands NodeGraph', () => {
  describe('getNodesAndEdges', () => {
    it('should return nodes and edges for a given event', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'AdjustOrder', version: '0.0.1' });

      // The middle node itself, the service
      const expectedCommandNode = {
        id: 'AdjustOrder-0.0.1',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode: 'simple', message: expect.anything(), showTarget: true, showSource: true },
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'commands',
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
          id: 'OrderService-0.0.1-AdjustOrder-0.0.1',
          source: 'OrderService-0.0.1',
          target: 'AdjustOrder-0.0.1',
          type: 'smoothstep',
          label: 'invokes',
          animated: false,
          markerEnd: { type: 'arrow' },
        },
        {
          id: 'AdjustOrder-0.0.1-PaymentService-0.0.1',
          source: 'AdjustOrder-0.0.1',
          target: 'PaymentService-0.0.1',
          type: 'smoothstep',
          label: 'accepts',
          animated: false,
          markerEnd: { type: 'arrow' },
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

    it('returns an empty array if no commands are found', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'UnknownCommand', version: '1.0.0' });

      expect(nodes).toEqual([]);
      expect(edges).toEqual([]);
    });
  });
});
