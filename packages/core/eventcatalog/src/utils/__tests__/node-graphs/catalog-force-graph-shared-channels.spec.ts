import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ rawServices: [] as any[] }));
const mocks = vi.hoisted(() => ({
  getDomains: vi.fn(),
  getServices: vi.fn(),
  getAgents: vi.fn(),
  getEvents: vi.fn(),
  getCommands: vi.fn(),
  getQueries: vi.fn(),
  getFlows: vi.fn(),
  getEntities: vi.fn(),
  getContainers: vi.fn(),
  getDataProducts: vi.fn(),
  getSystems: vi.fn(),
  getTeams: vi.fn(),
}));

vi.mock('astro:content', () => ({
  getCollection: vi.fn(async (collection: string) => (collection === 'services' ? state.rawServices : [])),
}));
vi.mock('@utils/collections/domains', () => ({ getDomains: mocks.getDomains }));
vi.mock('@utils/collections/services', () => ({ getServices: mocks.getServices }));
vi.mock('@utils/collections/agents', () => ({ getAgents: mocks.getAgents }));
vi.mock('@utils/collections/events', () => ({ getEvents: mocks.getEvents }));
vi.mock('@utils/collections/commands', () => ({ getCommands: mocks.getCommands }));
vi.mock('@utils/collections/queries', () => ({ getQueries: mocks.getQueries }));
vi.mock('@utils/collections/flows', () => ({ getFlows: mocks.getFlows }));
vi.mock('@utils/collections/entities', () => ({ getEntities: mocks.getEntities }));
vi.mock('@utils/collections/containers', () => ({ getContainers: mocks.getContainers }));
vi.mock('@utils/collections/data-products', () => ({ getDataProducts: mocks.getDataProducts }));
vi.mock('@utils/collections/systems', () => ({ getSystems: mocks.getSystems }));
vi.mock('@utils/collections/teams', () => ({ getTeams: mocks.getTeams }));
vi.mock('@utils/url-builder', () => ({ buildUrl: (path: string) => path }));

import { getCatalogForceGraph } from '../../node-graphs/catalog-force-graph';

const entry = (collection: string, id: string, data: Record<string, unknown> = {}) => ({
  collection,
  data: { id, name: id, version: '1.0.0', latestVersion: '1.0.0', ...data },
});

const pointer = (id: string, channels: string[], direction: 'to' | 'from') => ({
  id,
  [direction]: channels.map((channelId) => ({ id: channelId })),
});

describe('catalog force graph shared-channel message relationships', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const mock of Object.values(mocks)) mock.mockResolvedValue([]);
    state.rawServices = [];
  });

  it('connects a producer message to a distinct consumer message through their shared channel', async () => {
    const orderCreate = entry('events', '3c1868dc37d6', { name: 'OrderCreate' });
    const orderHistoryCreate = entry('events', '389c6f21c054', { name: 'OrderHistoryCreate' });

    mocks.getEvents.mockResolvedValue([orderCreate, orderHistoryCreate]);
    mocks.getServices.mockResolvedValue([
      entry('services', 'sales/order', { sends: [orderCreate] }),
      entry('services', 'finance/payment', { receives: [orderCreate] }),
      entry('services', 'customer/orderhistory', { receives: [orderHistoryCreate] }),
    ]);
    state.rawServices = [
      entry('services', 'sales/order', { sends: [pointer('3c1868dc37d6', ['sales.order.order-create'], 'to')] }),
      entry('services', 'finance/payment', { receives: [pointer('3c1868dc37d6', ['sales.order.order-create'], 'from')] }),
      entry('services', 'customer/orderhistory', {
        receives: [pointer('389c6f21c054', ['sales.order.order-create'], 'from')],
      }),
    ];

    const { links } = await getCatalogForceGraph();

    expect(links).toEqual(
      expect.arrayContaining([
        { source: 'services/sales/order', target: 'events/3c1868dc37d6', label: 'publishes' },
        { source: 'events/3c1868dc37d6', target: 'services/finance/payment', label: 'subscribed by' },
        { source: 'events/389c6f21c054', target: 'services/customer/orderhistory', label: 'subscribed by' },
        {
          source: 'events/3c1868dc37d6',
          target: 'events/389c6f21c054',
          label: 'via sales.order.order-create',
        },
      ])
    );
  });
});
