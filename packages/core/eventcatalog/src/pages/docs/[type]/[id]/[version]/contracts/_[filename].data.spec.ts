import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Page, getContextMenu } from './_[filename].data';

const mocks = vi.hoisted(() => ({
  isSSR: vi.fn(() => false),
  raw: {} as Record<string, any[]>,
  hydrated: {} as Record<string, any[]>,
}));

vi.mock('@utils/feature', () => ({ isSSR: mocks.isSSR }));
vi.mock('@utils/url-builder', () => ({ buildUrl: (path: string) => path }));
vi.mock('astro:content', () => ({ getCollection: async (type: string) => mocks.raw[type] ?? [] }));
vi.mock('@utils/page-loaders/page-data-loader', () => ({
  pageDataLoader: new Proxy({}, { get: (_target, type: string) => async () => mocks.hydrated[type] ?? [] }),
}));

const entry = (collection: string, id: string, data: Record<string, unknown> = {}) => ({
  collection,
  filePath: `${collection}/${id}/index.mdx`,
  data: { id, name: id, version: '1.0.0', latestVersion: '1.0.0', ...data },
});

const contract = { path: './contracts/orders.pact.json', name: 'Orders pact' };

describe('Consumer contract pages', () => {
  beforeEach(() => {
    mocks.isSSR.mockReturnValue(false);
    // Hydration replaces `receives` pointers with messages, so the contract only exists on the raw entry
    mocks.hydrated = {
      services: [entry('services', 'ShippingService'), entry('services', 'BillingService')],
      events: [
        entry('events', 'OrderPaid', {
          name: 'Order Paid',
          producers: [entry('services', 'PaymentService', { name: 'Payment Service' }), entry('data-products', 'Sales')],
        }),
      ],
    };
    mocks.raw = {
      services: [
        entry('services', 'ShippingService', {
          receives: [
            { id: 'OrderPaid', version: '1.0.0', contract },
            { id: 'OrderArchived', version: '1.0.0', contract },
          ],
        }),
        entry('services', 'BillingService', { receives: [{ id: 'OrderPaid', version: '1.0.0' }] }),
      ],
    };
  });

  it('builds one page for each contract of each consumer, and none for consumers without a contract', async () => {
    const paths = await Page.getStaticPaths();

    expect(paths.map(({ params }) => params).filter(({ type }) => type === 'services')).toEqual([
      { type: 'services', id: 'ShippingService', version: '1.0.0', filename: 'orders-pact' },
    ]);
  });

  it('builds a page under each message for each consumer contract it has, named after the consumer', async () => {
    const paths = await Page.getStaticPaths();

    expect(paths.map(({ params }) => params).filter(({ type }) => type === 'events')).toEqual([
      { type: 'events', id: 'OrderPaid', version: '1.0.0', filename: 'ShippingService' },
    ]);
  });

  it('gives the page under a message that message only, the consumer and where the contract file is', async () => {
    const paths = await Page.getStaticPaths();
    const { props } = paths.find(({ params }) => params.type === 'events')!;

    expect(props.data.id).toBe('OrderPaid');
    expect(props.contractMessages.map((message: any) => message.id)).toEqual(['OrderPaid']);
    expect(props.contractConsumer).toMatchObject({ collection: 'services', id: 'ShippingService', version: '1.0.0' });
    expect(props.contractOwner).toEqual({ filePath: 'services/ShippingService/index.mdx' });
    expect(props.contract.path).toBe('./contracts/orders.pact.json');
  });

  it('finds a consumer contract of a message from the page URL on a server', async () => {
    mocks.isSSR.mockReturnValue(true);

    const data = await Page.getData({
      params: { type: 'events', id: 'OrderPaid', version: '1.0.0', filename: 'ShippingService' },
      props: {},
    } as any);

    expect(data.contractConsumer.id).toBe('ShippingService');
  });

  it('gives the page the messages its contract covers, with the services that produce them, including a message that is not documented in the catalog', async () => {
    const [{ props }] = await Page.getStaticPaths();

    expect(props.contractMessages).toEqual([
      {
        id: 'OrderPaid',
        version: '1.0.0',
        name: 'Order Paid',
        collection: 'events',
        producers: [
          {
            id: 'PaymentService',
            version: '1.0.0',
            name: 'Payment Service',
            collection: 'services',
            contextMenu: expect.arrayContaining([{ label: 'Read documentation', href: '/docs/services/PaymentService/1.0.0' }]),
          },
        ],
        contextMenu: expect.arrayContaining([{ label: 'Read documentation', href: '/docs/events/OrderPaid/1.0.0' }]),
      },
      { id: 'OrderArchived', version: '1.0.0', name: 'OrderArchived', producers: [], contextMenu: [] },
    ]);
  });

  it('finds the contract of a consumer from the page URL on a server', async () => {
    mocks.isSSR.mockReturnValue(true);

    const data = await Page.getData({
      params: { type: 'services', id: 'ShippingService', version: '1.0.0', filename: 'orders-pact' },
      props: {},
    } as any);

    expect(data.contract).toMatchObject({ path: './contracts/orders.pact.json', name: 'Orders pact' });
    expect(data.data.id).toBe('ShippingService');
  });

  it('gives a node the right-click menu its node has in the visualiser, with the specifications of a service', async () => {
    const menu = await getContextMenu({
      collection: 'services',
      data: { id: 'ShippingService', version: '1.0.0', specifications: [{ type: 'openapi', path: 'openapi.yml' }] },
    });

    expect(menu.map((item) => item.label)).toEqual(['Read documentation', 'Focus node', 'View OpenAPI spec', 'Read changelog']);
  });

  it('says the latest version of a message has no page for a contract whose consumer is pinned to an older version', async () => {
    // ShippingService receives OrderPaid 1.0.0 only: OrderPaid 2.0.0 has no contract from it
    mocks.hydrated.events = [
      entry('events', 'OrderPaid', { latestVersion: '2.0.0' }),
      { ...entry('events', 'OrderPaid', { version: '2.0.0', latestVersion: '2.0.0' }) },
    ];

    const paths = await Page.getStaticPaths();
    const eventPaths = paths.filter(({ params }) => params.type === 'events');

    expect(eventPaths.map(({ params }) => params.version)).toEqual(['1.0.0']);
    expect(eventPaths[0].props.latestVersionHasContract).toBe(false);
  });

  it('says the latest version has the same page when the page is for the latest version', async () => {
    const paths = await Page.getStaticPaths();

    expect(paths.map(({ props }) => props.latestVersionHasContract)).toEqual([true, true]);
  });

  it('returns not found for a contract the consumer does not have', async () => {
    const data = await Page.getData({
      params: { type: 'services', id: 'ShippingService', version: '1.0.0', filename: 'unknown' },
      props: {},
    } as any);

    expect(data).toBeUndefined();
  });

  it('returns not found for a resource type that has no consumer contracts', async () => {
    const data = await Page.getData({
      params: { type: 'flows', id: 'OrderPaid', version: '1.0.0', filename: 'orders-pact' },
      props: {},
    } as any);

    expect(data).toBeUndefined();
  });
});
