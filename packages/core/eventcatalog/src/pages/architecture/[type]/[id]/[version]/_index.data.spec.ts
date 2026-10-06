import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Page } from './_index.data';

const mocks = vi.hoisted(() => ({
  isSSR: vi.fn(() => false),
  getDomains: vi.fn(),
  getServices: vi.fn(),
  getSystems: vi.fn(),
  getOwnersWithResources: vi.fn(),
}));

const loaders: Record<string, () => Promise<unknown>> = {
  domains: () => mocks.getDomains(),
  services: () => mocks.getServices(),
  systems: () => mocks.getSystems(),
};

vi.mock('@utils/feature', () => ({ isSSR: mocks.isSSR }));
vi.mock('@utils/url-builder', () => ({ buildUrl: (path: string) => path }));
vi.mock('@utils/collections/resource-owners', () => ({
  createResourcesCatalog: () => ({}),
  loadResourceOwners: (type: string) => loaders[type](),
  getOwnersWithResources: mocks.getOwnersWithResources,
}));

const entry = (collection: string, id: string, version = '1.0.0') => ({ collection, data: { id, name: id, version } });

const ordering = entry('domains', 'ordering');
const orderService = entry('services', 'order-service');
const orderServiceV0 = entry('services', 'order-service', '0.1.0');
const cartSystem = entry('systems', 'cart-system');

describe('architecture page redirects', () => {
  beforeEach(() => {
    mocks.isSSR.mockReturnValue(false);
    mocks.getDomains.mockReset().mockResolvedValue([ordering]);
    mocks.getServices.mockReset().mockResolvedValue([orderService, orderServiceV0]);
    mocks.getSystems.mockReset().mockResolvedValue([cartSystem]);
    // Only the latest order service and the cart system have a Resources page.
    mocks.getOwnersWithResources.mockReset().mockImplementation(async (type: string) => {
      if (type === 'services') return [orderService];
      if (type === 'systems') return [cartSystem];
      return [];
    });
  });

  it('redirects every architecture page to its Resources page, or the docs page when it has no Resources page', async () => {
    const paths = await Page.getStaticPaths();

    expect(
      paths.map(({ params, props }) => [`/architecture/${params.type}/${params.id}/${params.version}`, props.redirectPath])
    ).toEqual([
      ['/architecture/services/order-service/1.0.0', '/docs/services/order-service/1.0.0/resources'],
      ['/architecture/services/order-service/0.1.0', '/docs/services/order-service/0.1.0'],
      ['/architecture/domains/ordering/1.0.0', '/docs/domains/ordering/1.0.0'],
      ['/architecture/systems/cart-system/1.0.0', '/docs/systems/cart-system/1.0.0/resources'],
    ]);
  });

  it('works out the redirect when the page is requested on a server', async () => {
    mocks.isSSR.mockReturnValue(true);

    await expect(
      Page.getData({ params: { type: 'systems', id: 'cart-system', version: '1.0.0' }, props: {} } as any)
    ).resolves.toMatchObject({ redirectPath: '/docs/systems/cart-system/1.0.0/resources' });
  });

  it('returns not found for resources without an architecture page', async () => {
    mocks.isSSR.mockReturnValue(true);

    await expect(
      Page.getData({ params: { type: 'events', id: 'order-created', version: '1.0.0' }, props: {} } as any)
    ).rejects.toMatchObject({
      status: 404,
    });
  });
});
