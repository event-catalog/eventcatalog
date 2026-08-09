import { expect, describe, it, vi, beforeEach } from 'vitest';
import type { CollectionKey } from 'astro:content';

const mockChannels = [
  {
    id: 'EventBus-1.0.0',
    slug: 'EventBus',
    collection: 'channels',
    data: {
      id: 'EventBus',
      name: 'Event Bus',
      version: '1.0.0',
      routes: [{ id: 'DownstreamQueue', version: '1.0.0' }],
    },
  },
  {
    id: 'DownstreamQueue-1.0.0',
    slug: 'DownstreamQueue',
    collection: 'channels',
    data: {
      id: 'DownstreamQueue',
      name: 'Downstream Queue',
      version: '1.0.0',
    },
  },
  {
    id: 'UnrelatedChannel-1.0.0',
    slug: 'UnrelatedChannel',
    collection: 'channels',
    data: {
      id: 'UnrelatedChannel',
      name: 'Unrelated Channel',
      version: '1.0.0',
    },
  },
];

const mockEvents = [
  {
    id: 'OrderCreated-1.0.0',
    slug: 'OrderCreated',
    collection: 'events',
    data: { id: 'OrderCreated', name: 'Order Created', version: '1.0.0' },
  },
  {
    id: 'OrderUpdated-1.0.0',
    slug: 'OrderUpdated',
    collection: 'events',
    data: { id: 'OrderUpdated', name: 'Order Updated', version: '1.0.0' },
  },
  {
    id: 'MessageWithChannelOnItself-1.0.0',
    slug: 'MessageWithChannelOnItself',
    collection: 'events',
    data: {
      id: 'MessageWithChannelOnItself',
      name: 'Message With Channel On Itself',
      version: '1.0.0',
      channels: [{ id: 'EventBus', version: '1.0.0' }],
    },
  },
  {
    id: 'MessageOnAnotherChannel-1.0.0',
    slug: 'MessageOnAnotherChannel',
    collection: 'events',
    data: {
      id: 'MessageOnAnotherChannel',
      name: 'Message On Another Channel',
      version: '1.0.0',
      channels: [{ id: 'UnrelatedChannel', version: '1.0.0' }],
    },
  },
];

const mockServices = [
  {
    id: 'OrderService-1.0.0',
    slug: 'OrderService',
    collection: 'services',
    data: {
      id: 'OrderService',
      name: 'Order Service',
      version: '1.0.0',
      sends: [
        { id: 'OrderCreated', version: '1.0.0', to: [{ id: 'EventBus', version: '1.0.0' }] },
        { id: 'OrderUpdated', version: '1.0.0', to: [{ id: 'EventBus', version: '1.0.0' }] },
      ],
    },
  },
  {
    id: 'NotificationService-1.0.0',
    slug: 'NotificationService',
    collection: 'services',
    data: {
      id: 'NotificationService',
      name: 'Notification Service',
      version: '1.0.0',
      receives: [
        { id: 'OrderCreated', version: '1.0.0', from: [{ id: 'EventBus', version: '1.0.0' }] },
        { id: 'OrderUpdated', version: '1.0.0', from: [{ id: 'EventBus', version: '1.0.0' }] },
      ],
    },
  },
  {
    id: 'ReportingService-1.0.0',
    slug: 'ReportingService',
    collection: 'services',
    data: {
      id: 'ReportingService',
      name: 'Reporting Service',
      version: '1.0.0',
      // Routed through a different channel, so it must not appear on the EventBus graph
      receives: [{ id: 'OrderCreated', version: '1.0.0', from: [{ id: 'UnrelatedChannel', version: '1.0.0' }] }],
    },
  },
  {
    id: 'LegacyService-1.0.0',
    slug: 'LegacyService',
    collection: 'services',
    data: {
      id: 'LegacyService',
      name: 'Legacy Service',
      version: '1.0.0',
      // No channel routing of its own, so the message's own `channels` decides
      sends: [{ id: 'MessageWithChannelOnItself', version: '1.0.0' }],
    },
  },
];

const mockAgents = [
  {
    id: 'SupportAgent-1.0.0',
    slug: 'SupportAgent',
    collection: 'agents',
    data: {
      id: 'SupportAgent',
      name: 'Support Agent',
      version: '1.0.0',
      receives: [{ id: 'MessageWithChannelOnItself', version: '1.0.0', from: [{ id: 'EventBus', version: '1.0.0' }] }],
    },
  },
];

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getCollection: (key: CollectionKey) => {
      switch (key) {
        case 'channels':
          return Promise.resolve(mockChannels);
        case 'services':
          return Promise.resolve(mockServices);
        case 'agents':
          return Promise.resolve(mockAgents);
        case 'events':
          return Promise.resolve(mockEvents);
        case 'commands':
          return Promise.resolve([]);
        case 'queries':
          return Promise.resolve([]);
        default:
          return Promise.resolve([]);
      }
    },
  };
});

vi.mock('@utils/collections/channels', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('@utils/collections/channels')>()),
    getChannels: () => Promise.resolve(mockChannels),
  };
});

const { getNodesAndEdges } = await import('@utils/node-graphs/channel-node-graph');

