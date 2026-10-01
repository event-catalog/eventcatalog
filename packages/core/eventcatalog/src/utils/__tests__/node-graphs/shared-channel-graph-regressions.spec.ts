import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  collections: {} as Record<string, any[]>,
  channels: [] as any[],
  events: [] as any[],
}));

vi.mock('astro:content', () => ({
  getCollection: vi.fn(async (collection: string) => state.collections[collection] ?? []),
}));

vi.mock('@utils/collections/channels', () => ({
  getChannels: vi.fn(async () => state.channels),
  getChannelChain: vi.fn((source: any, target: any) =>
    source?.data?.id === target?.data?.id && source?.data?.version === target?.data?.version ? [source] : []
  ),
  isChannelsConnected: vi.fn(
    (source: any, target: any) => source?.data?.id === target?.data?.id && source?.data?.version === target?.data?.version
  ),
}));

vi.mock('@utils/collections/events', () => ({
  getEvents: vi.fn(async () => state.events),
}));

import { getNodesAndEdges as getChannelNodesAndEdges } from '../../node-graphs/channel-node-graph';
import { getNodesAndEdgesForEvents } from '../../node-graphs/message-node-graph';
import { getNodesAndEdges as getServiceNodesAndEdges } from '../../node-graphs/services-node-graph';
import { getDistinctMessagePairs } from '../../node-graphs/utils/shared-channel-messages';

const entry = (collection: string, id: string, data: Record<string, unknown> = {}): any => ({
  collection,
  data: { id, name: id, version: '1.0.0', latestVersion: '1.0.0', ...data },
});

const pointer = (id: string, channelId: string, direction: 'to' | 'from') => ({
  id,
  version: '1.0.0',
  [direction]: [{ id: channelId, version: '1.0.0' }],
});

const edgePairs = (edges: any[]) => edges.map((edge) => `${edge.source} -> ${edge.target}`);

const setupSharedChannelCatalog = () => {
  const channel = entry('channels', 'sales.order.order-create', { protocol: 'kafka' });
  const orderCreate = entry('events', '3c1868dc37d6', { name: 'OrderCreate' });
  const orderHistoryCreate = entry('events', '389c6f21c054', { name: 'OrderHistoryCreate' });

  const salesOrder = entry('services', 'sales/order', {
    sends: [pointer('3c1868dc37d6', 'sales.order.order-create', 'to')],
  });
  const financePayment = entry('services', 'finance/payment', {
    receives: [pointer('3c1868dc37d6', 'sales.order.order-create', 'from')],
  });
  const customerOrderHistory = entry('services', 'customer/orderhistory', {
    receives: [pointer('389c6f21c054', 'sales.order.order-create', 'from')],
  });

  orderCreate.data.producers = [salesOrder];
  orderCreate.data.consumers = [financePayment];
  orderHistoryCreate.data.producers = [];
  orderHistoryCreate.data.consumers = [customerOrderHistory];

  state.channels = [channel];
  state.events = [orderCreate, orderHistoryCreate];
  state.collections = {
    channels: [channel],
    events: state.events,
    commands: [],
    queries: [],
    services: [salesOrder, financePayment, customerOrderHistory],
    agents: [],
    containers: [],
    domains: [],
  };
};

const setupManyToManySharedChannelCatalog = () => {
  const channel = entry('channels', 'Channel-1', { protocol: 'kafka' });
  const messageA = entry('events', 'A');
  const messageB = entry('events', 'B');
  const messageX = entry('events', 'X');
  const messageY = entry('events', 'Y');
  const messageZ = entry('events', 'Z');

  const producerA = entry('services', 'producer/a', {
    sends: [pointer('A', 'Channel-1', 'to')],
  });
  const producerB = entry('services', 'producer/b', {
    sends: [pointer('B', 'Channel-1', 'to')],
  });
  const consumerX = entry('services', 'consumer/x', {
    receives: [pointer('X', 'Channel-1', 'from')],
  });
  const consumerY = entry('services', 'consumer/y', {
    receives: [pointer('Y', 'Channel-1', 'from')],
  });
  const consumerZ = entry('services', 'consumer/z', {
    receives: [pointer('Z', 'Channel-1', 'from')],
  });

  messageA.data.producers = [producerA];
  messageA.data.consumers = [];
  messageB.data.producers = [producerB];
  messageB.data.consumers = [];
  messageX.data.producers = [];
  messageX.data.consumers = [consumerX];
  messageY.data.producers = [];
  messageY.data.consumers = [consumerY];
  messageZ.data.producers = [];
  messageZ.data.consumers = [consumerZ];

  state.channels = [channel];
  state.events = [messageA, messageB, messageX, messageY, messageZ];
  state.collections = {
    channels: [channel],
    events: state.events,
    commands: [],
    queries: [],
    services: [producerA, producerB, consumerX, consumerY, consumerZ],
    agents: [],
    containers: [],
    domains: [],
  };
};

