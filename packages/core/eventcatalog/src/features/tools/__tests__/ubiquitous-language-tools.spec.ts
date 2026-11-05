import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_PAGE_SIZE, explainUbiquitousLanguageTerms } from '../catalog-tools';

// Only astro:content is mocked, and domains point at their subdomains with { id, version } as they do
// in a real catalog, so these tests run through the real collection helpers.
const collections = vi.hoisted(() => ({
  domains: [
    {
      id: 'order-management-1.0.0',
      collection: 'domains',
      filePath: 'domains/order-management/index.mdx',
      data: {
        id: 'order-management',
        name: 'Order Management',
        version: '1.0.0',
        domains: [{ id: 'fulfilment', version: '1.0.0' }],
      },
    },
    {
      id: 'fulfilment-1.0.0',
      collection: 'domains',
      filePath: 'domains/order-management/subdomains/fulfilment/index.mdx',
      data: { id: 'fulfilment', name: 'Fulfilment', version: '1.0.0', domains: [{ id: 'carriers', version: '1.0.0' }] },
    },
    // A subdomain of a subdomain, linked by a pointer from its own top-level folder
    {
      id: 'carriers-1.0.0',
      collection: 'domains',
      filePath: 'domains/carriers/index.mdx',
      data: { id: 'carriers', name: 'Carriers', version: '1.0.0' },
    },
    // Pins its subdomain to an old version, while the glossary lives with the current version
    {
      id: 'warehouse-1.0.0',
      collection: 'domains',
      filePath: 'domains/warehouse/index.mdx',
      data: { id: 'warehouse', name: 'Warehouse', version: '1.0.0', domains: [{ id: 'inventory', version: '1.0.0' }] },
    },
    {
      id: 'inventory-1.0.0',
      collection: 'domains',
      filePath: 'domains/inventory/versioned/1.0.0/index.mdx',
      data: { id: 'inventory', name: 'Inventory', version: '1.0.0' },
    },
    {
      id: 'inventory-2.0.0',
      collection: 'domains',
      filePath: 'domains/inventory/index.mdx',
      data: { id: 'inventory', name: 'Inventory', version: '2.0.0' },
    },
    // Two domains pointing at each other, so neither is a root domain
    {
      id: 'loop-a-1.0.0',
      collection: 'domains',
      filePath: 'domains/loop-a/index.mdx',
      data: { id: 'loop-a', name: 'Loop A', version: '1.0.0', domains: [{ id: 'loop-b', version: '1.0.0' }] },
    },
    {
      id: 'loop-b-1.0.0',
      collection: 'domains',
      filePath: 'domains/loop-b/index.mdx',
      data: { id: 'loop-b', name: 'Loop B', version: '1.0.0', domains: [{ id: 'loop-a', version: '1.0.0' }] },
    },
    {
      id: 'payments-1.0.0',
      collection: 'domains',
      filePath: 'domains/payments/index.mdx',
      data: { id: 'payments', name: 'Payments', version: '1.0.0' },
    },
    {
      id: 'empty-1.0.0',
      collection: 'domains',
      filePath: 'domains/empty/index.mdx',
      data: { id: 'empty', name: 'Empty', version: '1.0.0' },
    },
    // Shares a subdomain with order-management: its terms must only be listed once
    {
      id: 'returns-1.0.0',
      collection: 'domains',
      filePath: 'domains/returns/index.mdx',
      data: { id: 'returns', name: 'Returns', version: '1.0.0', domains: [{ id: 'fulfilment', version: '1.0.0' }] },
    },
  ],
  ubiquitousLanguages: [
    {
      id: 'order-management-language',
      collection: 'ubiquitousLanguages',
      filePath: 'domains/order-management/ubiquitous-language.mdx',
      data: {
        dictionary: [
          { id: 'order', name: 'Order', summary: 'A request to buy goods.', description: 'The long definition of an order.' },
          { id: 'customer', name: 'Customer', summary: 'The person placing an order.' },
        ],
      },
    },
    {
      id: 'fulfilment-language',
      collection: 'ubiquitousLanguages',
      filePath: 'domains/order-management/subdomains/fulfilment/ubiquitous-language.mdx',
      data: { dictionary: [{ id: 'shipment', name: 'Shipment', summary: 'A package on its way.' }] },
    },
    {
      id: 'payments-language',
      collection: 'ubiquitousLanguages',
      filePath: 'domains/payments/ubiquitous-language.mdx',
      data: {
        dictionary: [
          { id: 'customer', name: 'customer', summary: 'The party being charged.' },
          { id: 'refund', name: 'Refund', description: 'Money returned to a customer.' },
        ],
      },
    },
    {
      id: 'carriers-language',
      collection: 'ubiquitousLanguages',
      filePath: 'domains/carriers/ubiquitous-language.mdx',
      data: { dictionary: [{ id: 'carrier', name: 'Carrier', summary: 'A company that delivers packages.' }] },
    },
    {
      id: 'inventory-language',
      collection: 'ubiquitousLanguages',
      filePath: 'domains/inventory/ubiquitous-language.mdx',
      data: { dictionary: [{ id: 'stock-level', name: 'Stock Level', summary: 'How many of an item are available.' }] },
    },
    {
      id: 'loop-a-language',
      collection: 'ubiquitousLanguages',
      filePath: 'domains/loop-a/ubiquitous-language.mdx',
      data: { dictionary: [{ id: 'loop-a-term', name: 'Loop A Term', summary: 'A term in a domain with no root.' }] },
    },
    {
      id: 'loop-b-language',
      collection: 'ubiquitousLanguages',
      filePath: 'domains/loop-b/ubiquitous-language.mdx',
      data: { dictionary: [{ id: 'loop-b-term', name: 'Loop B Term', summary: 'Another term in a domain with no root.' }] },
    },
  ],
}));

