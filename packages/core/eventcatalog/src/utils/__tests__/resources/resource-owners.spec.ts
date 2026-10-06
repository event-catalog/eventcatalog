import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  findOwnerWithResources,
  getOwnersWithResources,
  getResourcesPageKeys,
  loadResourceOwners,
} from '@utils/collections/resource-owners';

const collectionMocks = vi.hoisted(() => ({
  getDomains: vi.fn(() => Promise.resolve([])),
  getSystems: vi.fn(() => Promise.resolve([])),
  getServices: vi.fn(() => Promise.resolve([])),
  getAdrs: vi.fn(() => Promise.resolve([] as any[])),
  getFlows: vi.fn(() => Promise.resolve([] as any[])),
  getChannels: vi.fn(() => Promise.resolve([] as any[])),
  getEvents: vi.fn(() => Promise.resolve([] as any[])),
  getCommands: vi.fn(() => Promise.resolve([] as any[])),
  getQueries: vi.fn(() => Promise.resolve([] as any[])),
  getCollection: vi.fn((_collection: string) => Promise.resolve([] as any[])),
  // Stand-in that says only OrderCreated appears in the flows, so the wiring can be checked.
  getMessageConnections: vi.fn((message: any, catalog: any) => ({
    channels: [],
    flows: message.data.id === 'OrderCreated' ? catalog.flows : [],
    triggers: [],
    triggeredBy: [],
  })),
}));

vi.mock('@utils/feature', () => ({ isSSR: () => false }));
vi.mock('astro:content', () => ({ getCollection: collectionMocks.getCollection }));
vi.mock('@utils/collections/events', () => ({ getEvents: collectionMocks.getEvents }));
vi.mock('@utils/collections/commands', () => ({ getCommands: collectionMocks.getCommands }));
vi.mock('@utils/collections/queries', () => ({ getQueries: collectionMocks.getQueries }));
// Stand-in that says only OrderCreated appears in the flows, so the wiring can be checked.
vi.mock('@utils/collections/message-connections', () => ({ getMessageConnections: collectionMocks.getMessageConnections }));
// Stand-in that treats every raw service and agent as a producer of the channel, so the wiring can be checked.
vi.mock('@utils/collections/channels', () => ({
  getChannels: collectionMocks.getChannels,
  getChannelConnections: (_channel: any, catalog: any) => ({ producers: catalog.endpoints, consumers: [], messages: [] }),
}));
vi.mock('@utils/collections/domains', () => ({ getDomains: collectionMocks.getDomains }));
vi.mock('@utils/collections/systems', () => ({ getSystems: collectionMocks.getSystems }));
vi.mock('@utils/collections/services', () => ({ getServices: collectionMocks.getServices }));
// getAdrsForResource and getFlowsWithServiceStep have their own tests; these stand-ins only
// match by id so the loader's wiring can be checked here.
vi.mock('@utils/collections/adrs', () => ({
  getAdrs: collectionMocks.getAdrs,
  getAdrsForResource: (owner: any, adrs: any[]) =>
    adrs.filter((adr) => adr.data.appliesTo.some((pointer: any) => pointer.id === owner.data.id)),
}));
vi.mock('@utils/collections/flows', () => ({
  getFlows: collectionMocks.getFlows,
  getFlowStepResources: (flow: any) => flow.data.steps.map((step: any) => step.service).filter(Boolean),
  getFlowsWithServiceStep: (service: any, flows: any[]) =>
    flows.filter((flow) => flow.data.steps.some((step: any) => step.service?.id === service.data.id)),
}));

