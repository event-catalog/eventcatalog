import { getCollection, type CollectionEntry } from 'astro:content';
import dagre from 'dagre';
import {
  buildContextMenuForAgent,
  buildContextMenuForMessage,
  buildContextMenuForResource,
  buildContextMenuForService,
  calculatedNodes,
  createDagreGraph,
  createEdge,
  createNode,
  generatedIdForEdge,
  generateIdForNode,
  getColorFromString,
  getEdgeLabelForMessageAsSource,
  getEdgeLabelForServiceAsTarget,
  getOperationFields,
  DEFAULT_NODE_WIDTH,
  DEFAULT_NODE_HEIGHT,
} from './utils/utils';
import { createVersionedMap, findInMap } from '@utils/collections/util';
import { getChannelChain, getChannels } from '@utils/collections/channels';
import { type Node, type Edge } from '@xyflow/react';
import type { CollectionMessageTypes } from '@types';

interface CollectionItem {
  collection: string;
  data: any;
}

export const getNodesAndEdgesForChannelChain = ({
  source,
  target,
  channelChain = [],
  mode = 'simple',
}: {
  source: CollectionItem;
  target: CollectionItem;
  channelChain: CollectionEntry<'channels'>[];
  mode?: 'simple' | 'full';
}) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // We found a channel chain, we need to render all the channels in the chain
  for (const channel of channelChain) {
    nodes.push(
      createNode({
        id: generateIdForNode(channel),
        type: channel.collection,
        data: {
          mode,
          channel: { ...channel.data, ...channel },
          contextMenu: buildContextMenuForResource({
            collection: 'channels',
            id: channel.data.id,
            version: channel.data.version,
          }),
        },
        position: { x: 0, y: 0 },
      })
    );
  }

  // Connect the source to the first channel in the chain
  edges.push(
    createEdge({
      id: generatedIdForEdge(source, channelChain[0]),
      source: generateIdForNode(source),
      target: generateIdForNode(channelChain[0]),
      label: 'routes to',
      data: { customColor: getColorFromString(source.data.id) },
    })
  );

  // Make sure all the channels in the chain are connected together
  for (const channel of channelChain) {
    const index = channelChain.findIndex((c) => c.id === channel.id);
    if (channelChain[index + 1]) {
      edges.push(
        createEdge({
          id: generatedIdForEdge(channel, channelChain[index + 1]),
          source: generateIdForNode(channel),
          target: generateIdForNode(channelChain[index + 1]),
          label: `routes to`,
          data: { customColor: getColorFromString(source.data.id) },
        })
      );
    }
  }

  // Connect the last channel to the target
  edges.push(
    createEdge({
      id: generatedIdForEdge(channelChain[channelChain.length - 1], target),
      source: generateIdForNode(channelChain[channelChain.length - 1]),
      target: generateIdForNode(target),
      label: 'consumes',
      data: { customColor: getColorFromString(source.data.id) },
    })
  );

  return { nodes, edges };
};

type MessageProducerOrConsumer = CollectionEntry<'services'> | CollectionEntry<'agents'>;
type ChannelPointer = { id: string; version?: string };
type ChannelRoute = CollectionEntry<'channels'>[];
type RoutedResource = {
  resource: MessageProducerOrConsumer;
  channelRoutes: ChannelRoute[];
};

type DagreGraph = any;

interface Props {
  id: string;
  version: string;
  defaultFlow?: DagreGraph;
  mode?: 'simple' | 'full';
  layout?: boolean;
}

/**
 * Builds the graph for a single channel: everything that publishes into it on the left,
 * everything that consumes out of it on the right, and any channels it routes to (or is
 * routed from) either side of it.
 */
