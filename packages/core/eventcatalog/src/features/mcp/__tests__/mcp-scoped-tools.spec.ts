import { describe, expect, it, vi } from 'vitest';
import { createScopedCatalogTools } from '../mcp-scoped-tools';
import { McpScope } from '../mcp-scope';

// The wider catalog has a newer version of the payment service that is not part of the payments domain
vi.mock('astro:content', () => ({
  getCollection: vi.fn((collection: string) =>
    Promise.resolve(
      collection === 'services'
        ? [
            { id: 'payment-service-1.0.0', collection: 'services', data: { id: 'payment-service', version: '1.0.0' } },
            { id: 'payment-service-2.0.0', collection: 'services', data: { id: 'payment-service', version: '2.0.0' } },
          ]
        : []
    )
  ),
}));

const domain = {
  id: 'payments-1.0.0',
  collection: 'domains',
  data: { id: 'payments', version: '1.0.0', name: 'Payments' },
};
const service = {
  id: 'payment-service-1.0.0',
  collection: 'services',
  data: {
    id: 'payment-service',
    version: '1.0.0',
    name: 'Payment Service',
    summary: 'Processes payments',
    owners: ['payments-team'],
  },
};

const createScope = () => {
  const scope = new McpScope({ kind: 'domain', id: 'payments' }, domain);
  scope.add(domain);
  scope.add(service);
  return scope;
};

describe('createScopedCatalogTools', () => {
  it('lists only resources included in the scope', async () => {
    const tools = createScopedCatalogTools(createScope());

    await expect(tools.getResources({ collection: 'services' })).resolves.toEqual({
      resources: [
        {
          id: 'payment-service',
          version: '1.0.0',
          name: 'Payment Service',
          summary: 'Processes payments',
        },
      ],
      nextCursor: undefined,
      totalCount: 1,
      scope: { kind: 'domain', id: 'payments', version: '1.0.0' },
    });
  });

  it('fails closed before looking up a resource outside the scope', async () => {
    const tools = createScopedCatalogTools(createScope());

    await expect(tools.getResource({ collection: 'services', id: 'ordering-service', version: '1.0.0' })).resolves.toEqual({
      error: 'Resource not found: services/ordering-service (1.0.0)',
    });
  });

  it('resolves an omitted version to the latest version inside the scope, not the latest in the whole catalog', async () => {
    const tools = createScopedCatalogTools(createScope());

    const result = await tools.getResource({ collection: 'services', id: 'payment-service' });

    expect(result).toEqual(expect.objectContaining({ id: 'payment-service', version: '1.0.0' }));
  });

  it('only draws architecture diagrams for resources inside the scope', async () => {
    const tools = createScopedCatalogTools(createScope());

    await expect(
      tools.getArchitectureDiagramAsMermaid({ resourceId: 'ordering-service', resourceCollection: 'services' })
    ).resolves.toEqual({ error: 'Resource not found: services/ordering-service' });
  });

  it('searches owners only across resources in the scope', async () => {
    const tools = createScopedCatalogTools(createScope());

    const result = await tools.findResourcesByOwner({ ownerId: 'payments-team' });

    expect(result.resources).toEqual([
      {
        collection: 'services',
        id: 'payment-service',
        version: '1.0.0',
        name: 'Payment Service',
      },
    ]);
  });
});
