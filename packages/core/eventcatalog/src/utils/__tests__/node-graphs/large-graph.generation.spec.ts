import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCollection } from 'astro:content';
import { getNodesAndEdges as getDomainNodesAndEdges } from '@utils/node-graphs/domains-node-graph';
import { createLargeCatalog, installLargeCatalogMock } from './large-catalog';

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getCollection: vi.fn(),
  };
});

const catalog = createLargeCatalog();

describe('large domain graph generation', () => {
  beforeEach(() => {
    vi.mocked(getCollection).mockImplementation(installLargeCatalogMock(catalog, getCollection) as any);
  });

  it('builds a stable Commerce graph', async () => {
    const { nodes, edges } = await getDomainNodesAndEdges({
      id: 'Commerce',
      version: '1.0.0',
      mode: 'simple',
      layout: false,
    } as any);

    expect(nodes).toHaveLength(278);
    expect(edges).toHaveLength(2145);
  });
});
