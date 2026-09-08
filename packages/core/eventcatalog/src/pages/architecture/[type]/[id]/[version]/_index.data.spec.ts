import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadArchitectureItems, Page } from './_index.data';

const collectionMocks = vi.hoisted(() => ({
  getDomains: vi.fn(),
  getServices: vi.fn(),
  getSystems: vi.fn(),
}));

vi.mock('@utils/feature', () => ({
  isSSR: () => false,
}));

vi.mock('@utils/collections/domains', () => ({ getDomains: collectionMocks.getDomains }));
vi.mock('@utils/collections/systems', () => ({ getSystems: collectionMocks.getSystems }));
vi.mock('@utils/page-loaders/page-data-loader', () => ({
  pageDataLoader: {
    services: (...args: unknown[]) => collectionMocks.getServices(...args),
    domains: (...args: unknown[]) => collectionMocks.getDomains(...args),
    systems: (...args: unknown[]) => collectionMocks.getSystems(...args),
  },
}));

const domain = {
  collection: 'domains',
  data: { id: 'ordering', name: 'Ordering', version: '1.0.0' },
};

const service = {
  collection: 'services',
  data: { id: 'order-service', name: 'Order Service', version: '1.0.0' },
};

const system = {
  collection: 'systems',
  data: { id: 'order-management-system', name: 'Order Management', version: '1.0.0' },
};

describe('architecture page data', () => {
  beforeEach(() => {
    collectionMocks.getDomains.mockReset().mockResolvedValue([domain]);
    collectionMocks.getServices.mockReset().mockResolvedValue([service]);
    collectionMocks.getSystems.mockReset().mockResolvedValue([system]);
  });

  it('hydrates domain and system services for static architecture paths', async () => {
    const paths = await Page.getStaticPaths();

    expect(collectionMocks.getDomains).toHaveBeenCalledWith({ enrichServices: true });
    expect(collectionMocks.getSystems).toHaveBeenCalledWith({ enrichServices: true });
    expect(paths).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          params: { type: 'domains', id: 'ordering', version: '1.0.0' },
        }),
        expect.objectContaining({
          params: { type: 'systems', id: 'order-management-system', version: '1.0.0' },
        }),
        expect.objectContaining({
          params: { type: 'services', id: 'order-service', version: '1.0.0' },
        }),
      ])
    );
  });

  it('hydrates domain services when architecture pages are fetched in SSR', async () => {
    await Page.getData({
      props: {},
      params: { type: 'domains', id: 'ordering', version: '1.0.0' },
    } as any);

    expect(collectionMocks.getDomains).toHaveBeenCalledWith({ enrichServices: true });
  });

  it('hydrates system services when architecture pages are fetched in SSR', async () => {
    await Page.getData({
      props: {},
      params: { type: 'systems', id: 'order-management-system', version: '1.0.0' },
    } as any);

    expect(collectionMocks.getSystems).toHaveBeenCalledWith({ enrichServices: true });
  });

  it('loads domains with enrichServices so DomainGrid command links keep their collection', async () => {
    await loadArchitectureItems('domains');
    expect(collectionMocks.getDomains).toHaveBeenCalledWith({ enrichServices: true });
  });
});
