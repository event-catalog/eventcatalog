import { describe, expect, it, vi } from 'vitest';
import type { CollectionEntry } from 'astro:content';
import { buildEntityNode } from '../builders/entity';

vi.mock('@utils/feature', () => ({
  isVisualiserEnabled: () => true,
  isChangelogEnabled: () => false,
}));

vi.mock('@utils/url-builder', () => ({
  buildUrl: (path: string) => path,
}));

const createEntity = (overrides: Partial<CollectionEntry<'entities'>['data']> = {}): CollectionEntry<'entities'> =>
  ({
    id: 'entities/Order/index.mdx',
    collection: 'entities',
    data: {
      id: 'Order',
      name: 'Order',
      version: '0.0.1',
      summary: 'Order aggregate',
      ...overrides,
    },
  }) as CollectionEntry<'entities'>;

const createDomain = (id: string, version: string): CollectionEntry<'domains'> =>
  ({
    id: `domains/${id}/index.mdx`,
    collection: 'domains',
    data: {
      id,
      name: id,
      version,
    },
  }) as CollectionEntry<'domains'>;

const emptyContext = {
  services: [] as CollectionEntry<'services'>[],
  domains: [] as CollectionEntry<'domains'>[],
  events: [] as CollectionEntry<'events'>[],
  commands: [] as CollectionEntry<'commands'>[],
  queries: [] as CollectionEntry<'queries'>[],
  flows: [] as CollectionEntry<'flows'>[],
  containers: [] as CollectionEntry<'containers'>[],
  dataProducts: [] as CollectionEntry<'data-products'>[],
  diagrams: [] as CollectionEntry<'diagrams'>[],
  adrs: [],
  resourceDocs: [],
  resourceDocCategories: [],
};

describe('buildEntityNode', () => {
  it('adds an Entity Map architecture link when the entity belongs to one domain', () => {
    const entity = createEntity({
      domains: [createDomain('Orders', '0.0.1')] as any,
    });

    const result = buildEntityNode(entity, [], emptyContext);
    const architectureSection = (result.pages as any[])?.find((page) => page.title === 'Architecture');

    expect(architectureSection).toEqual({
      type: 'group',
      title: 'Architecture',
      icon: 'Workflow',
      pages: [
        {
          type: 'item',
          title: 'Entity Map',
          href: '/visualiser/domains/Orders/0.0.1/entity-map',
        },
      ],
    });
  });
});
