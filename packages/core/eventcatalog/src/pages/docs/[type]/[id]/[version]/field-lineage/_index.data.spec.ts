import { beforeEach, describe, expect, it, vi } from 'vitest';

const getMessageIdsWithFieldUsage = vi.fn();
const pageDataLoader = {
  events: vi.fn(),
  commands: vi.fn(),
  queries: vi.fn(),
};

vi.mock('@utils/feature', () => ({
  isSSR: () => false,
}));

vi.mock('@utils/collections/field-usage', () => ({
  getMessageIdsWithFieldUsage: () => getMessageIdsWithFieldUsage(),
}));

vi.mock('@utils/page-loaders/page-data-loader', () => ({
  pageDataLoader,
}));

import { Page } from './_index.data';

const event = (id: string) => ({
  collection: 'events',
  data: { id, version: '1.0.0', name: id },
});

describe('field-lineage static paths', () => {
  beforeEach(() => {
    getMessageIdsWithFieldUsage.mockReset();
    pageDataLoader.events.mockReset();
    pageDataLoader.commands.mockReset();
    pageDataLoader.queries.mockReset();
  });

  it('when we build a catalog, field usage pages are only created for messages that declare fields', async () => {
    getMessageIdsWithFieldUsage.mockResolvedValue(new Set(['OrderCreated']));
    pageDataLoader.events.mockResolvedValue([event('OrderCreated'), event('OrderCancelled')]);
    pageDataLoader.commands.mockResolvedValue([]);
    pageDataLoader.queries.mockResolvedValue([]);

    const paths = await Page.getStaticPaths();

    expect(paths).toEqual([
      {
        params: { type: 'events', id: 'OrderCreated', version: '1.0.0' },
        props: { type: 'events', ...event('OrderCreated') },
      },
    ]);
  });
});