describe('shared-channel graph regressions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSharedChannelCatalog();
  });

  it('renders distinct consumer messages after the shared channel in a producer service graph', async () => {
    const { edges } = await getServiceNodesAndEdges({ id: 'sales/order', version: '1.0.0', layout: false });
    const renderedEdges = edgePairs(edges);

    expect(renderedEdges).toEqual(
      expect.arrayContaining([
        '3c1868dc37d6-1.0.0 -> sales.order.order-create-1.0.0',
        'sales.order.order-create-1.0.0 -> 389c6f21c054-1.0.0',
        '389c6f21c054-1.0.0 -> customer/orderhistory-1.0.0',
        'sales.order.order-create-1.0.0 -> finance/payment-1.0.0',
      ])
    );
    expect(renderedEdges).not.toContain('389c6f21c054-1.0.0 -> sales.order.order-create-1.0.0');
    expect(renderedEdges).not.toContain('sales.order.order-create-1.0.0 -> customer/orderhistory-1.0.0');
  });

  it('renders the distinct producer message upstream in a consumer service graph', async () => {
    const { edges } = await getServiceNodesAndEdges({ id: 'customer/orderhistory', version: '1.0.0', layout: false });
    const renderedEdges = edgePairs(edges);

    expect(renderedEdges).toEqual(
      expect.arrayContaining([
        'sales/order-1.0.0 -> 3c1868dc37d6-1.0.0',
        '3c1868dc37d6-1.0.0 -> sales.order.order-create-1.0.0',
        'sales.order.order-create-1.0.0 -> 389c6f21c054-1.0.0',
        '389c6f21c054-1.0.0 -> customer/orderhistory-1.0.0',
      ])
    );
    expect(renderedEdges).not.toContain('389c6f21c054-1.0.0 -> sales.order.order-create-1.0.0');
    expect(renderedEdges).not.toContain('sales.order.order-create-1.0.0 -> customer/orderhistory-1.0.0');
  });

  it('renders distinct consumer messages after the focused channel in the channel map', async () => {
    const { edges } = await getChannelNodesAndEdges({
      id: 'sales.order.order-create',
      version: '1.0.0',
      layout: false,
    });
    const renderedEdges = edgePairs(edges);

    expect(renderedEdges).toEqual(
      expect.arrayContaining([
        'sales/order-1.0.0 -> 3c1868dc37d6-1.0.0',
        '3c1868dc37d6-1.0.0 -> sales.order.order-create-1.0.0',
        'sales.order.order-create-1.0.0 -> 389c6f21c054-1.0.0',
        '389c6f21c054-1.0.0 -> customer/orderhistory-1.0.0',
        'sales.order.order-create-1.0.0 -> finance/payment-1.0.0',
      ])
    );
    expect(renderedEdges).not.toContain('389c6f21c054-1.0.0 -> sales.order.order-create-1.0.0');
    expect(renderedEdges).not.toContain('sales.order.order-create-1.0.0 -> customer/orderhistory-1.0.0');
  });

  it('renders the distinct producer message upstream in the consumer message map', async () => {
    const { edges } = await getNodesAndEdgesForEvents({ id: '389c6f21c054', version: '1.0.0' });
    const renderedEdges = edgePairs(edges);

    expect(renderedEdges).toEqual(
      expect.arrayContaining([
        'sales/order-1.0.0 -> 3c1868dc37d6-1.0.0',
        '3c1868dc37d6-1.0.0 -> sales.order.order-create-1.0.0',
        'sales.order.order-create-1.0.0 -> 389c6f21c054-1.0.0',
        '389c6f21c054-1.0.0 -> customer/orderhistory-1.0.0',
      ])
    );
    expect(renderedEdges).not.toContain('389c6f21c054-1.0.0 -> sales.order.order-create-1.0.0');
    expect(renderedEdges).not.toContain('sales.order.order-create-1.0.0 -> customer/orderhistory-1.0.0');
  });
  it('renders the distinct consumer message in the producer message map', async () => {
    const { edges } = await getNodesAndEdgesForEvents({ id: '3c1868dc37d6', version: '1.0.0' });
    const renderedEdges = edgePairs(edges);

    expect(renderedEdges).toEqual(
      expect.arrayContaining([
        '3c1868dc37d6-1.0.0 -> sales.order.order-create-1.0.0',
        'sales.order.order-create-1.0.0 -> 389c6f21c054-1.0.0',
        '389c6f21c054-1.0.0 -> customer/orderhistory-1.0.0',
        'sales.order.order-create-1.0.0 -> finance/payment-1.0.0',
      ])
    );
  });

  it('projects a disjoint many-to-many shared channel without guessing message identity', () => {
    expect(getDistinctMessagePairs(['A', 'B'], ['X', 'Y', 'Z'])).toEqual([
      { producerMessageId: 'A', consumerMessageId: 'X' },
      { producerMessageId: 'A', consumerMessageId: 'Y' },
      { producerMessageId: 'A', consumerMessageId: 'Z' },
      { producerMessageId: 'B', consumerMessageId: 'X' },
      { producerMessageId: 'B', consumerMessageId: 'Y' },
      { producerMessageId: 'B', consumerMessageId: 'Z' },
    ]);

    expect(getDistinctMessagePairs(['A', 'B'], ['A', 'X'])).toEqual([
      { producerMessageId: 'A', consumerMessageId: 'X' },
      { producerMessageId: 'B', consumerMessageId: 'X' },
    ]);
  });

  it('renders a many-to-many shared channel as a hub in channel and focused service graphs', async () => {
    setupManyToManySharedChannelCatalog();

    const { edges: channelEdges } = await getChannelNodesAndEdges({
      id: 'Channel-1',
      version: '1.0.0',
      layout: false,
    });
    const renderedChannelEdges = edgePairs(channelEdges);

    expect(renderedChannelEdges).toEqual(
      expect.arrayContaining([
        'producer/a-1.0.0 -> A-1.0.0',
        'A-1.0.0 -> Channel-1-1.0.0',
        'producer/b-1.0.0 -> B-1.0.0',
        'B-1.0.0 -> Channel-1-1.0.0',
        'Channel-1-1.0.0 -> X-1.0.0',
        'X-1.0.0 -> consumer/x-1.0.0',
        'Channel-1-1.0.0 -> Y-1.0.0',
        'Y-1.0.0 -> consumer/y-1.0.0',
        'Channel-1-1.0.0 -> Z-1.0.0',
        'Z-1.0.0 -> consumer/z-1.0.0',
      ])
    );

    const { edges: producerEdges } = await getServiceNodesAndEdges({
      id: 'producer/a',
      version: '1.0.0',
      layout: false,
    });
    expect(edgePairs(producerEdges)).toEqual(
      expect.arrayContaining([
        'A-1.0.0 -> Channel-1-1.0.0',
        'Channel-1-1.0.0 -> X-1.0.0',
        'X-1.0.0 -> consumer/x-1.0.0',
        'Channel-1-1.0.0 -> Y-1.0.0',
        'Y-1.0.0 -> consumer/y-1.0.0',
        'Channel-1-1.0.0 -> Z-1.0.0',
        'Z-1.0.0 -> consumer/z-1.0.0',
      ])
    );

    const { edges: consumerEdges } = await getServiceNodesAndEdges({
      id: 'consumer/x',
      version: '1.0.0',
      layout: false,
    });
    expect(edgePairs(consumerEdges)).toEqual(
      expect.arrayContaining([
        'producer/a-1.0.0 -> A-1.0.0',
        'A-1.0.0 -> Channel-1-1.0.0',
        'producer/b-1.0.0 -> B-1.0.0',
        'B-1.0.0 -> Channel-1-1.0.0',
        'Channel-1-1.0.0 -> X-1.0.0',
        'X-1.0.0 -> consumer/x-1.0.0',
      ])
    );

    const { edges: consumerMessageEdges } = await getNodesAndEdgesForEvents({ id: 'X', version: '1.0.0' });
    expect(edgePairs(consumerMessageEdges)).toEqual(
      expect.arrayContaining([
        'producer/a-1.0.0 -> A-1.0.0',
        'A-1.0.0 -> Channel-1-1.0.0',
        'producer/b-1.0.0 -> B-1.0.0',
        'B-1.0.0 -> Channel-1-1.0.0',
        'Channel-1-1.0.0 -> X-1.0.0',
        'X-1.0.0 -> consumer/x-1.0.0',
      ])
    );
  });
});
