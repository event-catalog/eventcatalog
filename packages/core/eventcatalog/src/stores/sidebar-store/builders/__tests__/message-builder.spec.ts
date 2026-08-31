import type { CollectionEntry } from 'astro:content';
import { describe, expect, it, vi } from 'vitest';
import { buildMessageNode, buildMessageSections, DEFAULT_MESSAGE_SECTION_ORDER } from '../message';

vi.mock('@utils/feature', () => ({
  isVisualiserEnabled: () => true,
  isChangelogEnabled: () => false,
}));

vi.mock('@utils/url-builder', () => ({
  buildUrl: (path: string) => path,
}));

const createEvent = (overrides: Record<string, unknown> = {}): CollectionEntry<'events'> =>
  ({
    id: 'events/OrderCreated/index.mdx',
    slug: 'events/OrderCreated',
    collection: 'events',
    data: {
      id: 'OrderCreated',
      name: 'Order Created',
      version: '1.0.0',
      owners: [],
      ...overrides,
    },
  }) as unknown as CollectionEntry<'events'>;

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
  schemas: [],
  resourceDocs: [],
  resourceDocCategories: [],
} as any;

const owners = [{ collection: 'teams', data: { id: 'ordering', name: 'Ordering Team' } }];

const titles = (node: ReturnType<typeof buildMessageNode>) =>
  (node.pages || []).map((page) => (typeof page === 'string' ? page : page.title));

describe('buildMessageSections', () => {
  it('exposes every key in the default order (plus decision-records for custom sidebars)', () => {
    const sections = buildMessageSections(createEvent(), owners, emptyContext);
    const keys = Object.keys(sections).sort();
    expect(keys).toEqual([...DEFAULT_MESSAGE_SECTION_ORDER, 'decision-records'].sort());
  });
});

describe('buildMessageNode with a custom sidebar', () => {
  const event = createEvent({
    producers: [{ collection: 'services', data: { id: 'OrderService', version: '1.0.0' } }],
  });

  it('renders exactly the listed sections, in order', () => {
    const node = buildMessageNode(
      event,
      owners,
      emptyContext,
      false,
      [],
      { triggers: [], triggeredBy: [] },
      {
        sidebar: { sections: ['$owners', '$quick-reference'] },
      }
    );

    expect(titles(node)).toEqual(['Owners', 'Quick Reference']);
    expect(node.pages).toHaveLength(2);
  });

  it('keeps the generated sidebar when no custom sidebar is given', () => {
    expect(titles(buildMessageNode(event, owners, emptyContext))).toEqual([
      'Quick Reference',
      'Architecture',
      'Producers',
      'Owners',
    ]);
  });
});
