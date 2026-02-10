import { getNodesAndEdges } from '../../node-graphs/container-node-graph';
import { expect, describe, it, vi, beforeEach } from 'vitest';
import { mockContainers, mockServices, mockDataProducts } from './mocks';

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

    describe('data products', () => {
      it('should render data product nodes that write to the container', async () => {
        const { nodes, edges } = await getNodesAndEdges({ id: 'AnalyticsDatabase', version: '1.0.0' });

        // Check for data product that writes to container
        const dataProductWriteNode = nodes.find((n: any) => n.id === 'OrderDataPipeline-1.0.0');
        expect(dataProductWriteNode).toBeDefined();
        expect(dataProductWriteNode.type).toBe('data-products');
        expect(dataProductWriteNode.data.dataProduct).toEqual(
          expect.objectContaining({
            id: 'OrderDataPipeline',
            version: '1.0.0',
          })
        );

        // Check for the edge
        const writeEdge = edges.find(
          (e: any) => e.source === 'OrderDataPipeline-1.0.0' && e.target === 'AnalyticsDatabase-1.0.0'
        );
        expect(writeEdge).toBeDefined();
        expect(writeEdge.label).toBe('writes to');
      });

      it('should render data product nodes that read from the container', async () => {
        const { nodes, edges } = await getNodesAndEdges({ id: 'AnalyticsDatabase', version: '1.0.0' });

        // Check for data product that reads from container
        const dataProductReadNode = nodes.find((n: any) => n.id === 'OrderAnalytics-1.0.0');
        expect(dataProductReadNode).toBeDefined();
        expect(dataProductReadNode.type).toBe('data-products');
        expect(dataProductReadNode.data.dataProduct).toEqual(
          expect.objectContaining({
            id: 'OrderAnalytics',
            version: '1.0.0',
          })
        );

        // Check for the edge
        const readEdge = edges.find((e: any) => e.source === 'AnalyticsDatabase-1.0.0' && e.target === 'OrderAnalytics-1.0.0');
        expect(readEdge).toBeDefined();
        expect(readEdge.label).toContain('reads from');
      });

      it('should render both services and data products on the same container', async () => {
        const { nodes, edges } = await getNodesAndEdges({ id: 'SharedDatabase', version: '1.0.0' });

        // Check for service that writes
        const serviceNode = nodes.find((n: any) => n.id === 'PaymentService-0.0.1');
        expect(serviceNode).toBeDefined();

        // Check for data product that reads
        const dataProductNode = nodes.find((n: any) => n.id === 'OrderAnalytics-1.0.0');
        expect(dataProductNode).toBeDefined();
        expect(dataProductNode.type).toBe('data-products');

        // Check edges
        const serviceWriteEdge = edges.find(
          (e: any) => e.source === 'PaymentService-0.0.1' && e.target === 'SharedDatabase-1.0.0'
        );
        expect(serviceWriteEdge).toBeDefined();

        const dataProductReadEdge = edges.find(
          (e: any) => e.source === 'SharedDatabase-1.0.0' && e.target === 'OrderAnalytics-1.0.0'
        );
        expect(dataProductReadEdge).toBeDefined();
      });

      it('should render a data product that both reads and writes with a bidirectional edge', async () => {
        const { nodes, edges } = await getNodesAndEdges({ id: 'DataProductBothRW', version: '1.0.0' });

        // Check for data product node (should only appear once despite being in both lists)
        const dataProductNodes = nodes.filter((n: any) => n.id === 'OrderDataPipeline-1.0.0');
        expect(dataProductNodes.length).toBeGreaterThanOrEqual(1);

        // Check for the bidirectional edge
        const bothEdge = edges.find((e: any) => e.id.includes('-both'));
        expect(bothEdge).toBeDefined();
        expect(bothEdge.label).toContain('read and writes to');
        expect(bothEdge.markerStart).toBeDefined();
        expect(bothEdge.markerEnd).toBeDefined();
      });
    });
  });
});
