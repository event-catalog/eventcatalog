import type { CollectionEntry } from 'astro:content';
import { describe, expect, it, vi } from 'vitest';
import { buildContainerNode } from '../container';

vi.mock('@utils/feature', () => ({
  isVisualiserEnabled: () => true,
  isChangelogEnabled: () => false,
}));

vi.mock('@utils/url-builder', () => ({
  buildUrl: (path: string) => path,
}));

const container = {
  id: 'containers/OrdersDb/index.mdx',
  slug: 'containers/OrdersDb',
  collection: 'containers',
  data: {
    id: 'OrdersDb',
    name: 'Orders Database',
    version: '1.0.0',
    owners: [],
    servicesThatWriteToContainer: [{ data: { id: 'OrderService', version: '1.0.0' } }],
  },
} as unknown as CollectionEntry<'containers'>;

const owners = [{ collection: 'teams', data: { id: 'ordering', name: 'Ordering Team' } }];

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

const titles = (node: ReturnType<typeof buildContainerNode>) =>
  (node.pages || []).map((page) => (typeof page === 'string' ? page : page.title));

describe('buildContainerNode', () => {
  it('keeps the generated sidebar when no custom sidebar is given', () => {
    expect(titles(buildContainerNode(container, owners, emptyContext))).toEqual([
      'Quick Reference',
      'Architecture',
      'Writes',
      'Owners',
    ]);
  });
});

describe('buildContainerNode with a custom sidebar', () => {
  it('renders exactly the listed sections, in order', () => {
    const node = buildContainerNode(container, owners, emptyContext, [], {
      sidebar: { sections: ['$owners', '$quick-reference'] },
    });

    expect(titles(node)).toEqual(['Owners', 'Quick Reference']);
  });
});