describe('Resources page owners', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads domains without flattening child-subdomain services and agents', async () => {
    await loadResourceOwners('domains');

    expect(collectionMocks.getDomains).toHaveBeenCalledWith({ includeServicesInSubdomains: false });
  });

  it('keeps the system loader unchanged', async () => {
    await loadResourceOwners('systems');

    expect(collectionMocks.getSystems).toHaveBeenCalledWith();
  });

  it('loads services for service Resources pages', async () => {
    await loadResourceOwners('services');

    expect(collectionMocks.getServices).toHaveBeenCalled();
  });

  describe('owners with a Resources page', () => {
    const orderService = {
      collection: 'services',
      data: {
        id: 'OrderService',
        version: '1.0.0',
        sends: [{ collection: 'events', data: { id: 'OrderPlaced', version: '1.0.0' } }],
      },
    };
    const emptyService = { collection: 'services', data: { id: 'EmptyService', version: '1.0.0' } };
    const ordering = { collection: 'domains', data: { id: 'Ordering', version: '1.0.0', services: [orderService] } };

    beforeEach(() => {
      collectionMocks.getAdrs.mockResolvedValue([]);
      collectionMocks.getFlows.mockResolvedValue([]);
      collectionMocks.getServices.mockResolvedValue([orderService, emptyService] as any);
      collectionMocks.getDomains.mockResolvedValue([ordering] as any);
    });

    it('attaches the decision records that apply to each owner', async () => {
      const useOutbox = {
        collection: 'adrs',
        data: { id: 'UseOutbox', version: '1.0.0', appliesTo: [{ type: 'domain', id: 'Ordering' }] },
      };
      collectionMocks.getAdrs.mockResolvedValue([useOutbox]);

      const [ordering] = await getOwnersWithResources('domains');

      expect(ordering.adrs).toEqual([useOutbox]);
    });

    it('gives a service that only appears in flow steps a Resources page', async () => {
      const placeOrder = {
        collection: 'flows',
        data: { id: 'PlaceOrder', version: '1.0.0', steps: [{ id: 'empty', title: 'Empty', service: { id: 'EmptyService' } }] },
      };
      collectionMocks.getFlows.mockResolvedValue([placeOrder]);

      const services = await getOwnersWithResources('services');

      expect(services.find((service) => service.data.id === 'EmptyService')?.stepFlows).toEqual([placeOrder]);
    });
  });

  it('gives a flow whose steps point at resources a Resources page, with those resources attached', async () => {
    const checkoutApi = { collection: 'services', data: { id: 'CheckoutApi', version: '1.0.0' } };
    const placeOrder = {
      collection: 'flows',
      data: { id: 'PlaceOrder', version: '1.0.0', steps: [{ id: 1, service: checkoutApi }] },
    };
    const emptyFlow = { collection: 'flows', data: { id: 'EmptyFlow', version: '1.0.0', steps: [{ id: 1, title: 'Box' }] } };
    collectionMocks.getAdrs.mockResolvedValue([]);
    collectionMocks.getFlows.mockResolvedValue([placeOrder, emptyFlow]);
    collectionMocks.getServices.mockResolvedValue([checkoutApi] as any);
    collectionMocks.getDomains.mockResolvedValue([]);
    collectionMocks.getSystems.mockResolvedValue([]);

    const flows = await getOwnersWithResources('flows');

    expect(flows.map((flow) => flow.data.id)).toEqual(['PlaceOrder']);
    expect(flows[0].stepResources).toEqual([checkoutApi]);
  });

  it('gives a channel that services use a Resources page, using the current raw services and agents', async () => {
    const orderEvents = { collection: 'channels', data: { id: 'order-events', version: '1.0.0' } };
    const orderService = {
      collection: 'services',
      data: { id: 'OrderService', version: '1.0.0' },
      filePath: 'services/OrderService/index.mdx',
    };
    const oldOrderService = {
      collection: 'services',
      data: { id: 'OrderService', version: '0.1.0' },
      filePath: 'services/OrderService/versioned/0.1.0/index.mdx',
    };
    collectionMocks.getAdrs.mockResolvedValue([]);
    collectionMocks.getDomains.mockResolvedValue([]);
    collectionMocks.getSystems.mockResolvedValue([]);
    collectionMocks.getFlows.mockResolvedValue([]);
    collectionMocks.getChannels.mockResolvedValue([orderEvents]);
    collectionMocks.getCollection.mockImplementation(async (collection: string) =>
      collection === 'services' ? [orderService, oldOrderService] : []
    );

    const channels = await getOwnersWithResources('channels');

    expect(channels.map((channel) => channel.data.id)).toEqual(['order-events']);
    expect(channels[0].channelProducers).toEqual([orderService]);
  });

  it('gives messages a Resources page, attaching what they connect to', async () => {
    const orderService = { collection: 'services', data: { id: 'OrderService', version: '1.0.0' } };
    const orderCreated = {
      collection: 'events',
      data: { id: 'OrderCreated', version: '1.0.0', producers: [orderService], consumers: [] },
    };
    const unused = { collection: 'events', data: { id: 'Unused', version: '1.0.0', producers: [], consumers: [] } };
    // Unused has no producers, consumers or connections, so it gets no Resources page.
    const placeOrder = { collection: 'flows', data: { id: 'PlaceOrder', version: '1.0.0', steps: [] } };
    collectionMocks.getAdrs.mockResolvedValue([]);
    collectionMocks.getDomains.mockResolvedValue([]);
    collectionMocks.getSystems.mockResolvedValue([]);
    collectionMocks.getChannels.mockResolvedValue([]);
    collectionMocks.getFlows.mockImplementation(async (options?: any) => (options?.getAllVersions === false ? [placeOrder] : []));
    collectionMocks.getEvents.mockResolvedValue([orderCreated, unused]);
    collectionMocks.getCollection.mockResolvedValue([]);

    const events = await getOwnersWithResources('events');

    expect(events.map((event) => event.data.id)).toEqual(['OrderCreated']);
    expect(events[0].messageFlows).toEqual([placeOrder]);
  });

  describe('a single owner, as a server request needs', () => {
    const orderService = { collection: 'services', data: { id: 'OrderService', version: '1.0.0' } };
    const orderCreated = {
      collection: 'events',
      data: { id: 'OrderCreated', version: '1.0.0', producers: [orderService], consumers: [] },
    };
    const unused = { collection: 'events', data: { id: 'Unused', version: '1.0.0', producers: [], consumers: [] } };

    beforeEach(() => {
      collectionMocks.getAdrs.mockResolvedValue([]);
      collectionMocks.getFlows.mockResolvedValue([]);
      collectionMocks.getCollection.mockResolvedValue([]);
      collectionMocks.getEvents.mockResolvedValue([orderCreated, unused]);
    });

    it('works out related resources for the requested owner only', async () => {
      const owner = await findOwnerWithResources('events', 'OrderCreated', '1.0.0');

      expect(owner?.data.id).toBe('OrderCreated');
      expect(collectionMocks.getMessageConnections).toHaveBeenCalledTimes(1);
    });

    it('returns null for an owner without a Resources page or that does not exist', async () => {
      await expect(findOwnerWithResources('events', 'Unused', '1.0.0')).resolves.toBeNull();
      await expect(findOwnerWithResources('events', 'Missing', '1.0.0')).resolves.toBeNull();
    });
  });

  it('lists the key of every owner with a Resources page, reading each part of the catalog once', async () => {
    const orderService = {
      collection: 'services',
      data: {
        id: 'OrderService',
        version: '1.0.0',
        sends: [{ collection: 'events', data: { id: 'OrderCreated', version: '1.0.0' } }],
      },
    };
    const orderCreated = {
      collection: 'events',
      data: { id: 'OrderCreated', version: '1.0.0', producers: [orderService], consumers: [] },
    };
    collectionMocks.getAdrs.mockResolvedValue([]);
    collectionMocks.getDomains.mockResolvedValue([]);
    collectionMocks.getSystems.mockResolvedValue([]);
    collectionMocks.getChannels.mockResolvedValue([]);
    collectionMocks.getFlows.mockResolvedValue([]);
    collectionMocks.getServices.mockResolvedValue([orderService] as any);
    collectionMocks.getEvents.mockResolvedValue([orderCreated]);
    collectionMocks.getCommands.mockResolvedValue([]);
    collectionMocks.getQueries.mockResolvedValue([]);
    collectionMocks.getCollection.mockResolvedValue([]);

    const keys = await getResourcesPageKeys();

    expect([...keys]).toEqual(['services:OrderService:1.0.0', 'events:OrderCreated:1.0.0']);
    expect(collectionMocks.getAdrs).toHaveBeenCalledTimes(1);
  });
});
