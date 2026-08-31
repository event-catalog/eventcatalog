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

describe('buildDomainNode with a custom sidebar', () => {
  it('respects detailsPanel.architectureDecisions for $decision-records', () => {
    const domain = createDomain({ detailsPanel: { architectureDecisions: { visible: false } } });
    const context = {
      ...emptyContext,
      adrs: [
        {
          collection: 'adrs',
          data: { id: 'adr-1', name: 'ADR 1', version: '1.0.0', appliesTo: [{ type: 'domain', id: 'Ordering' }] },
        },
      ],
    };
    const node = buildDomainNode(domain, [], context, { sidebar: { sections: ['$decision-records'] } });
    expect(node.pages).toEqual([]);
  });

  const domain = createDomain({
    systems: [resource('OrderingSystem')],
    entities: [resource('Order')],
    services: [resource('OrderService')],
  });
  const owners = [{ collection: 'teams', data: { id: 'ordering', name: 'Ordering Team' } }];

  const titles = (node: ReturnType<typeof buildDomainNode>) =>
    (node.pages || []).map((page) => (typeof page === 'string' ? page : page.title));

  it('renders exactly the listed sections, in order', () => {
    const node = buildDomainNode(domain, owners, emptyContext, {
      sidebar: {
        sections: [
          '$quick-reference',
          { title: 'Start here', icon: 'Star', pages: ['[[service|OrderService]]'] },
          '$entities',
          '$systems',
          { section: '$owners', title: 'Team' },
        ],
      },
    });

    expect(titles(node)).toEqual(['Quick Reference', 'Start here', 'Entities', 'Systems', 'Team']);
  });

  it('renders resource subsections as top-level groups (not subtle) when used directly', () => {
    const node = buildDomainNode(domain, owners, emptyContext, { sidebar: { sections: ['$services'] } });
    expect(node.pages).toEqual([{ type: 'group', title: 'Services', icon: 'Server', pages: ['service:OrderService:1.0.0'] }]);
  });

  it('keeps the generated sidebar when no custom sidebar is given', () => {
    expect(titles(buildDomainNode(domain, owners, emptyContext))).toEqual([
      'Quick Reference',
      'Architecture',
      'Systems',
      'Resources',
      'Owners',
    ]);
  });
});
