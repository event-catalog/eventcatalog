import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Page, ServicePage } from './_index.data';

const mocks = vi.hoisted(() => ({
  getOwnersWithResources: vi.fn(),
  findOwnerWithResources: vi.fn(),
}));

vi.mock('@utils/feature', () => ({ isSSR: () => false }));
vi.mock('@utils/collections/resource-owners', () => ({
  RESOURCE_OWNER_COLLECTIONS: ['domains', 'systems', 'services', 'flows', 'channels', 'events', 'commands', 'queries'],
  createResourcesCatalog: () => ({}),
  getOwnersWithResources: mocks.getOwnersWithResources,
  findOwnerWithResources: mocks.findOwnerWithResources,
}));

const owner = (collection: string, id: string) => ({ collection, data: { id, version: '1.0.0' } });

describe('Resources routes', () => {
  beforeEach(() => {
    mocks.getOwnersWithResources.mockReset().mockImplementation(async (type: string) => [owner(type, `${type}-owner`)]);
    mocks.findOwnerWithResources.mockReset();
  });

  // /docs/services/[id]/[docType]/[docId] would otherwise catch /docs/services/{id}/{version}/resources,
  // so services get their own route and the generic route leaves them out.
  it('gives every owner type but services a path on the generic route', async () => {
    const paths = await Page.getStaticPaths();

    expect(paths.map(({ params }) => params.type)).toEqual(['domains', 'systems', 'flows', 'channels', 'events', 'commands', 'queries']);
    expect(paths[0]).toEqual({ params: { type: 'domains', id: 'domains-owner', version: '1.0.0' }, props: owner('domains', 'domains-owner') });
  });

  it('gives services their own route without a type param', async () => {
    const paths = await ServicePage.getStaticPaths();

    expect(paths).toEqual([{ params: { id: 'services-owner', version: '1.0.0' }, props: owner('services', 'services-owner') }]);
  });

  it('returns not found for types without a Resources page on a server request', async () => {
    await expect(Page.getData({ params: { type: 'entities', id: 'Order', version: '1.0.0' }, props: {} } as any)).rejects.toMatchObject({
      status: 404,
    });
    expect(mocks.findOwnerWithResources).not.toHaveBeenCalled();
  });
});
