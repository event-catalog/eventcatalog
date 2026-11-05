import { describe, expect, it, vi } from 'vitest';
import { createScopedCatalogTools } from '../mcp-scoped-tools';
import { McpScope } from '../mcp-scope';

// The wider catalog has a newer version of the payment service that is not part of the payments domain
vi.mock('astro:content', () => {
  const collections: Record<string, any[]> = {
    services: [
      { id: 'payment-service-1.0.0', collection: 'services', data: { id: 'payment-service', version: '1.0.0' } },
      { id: 'payment-service-2.0.0', collection: 'services', data: { id: 'payment-service', version: '2.0.0' } },
    ],
    domains: [
      {
        id: 'payments-1.0.0',
        collection: 'domains',
        filePath: 'domains/payments/index.mdx',
        data: { id: 'payments', version: '1.0.0', name: 'Payments' },
      },
      {
        id: 'ordering-1.0.0',
        collection: 'domains',
        filePath: 'domains/ordering/index.mdx',
        data: { id: 'ordering', version: '1.0.0', name: 'Ordering' },
      },
    ],
    ubiquitousLanguages: [
      {
        filePath: 'domains/payments/ubiquitous-language.mdx',
        data: {
          dictionary: [
            { id: 'refund', name: 'Refund', summary: 'Money returned to a customer.' },
            { id: 'customer', name: 'Customer', summary: 'The party being charged.' },
          ],
        },
      },
      {
        filePath: 'domains/ordering/ubiquitous-language.mdx',
        data: { dictionary: [{ id: 'customer', name: 'Customer', summary: 'The person placing an order.' }] },
      },
    ],
  };

  return {
    getCollection: vi.fn((collection: string, filter?: (entry: any) => boolean) => {
      const entries = collections[collection] ?? [];
      return Promise.resolve(filter ? entries.filter(filter) : entries);
    }),
  };
});

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
  describe('explainUbiquitousLanguageTerms', () => {
    it('uses the scoped domain, not the whole catalog, when no domain is given', async () => {
      const tools = createScopedCatalogTools(createScope());

      const result = await tools.explainUbiquitousLanguageTerms({});

      expect('terms' in result && result.terms?.map((term: any) => `${term.domainId}:${term.id}`)).toEqual([
        'payments:refund',
        'payments:customer',
      ]);
    });

    it('only finds a term in the scoped domain', async () => {
      const tools = createScopedCatalogTools(createScope());

      const result = await tools.explainUbiquitousLanguageTerms({ term: 'customer' });

      expect('terms' in result && result.terms?.map((term: any) => term.description)).toEqual(['The party being charged.']);
    });

    it('fails closed for a domain outside the scope', async () => {
      const tools = createScopedCatalogTools(createScope());

      await expect(tools.explainUbiquitousLanguageTerms({ domainId: 'ordering' })).resolves.toEqual({
        error: 'Resource not found: domains/ordering',
      });
    });
  });

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
