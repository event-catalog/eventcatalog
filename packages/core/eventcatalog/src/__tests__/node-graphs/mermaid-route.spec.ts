import { beforeEach, describe, expect, it, vi } from 'vitest';

const diagram = vi.hoisted(() => ({ getGraph: vi.fn() }));

vi.mock('@utils/node-graphs/architecture-diagram', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@utils/node-graphs/architecture-diagram')>()),
  getArchitectureDiagramGraph: diagram.getGraph,
}));

vi.mock('@utils/feature', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@utils/feature')>()),
  isAuthEnabled: () => false,
  isVisualiserEnabled: () => true,
}));

const resource = (id: string) => ({ data: { id, version: '1.0.0' } });

vi.mock('@utils/page-loaders/page-data-loader', () => ({
  pageDataLoader: {
    events: () => Promise.resolve([resource('order-created')]),
    commands: () => Promise.resolve([]),
    queries: () => Promise.resolve([]),
    services: () => Promise.resolve([resource('order-service')]),
    domains: () => Promise.resolve([resource('ordering')]),
    systems: () => Promise.resolve([resource('checkout-system')]),
    containers: () => Promise.resolve([]),
    'data-products': () => Promise.resolve([]),
  },
}));

vi.mock('@utils/collections/flows', () => ({ getFlows: () => Promise.resolve([]) }));

const serviceGraph = {
  nodes: [{ id: 'order-service-1.0.0', type: 'services', data: { service: { name: 'Order Service', version: '1.0.0' } } }],
  edges: [],
};

const get = async (route: { GET: any }, params: Record<string, string>) => {
  const response: Response = await route.GET({ params } as any);
  return { status: response.status, text: await response.text() };
};

describe('architecture diagrams as Mermaid (/visualiser/{type}/{id}/{version}.mermaid)', () => {
  beforeEach(() => {
    diagram.getGraph.mockReset();
    diagram.getGraph.mockResolvedValue(serviceGraph);
  });

  it('serves domain diagrams from a route next to the domain Diagram page, so the page does not handle .mermaid requests', async () => {
    const route = await import('../../pages/visualiser/domains/[id]/[version].mermaid');

    const { status, text } = await get(route, { id: 'ordering', version: '1.0.0' });

    expect(status).toBe(200);
    expect(text).toContain('%% Resource: domains/ordering (v1.0.0)');
    expect(text).toContain('flowchart LR');
    expect(diagram.getGraph).toHaveBeenCalledWith({ collection: 'domains', id: 'ordering', version: '1.0.0' });
  });

  it('serves system diagrams from a route next to the system Diagram page', async () => {
    const route = await import('../../pages/visualiser/systems/[id]/[version].mermaid');

    const { status } = await get(route, { id: 'checkout-system', version: '1.0.0' });

    expect(status).toBe(200);
    expect(diagram.getGraph).toHaveBeenCalledWith({ collection: 'systems', id: 'checkout-system', version: '1.0.0' });
  });

  it('builds a Mermaid file for every domain and system version in static builds', async () => {
    const domains = await import('../../pages/visualiser/domains/[id]/[version].mermaid');
    const systems = await import('../../pages/visualiser/systems/[id]/[version].mermaid');

    expect(await domains.getStaticPaths({} as any)).toEqual([{ params: { id: 'ordering', version: '1.0.0' } }]);
    expect(await systems.getStaticPaths({} as any)).toEqual([{ params: { id: 'checkout-system', version: '1.0.0' } }]);
  });

  it('leaves domains and systems to their own routes, so static builds do not write the same file twice', async () => {
    const route = await import('../../pages/visualiser/[type]/[id]/[version].mermaid');

    const types = (await route.getStaticPaths({} as any)).map((path: any) => path.params.type);

    expect(types).toContain('services');
    expect(types).toContain('events');
    expect(types).not.toContain('domains');
    expect(types).not.toContain('systems');
  });

  it('still serves other resources from the generic route', async () => {
    const route = await import('../../pages/visualiser/[type]/[id]/[version].mermaid');

    const { status, text } = await get(route, { type: 'services', id: 'order-service', version: '1.0.0' });

    expect(status).toBe(200);
    expect(text).toContain('order_service_1_0_0[["Order Service (1.0.0)"]]');
  });

  it('returns 404 when a resource has no diagram', async () => {
    diagram.getGraph.mockResolvedValue({ nodes: [], edges: [] });
    const route = await import('../../pages/visualiser/domains/[id]/[version].mermaid');

    const { status } = await get(route, { id: 'empty', version: '1.0.0' });

    expect(status).toBe(404);
  });

  it('returns 400 for a type without architecture diagrams', async () => {
    const route = await import('../../pages/visualiser/[type]/[id]/[version].mermaid');

    const { status } = await get(route, { type: 'teams', id: 'payments-team', version: '1.0.0' });

    expect(status).toBe(400);
  });
});
