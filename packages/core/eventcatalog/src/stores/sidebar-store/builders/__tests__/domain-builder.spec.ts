import type { CollectionEntry } from 'astro:content';
import { describe, expect, it, vi } from 'vitest';
import { buildDomainNode } from '../domain';

vi.mock('@utils/feature', () => ({
  isVisualiserEnabled: () => true,
  isChangelogEnabled: () => false,
}));

vi.mock('@utils/url-builder', () => ({
  buildUrl: (path: string) => path,
}));

vi.mock('@utils/collections/domains', () => ({
  getSpecificationsForDomain: () => [],
  hasUbiquitousLanguageTermsWithSubdomainsInCollection: () => false,
}));

const resource = (id: string) => ({ data: { id, name: id, version: '1.0.0' } });

const createDomain = (overrides: Record<string, unknown> = {}): CollectionEntry<'domains'> =>
  ({
    id: 'domains/Ordering/index.mdx',
    slug: 'domains/Ordering',
    collection: 'domains',
    data: {
      id: 'Ordering',
      name: 'Ordering',
      version: '1.0.0',
      owners: [],
      ...overrides,
    },
  }) as unknown as CollectionEntry<'domains'>;

const emptyContext = {
  services: [],
  domains: [],
  events: [],
  commands: [],
  queries: [],
  flows: [],
  containers: [],
  dataProducts: [],
  diagrams: [],
  adrs: [],
  resourceDocs: [],
  resourceDocCategories: [],
} as any;

const getQuickReferenceLinks = (domain: CollectionEntry<'domains'>) => {
  const node = buildDomainNode(domain, [], emptyContext);
  const quickReference = node.pages?.find((page) => typeof page !== 'string' && page.title === 'Quick Reference');
  return quickReference && typeof quickReference !== 'string' ? quickReference.pages : [];
};

describe('buildDomainNode', () => {
  it.each([
    ['subdomains', { domains: [resource('Fulfilment')] }],
    ['systems', { systems: [resource('OrderingSystem')] }],
    ['agents', { agents: [resource('OrderAgent')] }],
    ['data products', { 'data-products': [resource('OrderAnalytics')] }],
  ])('links to Domain Resources when the domain only contains %s', (_type, overrides) => {
    expect(getQuickReferenceLinks(createDomain(overrides))).toContainEqual({
      type: 'item',
      title: 'Domain Resources',
      href: '/docs/domains/Ordering/1.0.0/resources',
    });
  });

  it('does not link to Domain Resources when the domain has no direct resources', () => {
    expect(getQuickReferenceLinks(createDomain())).not.toContainEqual(expect.objectContaining({ title: 'Domain Resources' }));
  });
});
