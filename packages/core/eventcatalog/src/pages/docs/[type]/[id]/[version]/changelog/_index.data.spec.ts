import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getLatestServiceChangelogPaths, Page, ServicePage } from './_index.data';

const COLLECTIONS = ['agents', 'events', 'commands', 'queries', 'services', 'domains', 'systems', 'flows', 'containers'];

const mocks = vi.hoisted(() => ({
  isSSR: vi.fn(),
  isChangelogEnabled: vi.fn(),
  loaders: {} as Record<string, ReturnType<typeof vi.fn>>,
  getServices: vi.fn(),
}));

vi.mock('@utils/feature', () => ({
  isSSR: () => mocks.isSSR(),
  isChangelogEnabled: () => mocks.isChangelogEnabled(),
}));
vi.mock('@utils/changelog-resource-badge', () => ({
  changelogResourceCollections: ['agents', 'events', 'commands', 'queries', 'services', 'domains', 'systems', 'flows', 'containers'],
}));
vi.mock('@utils/collections/services', () => ({
  getServices: () => mocks.getServices(),
}));
vi.mock('@utils/page-loaders/page-data-loader', () => ({
  pageDataLoader: new Proxy({}, { get: (_target, type: string) => mocks.loaders[type] }),
}));

const item = (id: string, version: string) => ({ collection: 'any', data: { id, version } });

describe('Changelog routes', () => {
  beforeEach(() => {
    mocks.isSSR.mockReset().mockReturnValue(false);
    mocks.isChangelogEnabled.mockReset().mockReturnValue(true);
    mocks.loaders = Object.fromEntries(COLLECTIONS.map((type) => [type, vi.fn().mockResolvedValue([item(`${type}-1`, '1.0.0')])]));
  });

  it('gives every type but services a path on the generic route', async () => {
    const paths = await Page.getStaticPaths();

    expect(paths.map(({ params }) => params.type)).toEqual(COLLECTIONS.filter((type) => type !== 'services'));
    expect(paths[0].params).toEqual({ type: 'agents', id: 'agents-1', version: '1.0.0' });
    expect(mocks.loaders.services).not.toHaveBeenCalled();
  });

  it('gives one path per service id and version on the service route', async () => {
    const orders1 = item('Orders', '1.0.0');
    mocks.loaders.services.mockResolvedValue([orders1, item('Orders', '2.0.0'), item('Billing', '1.0.0')]);

    const paths = await ServicePage.getStaticPaths();

    expect(paths.map(({ params }) => params)).toEqual([
      { id: 'Orders', version: '1.0.0' },
      { id: 'Orders', version: '2.0.0' },
      { id: 'Billing', version: '1.0.0' },
    ]);
    expect(paths[0].props).toMatchObject({ type: 'services', ...orders1 });
  });

  it('has no static paths on a server', async () => {
    mocks.isSSR.mockReturnValue(true);

    expect(await Page.getStaticPaths()).toEqual([]);
    expect(await ServicePage.getStaticPaths()).toEqual([]);
  });

  it('has no static paths when the changelog is disabled', async () => {
    mocks.isChangelogEnabled.mockReturnValue(false);

    expect(await Page.getStaticPaths()).toEqual([]);
    expect(await ServicePage.getStaticPaths()).toEqual([]);
  });

  it('forces the services type when fetching on the service route', async () => {
    mocks.loaders.services.mockResolvedValue([item('Orders', '1.0.0')]);

    const data = await ServicePage.getData({ params: { id: 'Orders', version: '1.0.0', type: 'events' }, props: {} } as any);

    expect(data).toMatchObject({ type: 'services', data: { id: 'Orders', version: '1.0.0' } });
    expect(mocks.loaders.events).not.toHaveBeenCalled();
  });

  it('returns nothing for an unknown version or a disabled changelog', async () => {
    mocks.loaders.services.mockResolvedValue([item('Orders', '1.0.0')]);

    await expect(ServicePage.getData({ params: { id: 'Orders', version: '9.9.9' }, props: {} } as any)).resolves.toBeUndefined();

    mocks.isChangelogEnabled.mockReturnValue(false);
    await expect(ServicePage.getData({ params: { id: 'Orders', version: '1.0.0' }, props: {} } as any)).resolves.toBeUndefined();
  });

  it('gives the version-less service changelog alias a path for the latest version of each service', async () => {
    mocks.loaders.services.mockResolvedValue([item('Orders', '1.0.0'), item('Orders', '2.0.0'), item('Billing', '1.0.0')]);
    mocks.getServices.mockResolvedValue([item('Orders', '2.0.0'), item('Billing', '1.0.0')]);

    const paths = await getLatestServiceChangelogPaths();

    expect(paths.map(({ params, props }) => ({ params, redirectVersion: props?.redirectVersion }))).toEqual([
      { params: { id: 'Orders' }, redirectVersion: '2.0.0' },
      { params: { id: 'Billing' }, redirectVersion: '1.0.0' },
    ]);
  });
});
