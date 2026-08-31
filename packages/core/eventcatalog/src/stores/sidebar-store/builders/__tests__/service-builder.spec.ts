import type { CollectionEntry } from 'astro:content';
import { describe, expect, it, vi } from 'vitest';
import { buildServiceNode } from '../service';

vi.mock('@utils/feature', () => ({
  isVisualiserEnabled: () => true,
  isChangelogEnabled: () => false,
}));

vi.mock('@utils/url-builder', () => ({
  buildUrl: (path: string) => path,
}));

vi.mock('@utils/collections/services', () => ({
  getSpecificationsForService: () => [],
}));

const service = {
  id: 'services/ProductApi/index.mdx',
  slug: 'services/ProductApi',
  collection: 'services',
  data: {
    id: 'ProductApi',
    name: 'Product API',
    version: '1.0.0',
    latestVersion: '1.0.0',
    owners: [],
  },
} as unknown as CollectionEntry<'services'>;

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

describe('buildServiceNode', () => {
  it('links directly to the resolved service version from Quick Reference', () => {
    const node = buildServiceNode(service, [], emptyContext);
    const quickReference = node.pages?.find((page) => typeof page !== 'string' && page.title === 'Quick Reference');

    expect(quickReference && typeof quickReference !== 'string' ? quickReference.pages : []).toContainEqual({
      type: 'item',
      title: 'Overview',
      href: '/docs/services/ProductApi/1.0.0',
    });
  });
});

describe('buildServiceNode with a custom sidebar', () => {
  const owners = [{ collection: 'teams', data: { id: 'products', name: 'Products Team' } }];

  it('renders exactly the listed sections, in order', () => {
    const node = buildServiceNode(service, owners, emptyContext, [], [], {
      sidebar: { sections: ['$owners', '$quick-reference'] },
    });

    expect((node.pages || []).map((page) => (typeof page === 'string' ? page : page.title))).toEqual([
      'Owners',
      'Quick Reference',
    ]);
  });
});
