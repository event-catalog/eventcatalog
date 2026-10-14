import { beforeEach, describe, expect, it, vi } from 'vitest';

const graph = (label: string) => ({ nodes: [{ id: label }], edges: [] });

const builders = vi.hoisted(() => ({
  domainLevels: vi.fn(),
  systemLevels: vi.fn(),
  domains: vi.fn(),
  systems: vi.fn(),
  services: vi.fn(),
}));

vi.mock('@utils/node-graphs/domain-levels-node-graph', () => ({ getNodesAndEdges: builders.domainLevels }));
vi.mock('@utils/node-graphs/system-levels-node-graph', () => ({ getNodesAndEdges: builders.systemLevels }));
vi.mock('@utils/node-graphs/domains-node-graph', () => ({ getNodesAndEdges: builders.domains }));
vi.mock('@utils/node-graphs/systems-node-graph', () => ({ getNodesAndEdges: builders.systems }));
vi.mock('@utils/node-graphs/services-node-graph', () => ({ getNodesAndEdges: builders.services }));
vi.mock('@utils/node-graphs/agents-node-graph', () => ({ getNodesAndEdges: vi.fn() }));
vi.mock('@utils/node-graphs/message-node-graph', () => ({
  getNodesAndEdgesForEvents: vi.fn(),
  getNodesAndEdgesForCommands: vi.fn(),
  getNodesAndEdgesForQueries: vi.fn(),
}));
vi.mock('@utils/node-graphs/flows-node-graph', () => ({ getNodesAndEdges: vi.fn() }));
vi.mock('@utils/node-graphs/data-products-node-graph', () => ({ getNodesAndEdges: vi.fn() }));
vi.mock('@utils/node-graphs/container-node-graph', () => ({ getNodesAndEdges: vi.fn() }));

import { getArchitectureDiagramGraph } from '@utils/node-graphs/architecture-diagram';
import { isArchitectureDiagramCollection } from '@utils/node-graphs/architecture-diagram-types';

describe('getArchitectureDiagramGraph', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    builders.domainLevels.mockResolvedValue({
      ...graph('domain-detailed'),
      overview: graph('domain-overview'),
      hiddenMessages: graph('x'),
    });
    builders.systemLevels.mockResolvedValue({
      ...graph('system-detailed'),
      overview: graph('system-context'),
      hiddenMessages: graph('x'),
    });
    builders.services.mockResolvedValue(graph('service'));
  });

  it('builds a domain diagram the same way as the domain Diagram page, so domains made of systems are not empty', async () => {
    const result = await getArchitectureDiagramGraph({ collection: 'domains', id: 'ordering', version: '1.0.0' });

    expect(builders.domainLevels).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ordering', version: '1.0.0', mode: 'full' })
    );
    expect(builders.domains).not.toHaveBeenCalled();
    expect(result).toEqual({ nodes: [{ id: 'domain-detailed' }], edges: [] });
  });

  it('builds a system diagram the same way as the system Diagram page', async () => {
    const result = await getArchitectureDiagramGraph({ collection: 'systems', id: 'checkout-system', version: '1.0.0' });

    expect(builders.systemLevels).toHaveBeenCalledWith(expect.objectContaining({ id: 'checkout-system', mode: 'full' }));
    expect(builders.systems).not.toHaveBeenCalled();
    expect(result.nodes).toEqual([{ id: 'system-detailed' }]);
  });

  it('returns the level 1 overview of a domain or system when asked for an overview', async () => {
    const domain = await getArchitectureDiagramGraph({
      collection: 'domains',
      id: 'ordering',
      version: '1.0.0',
      detail: 'overview',
    });
    const system = await getArchitectureDiagramGraph({
      collection: 'systems',
      id: 'checkout',
      version: '1.0.0',
      detail: 'overview',
    });

    expect(domain.nodes).toEqual([{ id: 'domain-overview' }]);
    expect(system.nodes).toEqual([{ id: 'system-context' }]);
  });

  it('falls back to the full diagram when a domain has no overview (no systems or subdomains)', async () => {
    builders.domainLevels.mockResolvedValue({ ...graph('domain-detailed'), hiddenMessages: graph('x') });

    const result = await getArchitectureDiagramGraph({
      collection: 'domains',
      id: 'small',
      version: '1.0.0',
      detail: 'overview',
    });

    expect(result.nodes).toEqual([{ id: 'domain-detailed' }]);
  });

  it('uses the resource graph for other collections', async () => {
    const result = await getArchitectureDiagramGraph({ collection: 'services', id: 'checkout-api', version: '1.0.0' });

    expect(builders.services).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'checkout-api', version: '1.0.0', mode: 'full' })
    );
    expect(result.nodes).toEqual([{ id: 'service' }]);
  });

  it('knows which collections have architecture diagrams', () => {
    expect(isArchitectureDiagramCollection('domains')).toBe(true);
    expect(isArchitectureDiagramCollection('agents')).toBe(true);
    expect(isArchitectureDiagramCollection('teams')).toBe(false);
  });
});