vi.mock('astro:content', async (importOriginal) => ({
  ...(await importOriginal<typeof import('astro:content')>()),
  getCollection: (key: keyof typeof collections, filter?: (entry: any) => boolean) => {
    const entries: any[] = collections[key] ?? [];
    return Promise.resolve(filter ? entries.filter(filter) : entries);
  },
}));

/** Calls the tool for a test that expects terms back, so it fails with the error if there is one */
const getTerms = async (params: Parameters<typeof explainUbiquitousLanguageTerms>[0]) => {
  const result = await explainUbiquitousLanguageTerms(params);
  if ('error' in result) throw new Error(result.error);
  return result;
};

describe('explainUbiquitousLanguageTerms', () => {
  describe('for one domain', () => {
    it('returns the terms of the domain and its subdomains', async () => {
      const result = await getTerms({ domainId: 'order-management' });

      expect(result.domainTermCount).toBe(2);
      expect(result.subdomainTermCount).toBe(1);
      expect(result.terms).toContainEqual(
        expect.objectContaining({
          id: 'shipment',
          term: 'Shipment',
          domainId: 'fulfilment',
          domainName: 'Fulfilment',
          parentDomainId: 'order-management',
          isSubdomain: true,
        })
      );
    });

    it('returns the id, the summary and the long description of a term', async () => {
      const result = await getTerms({ domainId: 'order-management' });

      expect(result.terms).toContainEqual(
        expect.objectContaining({
          id: 'order',
          term: 'Order',
          summary: 'A request to buy goods.',
          description: 'The long definition of an order.',
        })
      );
    });

    it('falls back to the summary when a term has no long description', async () => {
      const result = await getTerms({ domainId: 'order-management' });

      expect(result.terms).toContainEqual(
        expect.objectContaining({ term: 'Customer', description: 'The person placing an order.' })
      );
    });

    it('only returns the terms matching the term filter', async () => {
      const result = await getTerms({ domainId: 'order-management', term: 'SHIP' });

      expect(result.terms?.map((term: any) => term.term)).toEqual(['Shipment']);
      expect(result.totalCount).toBe(1);
    });

    it('explains when nothing matches the term filter', async () => {
      const result = await getTerms({ domainId: 'order-management', term: 'invoice' });

      expect(result.terms).toEqual([]);
      expect(result.message).toContain('invoice');
    });

    it('returns an error when the domain does not exist', async () => {
      const result = await explainUbiquitousLanguageTerms({ domainId: 'missing' });

      expect(result).toEqual({ error: 'Domain not found: missing' });
    });
  });

  describe('across the organization', () => {
    it('returns the terms of every domain and subdomain when no domain is given', async () => {
      const result = await getTerms({});

      expect(result.totalCount).toBe(9);
      expect(result.terms?.map((term: any) => `${term.domainId}:${term.id}`)).toEqual([
        'order-management:order',
        'order-management:customer',
        'fulfilment:shipment',
        'carriers:carrier',
        'payments:customer',
        'payments:refund',
        'inventory:stock-level',
        'loop-a:loop-a-term',
        'loop-b:loop-b-term',
      ]);
    });

    it('includes the subdomain of a subdomain, under its direct parent', async () => {
      const result = await getTerms({ term: 'carrier' });

      expect(result.terms).toEqual([
        expect.objectContaining({ id: 'carrier', domainId: 'carriers', isSubdomain: true, parentDomainId: 'fulfilment' }),
      ]);
    });

    it('finds the terms of a subdomain pinned to an old version, which live with its current version', async () => {
      const result = await getTerms({ term: 'stock' });

      expect(result.terms).toEqual([
        expect.objectContaining({ id: 'stock-level', domainId: 'inventory', isSubdomain: true, parentDomainId: 'warehouse' }),
      ]);
    });

    it('lists domains that point at each other once, rather than leaving them out', async () => {
      const result = await getTerms({ term: 'loop' });

      expect(result.terms?.map((term: any) => [term.domainId, term.parentDomainId])).toEqual([
        ['loop-a', undefined],
        ['loop-b', 'loop-a'],
      ]);
    });

    it('returns each domain meaning of a term, without merging them', async () => {
      const result = await getTerms({ term: 'customer' });

      expect(result.terms?.map((term: any) => [term.domainName, term.description])).toEqual([
        ['Order Management', 'The person placing an order.'],
        ['Payments', 'The party being charged.'],
      ]);
    });

    it('flags the terms defined in more than one domain, ignoring case', async () => {
      const result = await getTerms({});

      expect(result.duplicateTerms).toEqual(['customer']);
      expect(result.terms?.filter((term: any) => term.isDuplicate).map((term: any) => term.domainId)).toEqual([
        'order-management',
        'payments',
      ]);
    });

    it('explains when no term matches', async () => {
      const result = await getTerms({ term: 'invoice' });

      expect(result.terms).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.message).toContain('invoice');
    });

    it('paginates the terms with a cursor', async () => {
      const manyTerms = Array.from({ length: DEFAULT_PAGE_SIZE }, (_, index) => ({ id: `term-${index}`, name: `Term ${index}` }));
      const dictionary = collections.ubiquitousLanguages[2].data.dictionary as any[];
      dictionary.push(...manyTerms);

      try {
        const firstPage = await getTerms({});
        expect(firstPage.terms).toHaveLength(DEFAULT_PAGE_SIZE);
        expect(firstPage.totalCount).toBe(DEFAULT_PAGE_SIZE + 9);
        expect(firstPage.nextCursor).toBeDefined();

        const secondPage = await getTerms({ cursor: firstPage.nextCursor });
        expect(secondPage.terms).toHaveLength(9);
        expect(secondPage.nextCursor).toBeUndefined();
      } finally {
        dictionary.splice(-manyTerms.length);
      }
    });

    it('returns an error for an invalid cursor', async () => {
      const result = await explainUbiquitousLanguageTerms({ cursor: 'not-a-cursor' });

      expect(result).toEqual({ error: 'Invalid or malformed cursor' });
    });
  });
});