export const getNodesAndEdges = async ({ id, version, defaultFlow, mode = 'simple', layout = true }: Props) => {
  const flow = defaultFlow || createDagreGraph({ ranksep: 300, nodesep: 50 });
  const nodes: any[] = [];
  const edges: any[] = [];

  const [channels, services, agents, events, commands, queries] = await Promise.all([
    getChannels(),
    getCollection('services'),
    getCollection('agents'),
    getCollection('events'),
    getCollection('commands'),
    getCollection('queries'),
  ]);

  const channel = channels.find((c) => c.data.id === id && c.data.version === version);

  // Nothing found...
  if (!channel) {
    return { nodes: [], edges: [] };
  }

  const allMessages = [...events, ...commands, ...queries] as CollectionEntry<CollectionMessageTypes>[];
  const messageMap = createVersionedMap(allMessages);
  const channelMap = createVersionedMap(channels);

  const getRoutesThroughFocusedChannel = (
    pointers: ChannelPointer[] | undefined,
    direction: 'producers' | 'consumers'
  ): ChannelRoute[] =>
    (pointers ?? []).flatMap((pointer) => {
      const resolved = findInMap(channelMap, pointer.id, pointer.version) as CollectionEntry<'channels'> | undefined;
      if (!resolved) return [];

      const route =
        direction === 'producers' ? getChannelChain(resolved, channel, channels) : getChannelChain(channel, resolved, channels);

      return route.length > 0 ? [route] : [];
    });

  const routesDirectlyToFocusedChannel = (pointers: ChannelPointer[] | undefined) =>
    (pointers ?? []).some((pointer) => {
      const resolved = findInMap(channelMap, pointer.id, pointer.version) as CollectionEntry<'channels'> | undefined;
      return !!resolved && generateIdForNode(resolved) === generateIdForNode(channel);
    });

  // messageNodeId -> { message, producers, consumers }
  const messageFlows = new Map<
    string,
    {
      message: CollectionEntry<CollectionMessageTypes>;
      producers: RoutedResource[];
      consumers: RoutedResource[];
    }
  >();

  const trackFlow = (
    message: CollectionEntry<CollectionMessageTypes>,
    resource: MessageProducerOrConsumer,
    direction: 'producers' | 'consumers',
    channelRoutes: ChannelRoute[]
  ) => {
    const messageNodeId = generateIdForNode(message);
    const flowForMessage = messageFlows.get(messageNodeId) ?? { message, producers: [], consumers: [] };
    const alreadyTracked = flowForMessage[direction].some(
      (existing) => existing.resource.data.id === resource.data.id && existing.resource.data.version === resource.data.version
    );

    if (!alreadyTracked) {
      flowForMessage[direction].push({ resource, channelRoutes });
    }

    messageFlows.set(messageNodeId, flowForMessage);
  };

  for (const resource of [...services, ...agents] as MessageProducerOrConsumer[]) {
    const pointerGroups = [
      { pointers: resource.data.sends ?? [], channelKey: 'to' as const, direction: 'producers' as const },
      { pointers: resource.data.receives ?? [], channelKey: 'from' as const, direction: 'consumers' as const },
    ];

    for (const { pointers, channelKey, direction } of pointerGroups) {
      for (const pointer of pointers as any[]) {
        const message = findInMap(messageMap, pointer.id, pointer.version) as CollectionEntry<CollectionMessageTypes> | undefined;

        if (!message) continue;

        const channelPointers = pointer[channelKey] as ChannelPointer[] | undefined;
        const hasExplicitChannels = Array.isArray(channelPointers) && channelPointers.length > 0;
        const effectiveChannelPointers = hasExplicitChannels
          ? channelPointers
          : (message.data.channels as ChannelPointer[] | undefined);
        const channelRoutes = getRoutesThroughFocusedChannel(effectiveChannelPointers, direction);

        if (channelRoutes.length > 0) {
          trackFlow(message, resource, direction, channelRoutes);
        }
      }
    }
  }

  // Messages whose declared channel routes into the focused channel still belong on the graph,
  // even when no producer or consumer references them.
  for (const message of allMessages) {
    const messageNodeId = generateIdForNode(message);
    const declaredRoutes = getRoutesThroughFocusedChannel(message.data.channels as ChannelPointer[] | undefined, 'producers');
    if (declaredRoutes.length > 0 && !messageFlows.has(messageNodeId)) {
      messageFlows.set(messageNodeId, { message, producers: [], consumers: [] });
    }
  }

  const channelNodeId = generateIdForNode(channel);
  const addedNodeIds = new Set<string>();
  const addedEdgeIds = new Set<string>();

  const addNode = (node: any) => {
    if (addedNodeIds.has(node.id)) return;
    addedNodeIds.add(node.id);
    nodes.push(node);
  };

  const addEdge = (edge: any) => {
    if (addedEdgeIds.has(edge.id)) return;
    addedEdgeIds.add(edge.id);
    edges.push(edge);
  };

  const addResourceNode = (resource: MessageProducerOrConsumer) => {
    addNode(
      createNode({
        id: generateIdForNode(resource),
        type: resource.collection,
        data: {
          mode,
          ...(resource.collection === 'agents' ? { agent: { ...resource.data } } : { service: { ...resource.data } }),
          contextMenu:
            resource.collection === 'agents'
              ? buildContextMenuForAgent({ id: resource.data.id, version: resource.data.version })
              : buildContextMenuForService({
                  id: resource.data.id,
                  version: resource.data.version,
                  specifications: (resource.data as any).specifications,
                  repository: (resource.data as any).repository,
                }),
        },
        position: { x: 0, y: 0 },
      })
    );
  };

  const addChannelNode = (channelToAdd: CollectionEntry<'channels'>, isFocused = false) => {
    addNode(
      createNode({
        id: generateIdForNode(channelToAdd),
        type: channelToAdd.collection,
        data: {
          mode,
          ...(isFocused ? { isFocused: true } : {}),
          channel: { ...channelToAdd.data },
          contextMenu: buildContextMenuForResource({
            collection: 'channels',
            id: channelToAdd.data.id,
            version: channelToAdd.data.version,
          }),
        },
        position: { x: 0, y: 0 },
      })
    );
  };

  // The channel itself
  addChannelNode(channel, true);

  const addChannelRoute = (route: ChannelRoute, colorSourceId: string) => {
    route.forEach((channelInRoute) => addChannelNode(channelInRoute, generateIdForNode(channelInRoute) === channelNodeId));

    for (let index = 0; index < route.length - 1; index++) {
      const sourceChannel = route[index];
      const targetChannel = route[index + 1];
      addEdge(
        createEdge({
          id: generatedIdForEdge(sourceChannel, targetChannel),
          source: generateIdForNode(sourceChannel),
          target: generateIdForNode(targetChannel),
          label: 'routes to',
          data: { customColor: getColorFromString(colorSourceId) },
        })
      );
    }
  };

  // channelNodeId + consumerNodeId -> messages consumed, so each channel/consumer pair gets one edge.
  const messagesByConsumer = new Map<
    string,
    {
      sourceChannel: CollectionEntry<'channels'>;
      consumer: MessageProducerOrConsumer;
      messages: CollectionEntry<CollectionMessageTypes>[];
    }
  >();

  for (const { message, producers, consumers } of messageFlows.values()) {
    const messageNodeId = generateIdForNode(message);

    addNode(
      createNode({
        id: messageNodeId,
        type: message.collection,
        data: {
          mode,
          message: { ...message.data, ...getOperationFields(message.data) },
          contextMenu: buildContextMenuForMessage({
            id: message.data.id,
            version: message.data.version,
            name: message.data.name,
            collection: message.collection,
            schemaPath: (message.data as any).schemaPath,
          }),
        },
        position: { x: 0, y: 0 },
      })
    );

    const producerRoutes = producers.flatMap((producer) => producer.channelRoutes);
    const declaredRoutes = getRoutesThroughFocusedChannel(message.data.channels as ChannelPointer[] | undefined, 'producers');
    const ingressRoutes = producerRoutes.length > 0 ? producerRoutes : declaredRoutes;

    // When only a consumer declares the focused channel, the message still enters at the
    // focused channel, matching the message graph's no-producer-channel behaviour.
    const routesToRender = ingressRoutes.length > 0 ? ingressRoutes : [[channel]];
    for (const route of routesToRender) {
      addChannelRoute(route, message.data.id);
      const firstChannel = route[0];
      addEdge(
        createEdge({
          id: generatedIdForEdge(message, firstChannel),
          source: messageNodeId,
          target: generateIdForNode(firstChannel),
          label: 'routes to',
          data: { customColor: getColorFromString(message.data.id) },
        })
      );
    }

    for (const { resource: producer } of producers) {
      addResourceNode(producer);
      addEdge(
        createEdge({
          id: generatedIdForEdge(producer, message),
          source: generateIdForNode(producer),
          target: messageNodeId,
          label: getEdgeLabelForServiceAsTarget(message),
          type: 'multiline',
          data: { customColor: getColorFromString(message.data.id) },
        })
      );
    }

    for (const { resource: consumer, channelRoutes } of consumers) {
      for (const route of channelRoutes) {
        addChannelRoute(route, message.data.id);
        const sourceChannel = route[route.length - 1];
        const consumerNodeId = generateIdForNode(consumer);
        const groupKey = `${generateIdForNode(sourceChannel)}:${consumerNodeId}`;
        const grouped = messagesByConsumer.get(groupKey) ?? { sourceChannel, consumer, messages: [] };
        if (!grouped.messages.some((groupedMessage) => generateIdForNode(groupedMessage) === messageNodeId)) {
          grouped.messages.push(message);
        }
        messagesByConsumer.set(groupKey, grouped);
      }
    }
  }

  // One edge per consumer, labelled with the message when there is only one
  for (const { sourceChannel, consumer, messages } of messagesByConsumer.values()) {
    addResourceNode(consumer);
    addEdge(
      createEdge({
        id: generatedIdForEdge(sourceChannel, consumer),
        source: generateIdForNode(sourceChannel),
        target: generateIdForNode(consumer),
        label:
          messages.length === 1 ? getEdgeLabelForMessageAsSource(messages[0], true) : `consumes ${messages.length}\nmessages`,
        type: 'multiline',
        data: { customColor: getColorFromString(sourceChannel.data.id) },
      })
    );
  }

  // Channels this channel routes messages on to
  for (const route of (channel.data.routes ?? []) as { id: string; version?: string }[]) {
    const routedChannel = findInMap(channelMap, route.id, route.version) as CollectionEntry<'channels'> | undefined;
    if (!routedChannel || generateIdForNode(routedChannel) === channelNodeId) continue;

    addChannelNode(routedChannel);
    addEdge(
      createEdge({
        id: generatedIdForEdge(channel, routedChannel),
        source: channelNodeId,
        target: generateIdForNode(routedChannel),
        label: 'routes to',
        data: { customColor: getColorFromString(channel.data.id) },
      })
    );
  }

  // Channels that route messages into this channel
  for (const upstreamChannel of channels) {
    if (generateIdForNode(upstreamChannel) === channelNodeId) continue;
    if (!routesDirectlyToFocusedChannel(upstreamChannel.data.routes as ChannelPointer[] | undefined)) continue;

    addChannelNode(upstreamChannel);
    addEdge(
      createEdge({
        id: generatedIdForEdge(upstreamChannel, channel),
        source: generateIdForNode(upstreamChannel),
        target: channelNodeId,
        label: 'routes to',
        data: { customColor: getColorFromString(upstreamChannel.data.id) },
      })
    );
  }

  nodes.forEach((node) => {
    flow.setNode(node.id, { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    flow.setEdge(edge.source, edge.target);
  });

  if (layout) {
    dagre.layout(flow);
  }

  return {
    nodes: calculatedNodes(flow, nodes),
    edges,
  };
};
