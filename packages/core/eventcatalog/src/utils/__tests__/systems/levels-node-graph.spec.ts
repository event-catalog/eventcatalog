import type { CollectionKey } from 'astro:content';
import { expect, describe, it, vi } from 'vitest';
import { getNodesAndEdges } from '@utils/node-graphs/system-levels-node-graph';

const makeSystem = (id: string, data: Record<string, any> = {}) => ({
  id: `systems/${id}/index.mdx`,
  slug: `systems/${id}`,
  collection: 'systems',
  data: { id, name: id, version: '1.0.0', ...data },
});

const systems = [
  makeSystem('Shipping', { relationships: [{ id: 'Carrier', label: 'delivers shipments with' }] }),
  makeSystem('Carrier'),
];

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getCollection: (key: CollectionKey) => Promise.resolve(key === 'systems' ? systems : []),
  };
});

// The Shipping system's resource diagram: a system group with one service inside
vi.mock('@utils/node-graphs/systems-node-graph', () => ({
  getNodesAndEdges: () =>
    Promise.resolve({
      nodes: [
        {
          id: 'system-group-Shipping-1.0.0',
          type: 'system-group',
          position: { x: 0, y: 0 },
          style: { width: 600, height: 400 },
          data: {},
        },
        {
          id: 'ShippingService-1.0.0',
          type: 'services',
          parentId: 'system-group-Shipping-1.0.0',
          position: { x: 100, y: 164 },
          data: {},
        },
      ],
      edges: [],
    }),
}));

describe('System Levels NodeGraph', () => {
  it('replaces the system node in its context diagram with the expanded system group', async () => {
    const { nodes } = await getNodesAndEdges({ id: 'Shipping', version: '1.0.0' });

    expect(nodes.map((node: any) => node.id)).toEqual(['system-group-Shipping-1.0.0', 'Carrier-1.0.0', 'ShippingService-1.0.0']);
  });

  it('connects the system relationships to the system group', async () => {
    const { edges } = await getNodesAndEdges({ id: 'Shipping', version: '1.0.0' });

    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      source: 'system-group-Shipping-1.0.0',
      target: 'Carrier-1.0.0',
      label: 'delivers shipments with',
    });
  });

  it('lays the children out inside the group', async () => {
    const { nodes } = await getNodesAndEdges({ id: 'Shipping', version: '1.0.0' });
    const group = nodes.find((node: any) => node.id === 'system-group-Shipping-1.0.0');
    const child = nodes.find((node: any) => node.id === 'ShippingService-1.0.0');

    expect(child?.parentId).toBe(group.id);
    // Child positions are relative to the group, and within it
    expect(child.position.x).toBeGreaterThanOrEqual(0);
    expect(child.position.y).toBeGreaterThanOrEqual(0);
    expect(child.position.x).toBeLessThan(group.style.width);
    expect(child.position.y).toBeLessThan(group.style.height);
  });

  it('returns the context diagram as level 1, and the graph without messages, laid out', async () => {
    const { overview, hiddenMessages } = await getNodesAndEdges({ id: 'Shipping', version: '1.0.0' });

    expect(overview).toBeDefined();
    expect(overview!.nodes.map((node: any) => node.id).sort()).toEqual(['Carrier-1.0.0', 'Shipping-1.0.0']);
    expect(overview!.edges[0]).toMatchObject({ source: 'Shipping-1.0.0', target: 'Carrier-1.0.0' });
    expect(overview!.edges[0].data.route.points.length).toBeGreaterThanOrEqual(2);
    expect(hiddenMessages.nodes.map((node: any) => node.id)).toEqual([
      'system-group-Shipping-1.0.0',
      'Carrier-1.0.0',
      'ShippingService-1.0.0',
    ]);
  });
});
