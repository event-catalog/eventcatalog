import { getNodesAndEdges } from '../../node-graphs/container-node-graph';
import { expect, describe, it, vi, beforeEach } from 'vitest';
import { mockContainers, mockServices } from './mocks';

vi.mock('@utils/collections/containers', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('@utils/collections/containers')>()),
    getContainers: () => Promise.resolve(mockContainers),
  };
});

describe('Containers NodeGraph', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getNodesAndEdges', () => {
    it('should return the correct nodes and edges for a given container', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'OrderDatabase', version: '1.0.0' });

      expect(nodes).toEqual([
        {
          id: 'SubscriptionService-0.0.1',
          type: undefined,
          sourcePosition: 'right',
          targetPosition: 'left',
          data: { mode: 'simple', service: { ...mockServices[0].data } },
          position: { x: 75, y: 50 },
        },
        {
          id: 'OrderDatabase-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          data: { mode: 'simple', data: { ...mockContainers[0].data } },
          position: { x: 525, y: 50 },
          type: 'data',
        },
        {
          id: 'SubscriptionService-0.0.1',
          sourcePosition: 'left',
          targetPosition: 'right',
          data: { title: 'SubscriptionService', mode: 'simple', service: { ...mockServices[0].data } },
          position: { x: 75, y: 50 },
          type: undefined,
        },
      ]);

      expect(edges).toEqual([
        {
          label: 'reads from \n (undefined)',
          animated: false,
          style: {
            strokeWidth: 1,
          },
          id: 'SubscriptionService-0.0.1-OrderDatabase-1.0.0',
          source: 'OrderDatabase-1.0.0',
          target: 'SubscriptionService-0.0.1',
          data: {
            service: {
              id: 'SubscriptionService',
              version: '0.0.1',
              data: {
                id: 'SubscriptionService',
                version: '0.0.1',
              },
            },
          },
          type: 'multiline',
          markerStart: {
            type: 'arrowclosed',
            width: 40,
            height: 40,
          },
        },
        {
          label: 'read and writes to \n (undefined)',
          animated: false,
          markerEnd: {
            type: 'arrowclosed',
            width: 40,
            height: 40,
          },
          style: {
            strokeWidth: 1,
          },
          id: 'OrderDatabase-1.0.0-SubscriptionService-0.0.1-both',
          source: 'SubscriptionService-0.0.1',
          target: 'OrderDatabase-1.0.0',
          type: 'multiline',
          markerStart: {
            type: 'arrowclosed',
            width: 40,
            height: 40,
          },
        },
      ]);
    });

    it('returns empty nodes and edges if no container is found', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'UnknownContainer', version: '1.0.0' });

      expect(nodes).toEqual([]);
      expect(edges).toEqual([]);
    });
  });
});