const idsFor = (nodes: any[]) => nodes.map((node) => node.id);
const edgesFor = (edges: any[]) => edges.map((edge) => `${edge.source} -> ${edge.target} (${edge.label})`);

describe('Channels NodeGraph', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getNodesAndEdges', () => {
    it('when the channel does not exist in the catalog, no nodes or edges are returned', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'DoesNotExist', version: '1.0.0' });

      expect(nodes).toEqual([]);
      expect(edges).toEqual([]);
    });

    it('when the channel exists, the channel itself is rendered as the focused node', async () => {
      const { nodes } = await getNodesAndEdges({ id: 'EventBus', version: '1.0.0' });

      const channelNode = nodes.find((node: any) => node.id === 'EventBus-1.0.0');

      expect(channelNode).toEqual(
        expect.objectContaining({
          id: 'EventBus-1.0.0',
          type: 'channels',
          data: expect.objectContaining({
            isFocused: true,
            channel: expect.objectContaining({ id: 'EventBus', version: '1.0.0' }),
            contextMenu: expect.arrayContaining([
              expect.objectContaining({ label: 'Focus node', href: '/visualiser/channels/EventBus/1.0.0' }),
            ]),
          }),
        })
      );
    });

    it('when a service sends a message to the channel, the service and the message are rendered upstream of the channel', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'EventBus', version: '1.0.0' });

      expect(idsFor(nodes)).toEqual(expect.arrayContaining(['OrderService-1.0.0', 'OrderCreated-1.0.0']));
      expect(edgesFor(edges)).toEqual(
        expect.arrayContaining([
          'OrderService-1.0.0 -> OrderCreated-1.0.0 (publishes \nevent)',
          'OrderCreated-1.0.0 -> EventBus-1.0.0 (routes to)',
        ])
      );
    });

    it('when a service receives more than one message from the channel, a single grouped edge is rendered to that service', async () => {
      const { edges } = await getNodesAndEdges({ id: 'EventBus', version: '1.0.0' });

      const consumerEdges = edges.filter((edge: any) => edge.target === 'NotificationService-1.0.0');

      expect(consumerEdges).toHaveLength(1);
      expect(consumerEdges[0].label).toBe('consumes 2\nmessages');
      expect(consumerEdges[0].source).toBe('EventBus-1.0.0');
    });

    it('when an agent receives a message from the channel, the agent is rendered downstream of the channel', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'EventBus', version: '1.0.0' });

      const agentNode = nodes.find((node: any) => node.id === 'SupportAgent-1.0.0');

      expect(agentNode).toEqual(
        expect.objectContaining({
          type: 'agents',
          data: expect.objectContaining({ agent: expect.objectContaining({ id: 'SupportAgent' }) }),
        })
      );
      expect(edgesFor(edges)).toEqual(expect.arrayContaining(['EventBus-1.0.0 -> SupportAgent-1.0.0 (subscribed to)']));
    });

    it('when a message declares the channel on itself and the sending service declares no channel, the service is still rendered as a producer', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'EventBus', version: '1.0.0' });

      expect(idsFor(nodes)).toEqual(expect.arrayContaining(['LegacyService-1.0.0', 'MessageWithChannelOnItself-1.0.0']));
      expect(edgesFor(edges)).toEqual(
        expect.arrayContaining([
          'LegacyService-1.0.0 -> MessageWithChannelOnItself-1.0.0 (publishes \nevent)',
          'MessageWithChannelOnItself-1.0.0 -> EventBus-1.0.0 (routes to)',
        ])
      );
    });

    it('when a service routes a message through a different channel, that service is not rendered on this channel', async () => {
      const { nodes } = await getNodesAndEdges({ id: 'EventBus', version: '1.0.0' });

      expect(idsFor(nodes)).not.toContain('ReportingService-1.0.0');
    });

    it('when a message belongs to a different channel, that message is not rendered on this channel', async () => {
      const { nodes } = await getNodesAndEdges({ id: 'EventBus', version: '1.0.0' });

      expect(idsFor(nodes)).not.toContain('MessageOnAnotherChannel-1.0.0');
    });

    it('when the channel routes to another channel, the routed channel is rendered downstream', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'EventBus', version: '1.0.0' });

      expect(idsFor(nodes)).toContain('DownstreamQueue-1.0.0');
      expect(edgesFor(edges)).toEqual(expect.arrayContaining(['EventBus-1.0.0 -> DownstreamQueue-1.0.0 (routes to)']));
    });

    it('when another channel routes into this channel, that channel is rendered upstream', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'DownstreamQueue', version: '1.0.0' });

      expect(idsFor(nodes)).toContain('EventBus-1.0.0');
      expect(edgesFor(edges)).toEqual(expect.arrayContaining(['EventBus-1.0.0 -> DownstreamQueue-1.0.0 (routes to)']));
    });

    it('when nodes are laid out, every node is given a calculated position', async () => {
      const { nodes } = await getNodesAndEdges({ id: 'EventBus', version: '1.0.0' });

      expect(nodes.length).toBeGreaterThan(0);
      nodes.forEach((node: any) => {
        expect(typeof node.position.x).toBe('number');
        expect(typeof node.position.y).toBe('number');
      });
    });
  });
});
