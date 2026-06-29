import type { CollectionKey } from 'astro:content';
import { expect, describe, it, vi, beforeEach } from 'vitest';
import { MarkerType } from '@xyflow/react';
import { getNodesAndEdges } from '@utils/node-graphs/system-context-node-graph';

// Each test sets its own systems via `setSystems` before calling the builder.
let systems: any[] = [];
const setSystems = (next: any[]) => {
  systems = next;
};

const makeSystem = (id: string, data: Record<string, any> = {}) => ({
  id: `systems/${id}/index.mdx`,
  slug: `systems/${id}`,
  collection: 'systems',
  data: { id, name: id, version: '1.0.0', ...data },
});

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getCollection: (key: CollectionKey) => {
      switch (key) {
        case 'systems':
          return Promise.resolve(systems);
        case 'services':
        default:
          return Promise.resolve([]);
      }
    },
  };
});

describe('System Context NodeGraph', () => {
  beforeEach(() => {
    systems = [];
  });

  describe('reciprocal system relationships', () => {
    it('collapses two reciprocal relationships into a single double-headed edge', async () => {
      setSystems([
        makeSystem('Shipping', { relationships: [{ id: 'Carrier', label: 'delivers shipments for' }] }),
        makeSystem('Carrier', { relationships: [{ id: 'Shipping', label: 'delivers shipments for' }] }),
      ]);

      const { edges } = await getNodesAndEdges({ id: 'Shipping', version: '1.0.0' });

      const systemEdges = edges.filter((edge: any) => edge.source.startsWith('Shipping') || edge.source.startsWith('Carrier'));

      // One edge, not two, with arrowheads on both ends.
      expect(systemEdges).toHaveLength(1);
      expect(systemEdges[0].markerStart).toEqual({ type: MarkerType.ArrowClosed, width: 20, height: 20 });
      expect(systemEdges[0].markerEnd).toEqual({ type: MarkerType.ArrowClosed, width: 20, height: 20 });
    });

    it('joins the two direction labels when they differ', async () => {
      setSystems([
        makeSystem('Shipping', { relationships: [{ id: 'Carrier', label: 'sends shipments to' }] }),
        makeSystem('Carrier', { relationships: [{ id: 'Shipping', label: 'returns tracking to' }] }),
      ]);

      const { edges } = await getNodesAndEdges({ id: 'Shipping', version: '1.0.0' });

      expect(edges).toHaveLength(1);
      expect(edges[0].label).toBe('sends shipments to / returns tracking to');
    });

    it('keeps a single label when both directions share the same label', async () => {
      setSystems([
        makeSystem('Shipping', { relationships: [{ id: 'Carrier', label: 'delivers shipments for' }] }),
        makeSystem('Carrier', { relationships: [{ id: 'Shipping', label: 'delivers shipments for' }] }),
      ]);

      const { edges } = await getNodesAndEdges({ id: 'Shipping', version: '1.0.0' });

      expect(edges).toHaveLength(1);
      expect(edges[0].label).toBe('delivers shipments for');
    });

    it('leaves a one-directional relationship as a single-headed edge', async () => {
      setSystems([
        makeSystem('Shipping', { relationships: [{ id: 'Carrier', label: 'delivers shipments for' }] }),
        makeSystem('Carrier'),
      ]);

      const { edges } = await getNodesAndEdges({ id: 'Shipping', version: '1.0.0' });

      expect(edges).toHaveLength(1);
      expect(edges[0].markerEnd).toEqual({ type: MarkerType.ArrowClosed, width: 20, height: 20 });
      expect(edges[0].markerStart).toBeUndefined();
    });
  });
});
