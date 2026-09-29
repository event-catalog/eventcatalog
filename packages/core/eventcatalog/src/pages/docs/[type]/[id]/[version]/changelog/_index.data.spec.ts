import { beforeEach, describe, expect, it, vi } from 'vitest';

const { featureFlags, pageDataLoader } = vi.hoisted(() => {
  const featureFlags = { ssr: false, changelogEnabled: true };
  const pageDataLoader: Record<string, ReturnType<typeof vi.fn>> = {};

  return {
    featureFlags,
    pageDataLoader: new Proxy(pageDataLoader, {
      get(target, prop: string | symbol) {
        if (typeof prop !== 'string') return undefined;
        if (!target[prop]) target[prop] = vi.fn(async () => []);
        return target[prop];
      },
    }),
  };
});

vi.mock('@utils/feature', () => ({
  isSSR: () => featureFlags.ssr,
  isChangelogEnabled: () => featureFlags.changelogEnabled,
}));

vi.mock('@utils/page-loaders/page-data-loader', () => ({
  pageDataLoader,
}));

import { changelogResourceCollections } from '@utils/changelog-resource-badge';
import { Page } from './_index.data';

const resource = (collection: string, id: string) => ({
  collection,
  data: { id, version: '1.0.0', name: id },
});

describe('changelog static paths', () => {
  beforeEach(() => {
    featureFlags.ssr = false;
    featureFlags.changelogEnabled = true;
    vi.clearAllMocks();
  });

  it('prerenders changelog pages for entities, channels, adrs, and data products when changelog is enabled', async () => {
    pageDataLoader.entities.mockResolvedValue([resource('entities', 'Order')]);
    pageDataLoader.channels.mockResolvedValue([resource('channels', 'PaymentChannel')]);
    pageDataLoader.adrs.mockResolvedValue([resource('adrs', 'UseEventSourcing')]);
    pageDataLoader['data-products'].mockResolvedValue([resource('data-products', 'Orders')]);

    const paths = await Page.getStaticPaths();

    expect(paths).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          params: { type: 'entities', id: 'Order', version: '1.0.0' },
          props: expect.objectContaining({ type: 'entities', collection: 'entities' }),
        }),
        expect.objectContaining({
          params: { type: 'channels', id: 'PaymentChannel', version: '1.0.0' },
          props: expect.objectContaining({ type: 'channels', collection: 'channels' }),
        }),
        expect.objectContaining({
          params: { type: 'adrs', id: 'UseEventSourcing', version: '1.0.0' },
          props: expect.objectContaining({ type: 'adrs', collection: 'adrs' }),
        }),
        expect.objectContaining({
          params: { type: 'data-products', id: 'Orders', version: '1.0.0' },
          props: expect.objectContaining({ type: 'data-products', collection: 'data-products' }),
        }),
      ])
    );

    for (const collection of changelogResourceCollections) {
      expect(pageDataLoader[collection]).toHaveBeenCalled();
    }
    expect(pageDataLoader.diagrams).not.toHaveBeenCalled();
  });

  it('does not prerender changelog pages when changelog is disabled', async () => {
    featureFlags.changelogEnabled = false;

    await expect(Page.getStaticPaths()).resolves.toEqual([]);
    expect(pageDataLoader.entities).not.toHaveBeenCalled();
    expect(pageDataLoader.channels).not.toHaveBeenCalled();
    expect(pageDataLoader.adrs).not.toHaveBeenCalled();
    expect(pageDataLoader['data-products']).not.toHaveBeenCalled();
  });
});
