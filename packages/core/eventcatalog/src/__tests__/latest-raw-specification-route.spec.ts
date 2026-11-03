import { describe, expect, it, vi } from 'vitest';

vi.mock('@config', () => ({ default: {} }));
vi.mock('@utils/collections/services', () => ({
  getServices: vi.fn().mockResolvedValue([{ data: { id: 'Orders', version: '2.0.0' } }]),
}));
vi.mock('@utils/raw-specification', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@utils/raw-specification')>()),
  // Every file exists, and serving one echoes the version it was read from
  toRawSpecificationPaths: (paths: any[]) =>
    paths.map(({ params, props }) => ({ params: { ...params, file: props.filename }, props })),
  getRawSpecificationResponse: async (_type: string, pageData: any) => new Response(`version ${pageData.data.version}`),
}));

const { createLatestServiceRawSpecificationRoute } = await import('../pages/docs/services/_latest-raw-specification-route');

const pageDataFor = (version: string) => ({
  collection: 'services',
  data: { id: 'Orders', version },
  path: 'orders.yaml',
  filename: 'orders.yaml',
  filenameWithoutExtension: 'orders',
});

const Page = {
  getStaticPaths: vi.fn().mockResolvedValue([
    { params: { type: 'services', id: 'Orders', version: '2.0.0', filename: 'orders' }, props: pageDataFor('2.0.0') },
    { params: { type: 'services', id: 'Orders', version: '1.0.0', filename: 'orders' }, props: pageDataFor('1.0.0') },
  ]),
  getData: vi.fn(async ({ params }: { params: Record<string, string | undefined> }) => pageDataFor(params.version ?? '')),
};

describe('latest service raw specification route', () => {
  it("only gives the latest version a path, without the version and with the specification's file name", async () => {
    const { getStaticPaths } = createLatestServiceRawSpecificationRoute('asyncapi', Page);

    expect(await getStaticPaths()).toEqual([
      {
        params: { id: 'Orders', filename: 'orders', file: 'orders.yaml' },
        props: { ...pageDataFor('2.0.0'), redirectVersion: '2.0.0' },
      },
    ]);
  });

  it("serves the latest version's file on a server, where there are no props", async () => {
    const { GET } = createLatestServiceRawSpecificationRoute('asyncapi', Page);

    const response = await GET({ params: { id: 'Orders', filename: 'orders', file: 'orders.yaml' }, props: {} } as any);

    expect(Page.getData).toHaveBeenCalledWith({
      params: { type: 'services', id: 'Orders', version: '2.0.0', filename: 'orders' },
      props: {},
    });
    expect(await response.text()).toBe('version 2.0.0');
  });

  it('is a 404 for a service that does not exist', async () => {
    const { GET } = createLatestServiceRawSpecificationRoute('asyncapi', Page);

    const response = await GET({ params: { id: 'Missing', filename: 'orders', file: 'orders.yaml' }, props: {} } as any);

    expect(response.status).toBe(404);
  });
});
