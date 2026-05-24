// import { getColor } from '@utils/colors';
import { getEvents } from '@utils/collections/events';
import type { CollectionEntry } from 'astro:content';
import dagre from 'dagre';
import {
  calculatedNodes,
  createDagreGraph,
  createEdge,
  generatedIdForEdge,
  generateIdForNode,
  getColorFromString,
  getEdgeLabelForMessageAsSource,
  getEdgeLabelForServiceAsTarget,
  versionMatches,
} from './utils/utils';
import { MarkerType, type Node, type Edge } from '@xyflow/react';
import {
  findMatchingNodes,
  getItemsFromCollectionByIdAndSemverOrLatest,
  getLatestVersionInCollectionById,
  createVersionedMap,
  findInMap,
} from '@utils/collections/util';
import type { CollectionMessageTypes } from '@types';
import { getCommands } from '@utils/collections/commands';
import { getQueries } from '@utils/collections/queries';
import {
  createNode,
  buildContextMenuForMessage,
  buildContextMenuForAgent,
  buildContextMenuForService,
  buildContextMenuForResource,
  getOperationFields,
  DEFAULT_NODE_WIDTH,
  DEFAULT_NODE_HEIGHT,
} from './utils/utils';
import { getConsumersOfMessage, getProducersOfMessage } from '@utils/collections/services';
import {
  getConsumersOfMessage as getAgentConsumersOfMessage,
  getProducersOfMessage as getAgentProducersOfMessage,
} from '@utils/collections/agents';
import { getNodesAndEdgesForChannelChain } from './channel-node-graph';
import { getChannelChain, isChannelsConnected } from '@utils/collections/channels';
import { getChannels } from '@utils/collections/channels';

type DagreGraph = any;
type RoutableResource = CollectionEntry<'agents'> | CollectionEntry<'services'>;
type ProducerConsumerResource = RoutableResource | CollectionEntry<'data-products'>;

interface Props {
  id: string;
  version: string;
  defaultFlow?: DagreGraph;
  mode?: 'simple' | 'full';
  channelRenderMode?: 'flat' | 'single';
  collection?: CollectionEntry<CollectionMessageTypes>[];
  channels?: CollectionEntry<'channels'>[];
}

const isAgent = (resource: ProducerConsumerResource | RoutableResource): resource is CollectionEntry<'agents'> =>
  resource.collection === 'agents';
const isDataProduct = (resource: ProducerConsumerResource): resource is CollectionEntry<'data-products'> =>
  resource.collection === 'data-products';

const getRoutableContextMenu = (resource: RoutableResource) => {
  if (isAgent(resource)) {
    return buildContextMenuForAgent({
      id: resource.data.id,
      version: resource.data.version,
      repository: resource.data.repository as { url: string },
    });
  }

  return buildContextMenuForService({
    id: resource.data.id,
    version: resource.data.version,
    specifications: (resource.data as any).specifications,
    repository: (resource.data as any).repository,
  });
};

const getRoutableNodeData = (resource: RoutableResource, mode: 'simple' | 'full') => ({
  title: resource.data.id,
  mode,
  ...(isAgent(resource) ? { agent: { ...resource.data } } : { service: { ...resource.data } }),
  contextMenu: getRoutableContextMenu(resource),
});

const sanitizeToolId = (name: string) =>
  name
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .toLowerCase();

const generateIdForAgentToolNode = (agent: RoutableResource, tool: { name: string; type: string }) =>
  `${generateIdForNode(agent)}-tool-${sanitizeToolId(`${tool.name}-${tool.type}`)}`;

const appendAgentToolNodesAndEdges = ({
  agent,
  nodes,
  edges,
  mode,
}: {
  agent: RoutableResource;
  nodes: Node[];
  edges: Edge[];
  mode: 'simple' | 'full';
}) => {
  if (!isAgent(agent)) return;

  (agent.data.tools || []).forEach((tool) => {
    const toolNodeId = generateIdForAgentToolNode(agent, tool);

    nodes.push(
      createNode({
        id: toolNodeId,
        type: 'agentTool',
        data: {
          mode,
          agentTool: {
            id: sanitizeToolId(`${tool.name}-${tool.type}`),
            name: tool.name,
            type: tool.type,
            icon: tool.icon,
            url: tool.url,
            description: tool.description,
          },
          contextMenu: tool.url
            ? [
                {
                  label: 'Open tool endpoint',
                  href: tool.url,
                  external: true,
                },
              ]
            : undefined,
        },
        position: { x: 0, y: 0 },
      })
    );

    edges.push(
      createEdge({
        id: `${generateIdForNode(agent)}-${toolNodeId}`,
        source: generateIdForNode(agent),
        target: toolNodeId,
        label: 'calls tool',
        type: 'step',
        animated: false,
        data: { animated: false },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#666',
          width: 20,
          height: 20,
        },
      })
    );
  });
};

const getDataProductNodeData = (resource: CollectionEntry<'data-products'>, mode: 'simple' | 'full') => ({
  title: resource.data.id,
  mode,
  dataProduct: { ...resource.data },
  contextMenu: buildContextMenuForResource({ collection: 'data-products', id: resource.data.id, version: resource.data.version }),
});

const getNodesAndEdges = async ({
  id,
  version,
  defaultFlow,
  mode = 'simple',
  channelRenderMode = 'flat',
  collection = [],
  channels = [],
}: Props) => {
  const flow = defaultFlow || createDagreGraph({ ranksep: 300, nodesep: 50 });
  const nodes = [] as any,
    edges = [] as any;

  const message = collection.find((message) => {
    return message.data.id === id && message.data.version === version;
  });

  // Nothing found...
  if (!message) {
    return {
      nodes: [],
      edges: [],
    };
  }

  // Pre-calculate channel map for O(1) lookups
  const channelMap = createVersionedMap(channels);

  // We always render the message itself
  nodes.push({
    id: generateIdForNode(message),
    sourcePosition: 'right',
    targetPosition: 'left',
    data: {
      mode,
      message: {
        ...message.data,
        ...getOperationFields(message.data),
      },
      contextMenu: buildContextMenuForMessage({
        id: message.data.id,
        version: message.data.version,
        name: message.data.name,
        collection: message.collection,
        schemaPath: (message.data as any).schemaPath,
      }),
    },
    position: { x: 0, y: 0 },
    type: message.collection,
  });

  const producers = (message.data.producers as ProducerConsumerResource[]) || [];
  const consumers = (message.data.consumers as ProducerConsumerResource[]) || [];

  // Track nodes that are both sent and received (only service-like resources)
  const routableProducers = producers.filter(
    (p) => p.collection === 'services' || p.collection === 'agents'
  ) as RoutableResource[];
  const routableConsumers = consumers.filter(
    (c) => c.collection === 'services' || c.collection === 'agents'
  ) as RoutableResource[];
  const bothSentAndReceived = findMatchingNodes(routableProducers as any, routableConsumers as any);

  for (const producer of producers) {
    nodes.push({
      id: generateIdForNode(producer),
      type: isDataProduct(producer) ? 'data-products' : producer.collection,
      sourcePosition: 'right',
      targetPosition: 'left',
      data: isDataProduct(producer) ? getDataProductNodeData(producer, mode) : getRoutableNodeData(producer, mode),
      position: { x: 250, y: 0 },
    });
    if (!isDataProduct(producer)) {
      appendAgentToolNodesAndEdges({ agent: producer, nodes, edges, mode });
    }

    // Data products don't have channel configuration, so connect directly to the message
    if (isDataProduct(producer)) {
      const rootSourceAndTarget = {
        source: { id: generateIdForNode(producer), collection: producer.collection },
        target: { id: generateIdForNode(message), collection: message.collection },
      };

      edges.push({
        id: generatedIdForEdge(producer, message),
        source: generateIdForNode(producer),
        target: generateIdForNode(message),
        label: 'produces',
        data: { customColor: getColorFromString(message.data.id), rootSourceAndTarget },
        animated: false,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
        },
      });
      continue;
    }

    // Service/agent-specific channel handling
    const routableProducer = producer as RoutableResource;

    // Is the producer sending this message to a channel?
    const producerConfigurationForMessage = routableProducer.data.sends?.find(
      (send) => send.id === message.data.id && versionMatches(send.version, message.data.version)
    );
    const producerChannelConfiguration = producerConfigurationForMessage?.to ?? [];

    const producerHasChannels = producerChannelConfiguration?.length > 0;

    const rootSourceAndTarget = {
      source: { id: generateIdForNode(producer), collection: producer.collection },
      target: { id: generateIdForNode(message), collection: message.collection },
    };

    // If the producer does not have any channels defined, then we just connect the producer to the event directly
    if (!producerHasChannels) {
      edges.push({
        id: generatedIdForEdge(producer, message),
        source: generateIdForNode(producer),
        target: generateIdForNode(message),
        label: getEdgeLabelForServiceAsTarget(message),
        data: { customColor: getColorFromString(message.data.id), rootSourceAndTarget },
        animated: false,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
        },
      });
      continue;
    }

    // If the producer has channels defined, we need to render them
    for (const producerChannel of producerChannelConfiguration) {
      const channel = findInMap(channelMap, producerChannel.id, producerChannel.version) as CollectionEntry<'channels'>;

      // If we cannot find the channel in EventCatalog, we just connect the producer to the event directly
      if (!channel) {
        edges.push(
          createEdge({
            id: generatedIdForEdge(producer, message),
            source: generateIdForNode(producer),
            target: generateIdForNode(message),
            label: getEdgeLabelForMessageAsSource(message),
            data: { customColor: getColorFromString(message.data.id), rootSourceAndTarget },
          })
        );
        continue;
      }

      // We render the channel node
      nodes.push(
        createNode({
          id: generateIdForNode(channel),
          type: channel.collection,
          data: {
            mode,
            channel: { ...channel.data },
            contextMenu: buildContextMenuForResource({
              collection: 'channels',
              id: channel.data.id,
              version: channel.data.version,
            }),
          },
          position: { x: 0, y: 0 },
        })
      );

      // Connect the producer to the message
      edges.push(
        createEdge({
          id: generatedIdForEdge(producer, message),
          source: generateIdForNode(producer),
          target: generateIdForNode(message),
          data: { customColor: getColorFromString(message.data.id), rootSourceAndTarget },
          label: getEdgeLabelForServiceAsTarget(message),
        })
      );

      // Connect the message to the channel
      edges.push(
        createEdge({
          id: generatedIdForEdge(message, channel),
          source: generateIdForNode(message),
          target: generateIdForNode(channel),
          data: { customColor: getColorFromString(message.data.id), rootSourceAndTarget },
          label: 'routes to',
        })
      );
    }
  }

  // The resources that consume the message
  for (const consumer of consumers) {
    nodes.push({
      id: generateIdForNode(consumer),
      sourcePosition: 'right',
      targetPosition: 'left',
      data: isDataProduct(consumer) ? getDataProductNodeData(consumer, mode) : getRoutableNodeData(consumer, mode),
      position: { x: 0, y: 0 },
      type: isDataProduct(consumer) ? 'data-products' : consumer.collection,
    });
    if (!isDataProduct(consumer)) {
      appendAgentToolNodesAndEdges({ agent: consumer, nodes, edges, mode });
    }

    // Data products don't have channel configuration, so connect directly from the message
    if (isDataProduct(consumer)) {
      const rootSourceAndTarget = {
        source: { id: generateIdForNode(message), collection: message.collection },
        target: { id: generateIdForNode(consumer), collection: consumer.collection },
      };

      edges.push(
        createEdge({
          id: generatedIdForEdge(message, consumer),
          source: generateIdForNode(message),
          target: generateIdForNode(consumer),
          label: 'consumed by',
          data: { customColor: getColorFromString(message.data.id), rootSourceAndTarget },
        })
      );
      continue;
    }

    // Service/agent-specific channel handling
    const routableConsumer = consumer as RoutableResource;

    // Is the consumer receiving this message from a channel?
    const consumerConfigurationForMessage = routableConsumer.data.receives?.find(
      (receive) => receive.id === message.data.id && versionMatches(receive.version, message.data.version)
    );
    const consumerChannelConfiguration = consumerConfigurationForMessage?.from ?? [];

    const consumerHasChannels = consumerChannelConfiguration.length > 0;

    const rootSourceAndTarget = {
      source: { id: generateIdForNode(message), collection: message.collection },
      target: { id: generateIdForNode(consumer), collection: consumer.collection },
    };

    // If the consumer does not have any channels defined, connect the consumer to the event directly
    if (!consumerHasChannels) {
      edges.push(
        createEdge({
          id: generatedIdForEdge(message, consumer),
          source: generateIdForNode(message),
          target: generateIdForNode(consumer),
          label: getEdgeLabelForMessageAsSource(message),
          data: { customColor: getColorFromString(message.data.id), rootSourceAndTarget },
        })
      );
    }

    // If the consumer has channels defined, we try and render them
    for (const consumerChannel of consumerChannelConfiguration) {
      const channel = findInMap(channelMap, consumerChannel.id, consumerChannel.version) as CollectionEntry<'channels'>;

      // If we cannot find the channel in EventCatalog, we connect the message directly to the consumer
      if (!channel) {
        edges.push(
          createEdge({
            id: generatedIdForEdge(message, consumer),
            source: generateIdForNode(message),
            target: generateIdForNode(consumer),
            label: getEdgeLabelForMessageAsSource(message),
            data: { customColor: getColorFromString(message.data.id), rootSourceAndTarget },
          })
        );
        continue;
      }

      // Can any of the consumer channels be linked to any of the producer channels?
      // Only consider service-like producers for channel linking (data products don't have sends/receives)
      const producerChannels = routableProducers
        .map((producer) => {
          const config = producer.data.sends?.find(
            (send) => send.id === message.data.id && versionMatches(send.version, message.data.version)
          );
          return config?.to ?? [];
        })
        .flat();
      const consumerChannels =
        routableConsumer.data.receives?.find(
          (receive) => receive.id === message.data.id && versionMatches(receive.version, message.data.version)
        )?.from ?? [];

      for (const producerChannel of producerChannels) {
        const producerChannelValue = findInMap(
          channelMap,
          producerChannel.id,
          producerChannel.version
        ) as CollectionEntry<'channels'>;

        for (const consumerChannel of consumerChannels) {
          const consumerChannelValue = findInMap(
            channelMap,
            consumerChannel.id,
            consumerChannel.version
          ) as CollectionEntry<'channels'>;
          const channelChainToRender = getChannelChain(producerChannelValue, consumerChannelValue, channels);

          // If there is a chain between them we need to render them al
          if (channelChainToRender.length > 0) {
            const { nodes: channelNodes, edges: channelEdges } = getNodesAndEdgesForChannelChain({
              source: message,
              target: consumer,
              channelChain: channelChainToRender,
              mode,
            });

            nodes.push(...channelNodes);
            edges.push(...channelEdges);
          } else {
            // There is no chain found, we need to render the channel between message and the consumers
            nodes.push(
              createNode({
                id: generateIdForNode(channel),
                type: channel.collection,
                data: { mode, channel: { ...channel.data } },
                position: { x: 0, y: 0 },
              })
            );
            edges.push(
              createEdge({
                id: generatedIdForEdge(message, channel),
                source: generateIdForNode(message),
                target: generateIdForNode(channel),
                label: 'routes to',
                data: { customColor: getColorFromString(message.data.id), rootSourceAndTarget },
              })
            );
            edges.push(
              createEdge({
                id: generatedIdForEdge(channel, consumer),
                source: generateIdForNode(channel),
                target: generateIdForNode(consumer),
                label: getEdgeLabelForMessageAsSource(message),
                data: { customColor: getColorFromString(message.data.id), rootSourceAndTarget },
              })
            );
          }
        }
      }

      // If producer does not have a any channels defined, we need to connect the message to the consumer directly
      if (producerChannels.length === 0 && channel) {
        // Create the channel node
        nodes.push(
          createNode({
            id: generateIdForNode(channel),
            type: channel.collection,
            data: { mode, channel: { ...channel.data } },
            position: { x: 0, y: 0 },
          })
        );

        // Connect the message to the channel
        edges.push(
          createEdge({
            id: generatedIdForEdge(message, channel),
            source: generateIdForNode(message),
            target: generateIdForNode(channel),
            label: 'routes to',
            data: { customColor: getColorFromString(message.data.id), rootSourceAndTarget },
          })
        );

        // Connect the channel to the consumer
        edges.push(
          createEdge({
            id: generatedIdForEdge(channel, consumer),
            source: generateIdForNode(channel),
            target: generateIdForNode(consumer),
            label: getEdgeLabelForMessageAsSource(message),
            data: { customColor: getColorFromString(message.data.id), rootSourceAndTarget },
          })
        );
      }
    }
  }

  // Handle messages that are both sent and received
  bothSentAndReceived.forEach((_message) => {
    if (message) {
      edges.push(
        createEdge({
          id: generatedIdForEdge(message, _message) + '-both',
          source: generateIdForNode(message),
          target: generateIdForNode(_message),
          label: 'publishes and subscribes',
          data: { customColor: getColorFromString(message.data.id), rootSourceAndTarget: { source: message, target: _message } },
        })
      );
    }
  });

  nodes.forEach((node: any) => {
    flow.setNode(node.id, { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT });
  });

  edges.forEach((edge: any) => {
    flow.setEdge(edge.source, edge.target);
  });

  // Render the diagram in memory getting hte X and Y
  dagre.layout(flow);

  return {
    nodes: calculatedNodes(flow, nodes),
    edges,
  };
};

export const getNodesAndEdgesForQueries = async ({
  id,
  version,
  defaultFlow,
  mode = 'simple',
  channelRenderMode = 'flat',
}: Props) => {
  const [queries, channels] = await Promise.all([getQueries(), getChannels()]);
  return getNodesAndEdges({ id, version, defaultFlow, mode, channelRenderMode, collection: queries, channels });
};

export const getNodesAndEdgesForCommands = async ({
  id,
  version,
  defaultFlow,
  mode = 'simple',
  channelRenderMode = 'flat',
}: Props) => {
  const [commands, channels] = await Promise.all([getCommands(), getChannels()]);
  return getNodesAndEdges({ id, version, defaultFlow, mode, channelRenderMode, collection: commands, channels });
};

export const getNodesAndEdgesForEvents = async ({
  id,
  version,
  defaultFlow,
  mode = 'simple',
  channelRenderMode = 'flat',
}: Props) => {
  const [events, channels] = await Promise.all([getEvents(), getChannels()]);
  return getNodesAndEdges({ id, version, defaultFlow, mode, channelRenderMode, collection: events, channels });
};

export const getNodesAndEdgesForConsumedMessage = ({
  message,
  targetChannels = [],
  services,
  agents = [],
  channels,
  currentNodes = [],
  target,
  mode = 'simple',
  channelMap,
}: {
  message: CollectionEntry<CollectionMessageTypes>;
  targetChannels?: { id: string; version: string }[];
  services: CollectionEntry<'services'>[];
  agents?: CollectionEntry<'agents'>[];
  channels: CollectionEntry<'channels'>[];
  currentNodes: Node[];
  target: RoutableResource;
  mode?: 'simple' | 'full';
  channelMap?: Map<string, CollectionEntry<'channels'>[]>;
}) => {
  let nodes = [] as Node[],
    edges = [] as any;

  // Use the provided map or create one if missing
  const map = channelMap || createVersionedMap(channels);

  const messageId = generateIdForNode(message);

  const rootSourceAndTarget = {
    source: { id: generateIdForNode(message), collection: message.collection },
    target: { id: generateIdForNode(target), collection: target.collection },
  };

  // Render the message node
  nodes.push(
    createNode({
      id: messageId,
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

  // Render the target node
  nodes.push(
    createNode({
      id: generateIdForNode(target),
      type: target.collection,
      data: getRoutableNodeData(target, mode),
      position: { x: 0, y: 0 },
    })
  );
  appendAgentToolNodesAndEdges({ agent: target, nodes, edges, mode });

  const targetMessageConfiguration = target.data.receives?.find(
    (receive) => receive.id === message.data.id && versionMatches(receive.version, message.data.version)
  );
  const channelsFromMessageToTarget = targetMessageConfiguration?.from ?? [];
  const hydratedChannelsFromMessageToTarget = channelsFromMessageToTarget
    .map((channel) => findInMap(map, channel.id, channel.version))
    .filter((channel): channel is CollectionEntry<'channels'> => channel !== undefined);

  // Now we get the producers of the message and create nodes and edges for them
  const producers = [
    ...getAgentProducersOfMessage(agents, message),
    ...getProducersOfMessage(services, message),
  ] as RoutableResource[];

  const hasProducers = producers.length > 0;
  const targetHasDefinedChannels = targetChannels.length > 0;

  // Warning edge if no producers or target channels are defined
  if (!hasProducers && !targetHasDefinedChannels) {
    edges.push(
      createEdge({
        id: generatedIdForEdge(message, target) + '-warning',
        source: messageId,
        target: generateIdForNode(target),
        label: getEdgeLabelForMessageAsSource(message),
        data: { customColor: getColorFromString(message.data.id), rootSourceAndTarget },
      })
    );
  }

  // If the target defined channels they consume the message from, we need to create the channel nodes and edges
  if (targetHasDefinedChannels) {
    for (const targetChannel of targetChannels) {
      const channel = findInMap(map, targetChannel.id, targetChannel.version) as CollectionEntry<'channels'>;

      if (!channel) {
        // No channe found, we just connect the message to the target directly
        edges.push(
          createEdge({
            id: generatedIdForEdge(message, target),
            source: messageId,
            target: generateIdForNode(target),
            label: getEdgeLabelForMessageAsSource(message),
            data: { customColor: getColorFromString(message.data.id), rootSourceAndTarget },
          })
        );
        continue;
      }

      const channelId = generateIdForNode(channel);

      // Create the channel node
      nodes.push(
        createNode({
          id: channelId,
          type: channel.collection,
          data: {
            mode,
            channel: { ...channel.data, ...channel, id: channel.data.id },
            contextMenu: buildContextMenuForResource({
              collection: 'channels',
              id: channel.data.id,
              version: channel.data.version,
            }),
          },
          position: { x: 0, y: 0 },
        })
      );

      // Connect the channel to the target
      edges.push(
        createEdge({
          id: generatedIdForEdge(channel, target),
          source: channelId,
          target: generateIdForNode(target),
          label: getEdgeLabelForMessageAsSource(message),
          data: { customColor: getColorFromString(message.data.id), rootSourceAndTarget },
        })
      );

      // If we dont have any producers, we will connect the message to the channel directly
      if (producers.length === 0) {
        edges.push(
          createEdge({
            id: generatedIdForEdge(message, channel),
            source: messageId,
            target: channelId,
            label: 'routes to',
            data: { customColor: getColorFromString(message.data.id), rootSourceAndTarget },
          })
        );
      }
    }
  }

  // Process the producers for the message
  for (const producer of producers) {
    const producerId = generateIdForNode(producer);

    // Create the producer node
    nodes.push(
      createNode({
        id: producerId,
        type: producer.collection,
        data: getRoutableNodeData(producer, mode),
        position: { x: 0, y: 0 },
      })
    );
    appendAgentToolNodesAndEdges({ agent: producer, nodes, edges, mode });

    // The message is always connected directly to the producer
    edges.push(
      createEdge({
        id: generatedIdForEdge(producer, message),
        source: producerId,
        target: messageId,
        label: getEdgeLabelForServiceAsTarget(message),
        data: { customColor: getColorFromString(message.data.id), rootSourceAndTarget },
      })
    );

    // Check if the producer is sending the message to a channel
    const producerConfigurationForMessage = producer.data.sends?.find(
      (send) => send.id === message.data.id && versionMatches(send.version, message.data.version)
    );
    const producerChannelConfiguration = producerConfigurationForMessage?.to ?? [];

    const producerHasChannels = producerChannelConfiguration.length > 0;
    const targetHasChannels = hydratedChannelsFromMessageToTarget.length > 0;

    // If the producer or target (consumer) has no channels defined, we just connect the message to the consumer directly
    // of the target has no channels defined, we just connect the message to the target directly
    if ((!producerHasChannels && !targetHasChannels) || !targetHasChannels) {
      edges.push(
        createEdge({
          id: generatedIdForEdge(message, target),
          source: messageId,
          target: generateIdForNode(target),
          label: getEdgeLabelForMessageAsSource(message),
          data: { customColor: getColorFromString(message.data.id), rootSourceAndTarget },
        })
      );
      continue;
    }

    // If the target has channels but the producer does not
    // We then connect the message to the channels directly
    if (targetHasChannels && !producerHasChannels) {
      for (const targetChannel of hydratedChannelsFromMessageToTarget) {
        edges.push(
          createEdge({
            id: generatedIdForEdge(message, targetChannel),
            source: messageId,
            target: generateIdForNode(targetChannel),
            label: 'routes to',
            data: {
              customColor: getColorFromString(message.data.id),
              rootSourceAndTarget: {
                source: { id: generateIdForNode(message), collection: message.collection },
                target: { id: generateIdForNode(target), collection: target.collection },
              },
            },
          })
        );
      }
      continue;
    }

    // Process each producer channel configuration
    for (const producerChannel of producerChannelConfiguration) {
      const channel = findInMap(map, producerChannel.id, producerChannel.version) as CollectionEntry<'channels'>;

      // If we cannot find the channel in EventCatalog, we just connect the message to the target directly
      if (!channel) {
        edges.push(
          createEdge({
            id: generatedIdForEdge(message, target),
            source: messageId,
            target: generateIdForNode(target),
            label: getEdgeLabelForMessageAsSource(message),
            data: {
              customColor: getColorFromString(message.data.id),
              rootSourceAndTarget: {
                source: { id: generateIdForNode(message), collection: message.collection },
                target: { id: generateIdForNode(target), collection: target.collection },
              },
            },
          })
        );
        continue;
      }

      // Does the producer have any channels defined? If not, we just connect the message to the target directly
      if (!producerHasChannels) {
        edges.push(
          createEdge({
            id: generatedIdForEdge(message, target),
            source: messageId,
            target: generateIdForNode(target),
            label: getEdgeLabelForMessageAsSource(message),
            data: {
              customColor: getColorFromString(message.data.id),
              rootSourceAndTarget: {
                source: { id: generateIdForNode(message), collection: message.collection },
                target: { id: generateIdForNode(target), collection: target.collection },
              },
            },
          })
        );
        continue;
      }

      // The producer does have channels defined, we need to try and work out the path the message takes to the target
      for (const targetChannel of hydratedChannelsFromMessageToTarget) {
        const channelChainToRender = getChannelChain(channel, targetChannel, channels);
        if (channelChainToRender.length > 0) {
          const { nodes: channelNodes, edges: channelEdges } = getNodesAndEdgesForChannelChain({
            source: message,
            target: target,
            channelChain: channelChainToRender,
            mode,
          });

          nodes.push(...channelNodes);
          edges.push(...channelEdges);

          break;
        } else {
          // No chain found create the channel, and connect the message to the target channel directly
          nodes.push(
            createNode({
              id: generateIdForNode(targetChannel),
              type: targetChannel.collection,
              data: { mode, channel: { ...targetChannel.data, ...targetChannel } },
              position: { x: 0, y: 0 },
            })
          );
          edges.push(
            createEdge({
              id: generatedIdForEdge(message, targetChannel),
              source: messageId,
              target: generateIdForNode(targetChannel),
              label: 'routes to',
              data: {
                rootSourceAndTarget: {
                  source: { id: generateIdForNode(message), collection: message.collection },
                  target: { id: generateIdForNode(targetChannel), collection: targetChannel.collection },
                },
              },
            })
          );
        }
      }
    }
  }

  // Remove any nodes that are already in the current nodes (already on the UI)
  nodes = nodes.filter((node) => !currentNodes.find((n) => n.id === node.id));

  //  Make sure all nodes are unique
  const uniqueNodes = nodes.filter((node, index, self) => index === self.findIndex((t) => t.id === node.id));

  const uniqueEdges = edges.filter(
    (edge: any, index: number, self: any[]) => index === self.findIndex((t: any) => t.id === edge.id)
  );

  return { nodes: uniqueNodes, edges: uniqueEdges };
};

export const getNodesAndEdgesForProducedMessage = ({
  message,
  sourceChannels,
  services,
  agents = [],
  channels,
  currentNodes = [],
  currentEdges = [],
  source,
  mode = 'simple',
  channelMap,
}: {
  message: CollectionEntry<CollectionMessageTypes>;
  sourceChannels?: { id: string; version: string }[];
  services: CollectionEntry<'services'>[];
  agents?: CollectionEntry<'agents'>[];
  channels: CollectionEntry<'channels'>[];
  currentNodes: Node[];
  currentEdges: Edge[];
  source: RoutableResource;
  mode?: 'simple' | 'full';
  channelMap?: Map<string, CollectionEntry<'channels'>[]>;
}) => {
  let nodes = [] as Node[],
    edges = [] as any;

  // Use provided map or create one
  const map = channelMap || createVersionedMap(channels);

  const messageId = generateIdForNode(message);

  const rootSourceAndTarget = {
    source: { id: generateIdForNode(source), collection: source.collection },
    target: { id: generateIdForNode(message), collection: message.collection },
  };

  // Render the message node
  nodes.push(
    createNode({
      id: messageId,
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

  // Render the producer node
  nodes.push(
    createNode({
      id: generateIdForNode(source),
      type: source.collection,
      data: getRoutableNodeData(source, mode),
      position: { x: 0, y: 0 },
    })
  );
  appendAgentToolNodesAndEdges({ agent: source, nodes, edges, mode });

  // Render the edge from the producer to the message
  edges.push(
    createEdge({
      id: generatedIdForEdge(source, message),
      source: generateIdForNode(source),
      target: messageId,
      label: getEdgeLabelForServiceAsTarget(message),
      data: { customColor: getColorFromString(message.data.id), rootSourceAndTarget },
    })
  );

  const sourceMessageConfiguration = source.data.sends?.find(
    (send) => send.id === message.data.id && versionMatches(send.version, message.data.version)
  );
  const channelsFromSourceToMessage = sourceMessageConfiguration?.to ?? [];

  const hydratedChannelsFromSourceToMessage = channelsFromSourceToMessage
    .map((channel) => findInMap(map, channel.id, channel.version))
    .filter((channel): channel is CollectionEntry<'channels'> => channel !== undefined);

  // If the source defined channels they send the message to, we need to create the channel nodes and edges
  if (sourceChannels && sourceChannels.length > 0) {
    for (const sourceChannel of sourceChannels) {
      const channel = findInMap(map, sourceChannel.id, sourceChannel.version) as CollectionEntry<'channels'>;

      if (!channel) {
        // No channel found, we just connect the source directly to the message
        edges.push(
          createEdge({
            id: generatedIdForEdge(source, message),
            source: generateIdForNode(source),
            target: messageId,
            label: getEdgeLabelForServiceAsTarget(message),
            data: { customColor: getColorFromString(message.data.id), rootSourceAndTarget },
          })
        );
        continue;
      }

      const channelId = generateIdForNode(channel);

      // Create the channel node
      nodes.push(
        createNode({
          id: channelId,
          type: channel.collection,
          data: {
            mode,
            channel: { ...channel.data, ...channel, mode, id: channel.data.id },
            contextMenu: buildContextMenuForResource({
              collection: 'channels',
              id: channel.data.id,
              version: channel.data.version,
            }),
          },
          position: { x: 0, y: 0 },
        })
      );

      // Connect the produced message to the channel
      edges.push(
        createEdge({
          id: generatedIdForEdge(message, channel),
          source: messageId,
          target: channelId,
          label: 'routes to',
          data: { customColor: getColorFromString(message.data.id), rootSourceAndTarget },
        })
      );
    }
  }

  // Now we get the consumers of the message and create nodes and edges for them
  const consumers = [
    ...getAgentConsumersOfMessage(agents, message),
    ...getConsumersOfMessage(services, message),
  ] as RoutableResource[];

  // TODO: Make this a UI Switch in the future....
  const latestConsumers = consumers.filter((consumer) => {
    const collection = consumer.collection === 'agents' ? agents : services;
    return getLatestVersionInCollectionById(collection as any, consumer.data.id) === consumer.data.version;
  });

  // Process the consumers for the message
  for (const consumer of latestConsumers) {
    const consumerId = generateIdForNode(consumer);

    // Create the consumer node
    nodes.push(
      createNode({
        id: consumerId,
        type: consumer.collection,
        data: getRoutableNodeData(consumer, mode),
        position: { x: 0, y: 0 },
      })
    );
    appendAgentToolNodesAndEdges({ agent: consumer, nodes, edges, mode });

    // Check if the consumer is consuming the message from a channel
    const consumerConfigurationForMessage = consumer.data.receives?.find(
      (receive) => receive.id === message.data.id && versionMatches(receive.version, message.data.version)
    );
    const consumerChannelConfiguration = consumerConfigurationForMessage?.from ?? [];

    const consumerHasChannels = consumerChannelConfiguration.length > 0;
    const producerHasChannels = hydratedChannelsFromSourceToMessage.length > 0;

    // If the consumer and producer have no channels defined,
    // or the consumer has no channels defined, we just connect the message to the consumer directly
    if ((!consumerHasChannels && !producerHasChannels) || !consumerHasChannels) {
      edges.push(
        createEdge({
          id: generatedIdForEdge(message, consumer),
          source: messageId,
          target: consumerId,
          label: getEdgeLabelForMessageAsSource(message),
          data: { customColor: getColorFromString(message.data.id), rootSourceAndTarget },
        })
      );
      continue;
    }

    // Process each consumer channel configuration
    for (const consumerChannel of consumerChannelConfiguration) {
      const channel = findInMap(map, consumerChannel.id, consumerChannel.version) as CollectionEntry<'channels'>;

      const edgeProps = { customColor: getColorFromString(message.data.id), rootSourceAndTarget };

      // If the channel cannot be found in EventCatalog, we just connect the message to the consumer directly
      // as a fallback, rather than just an empty node floating around
      if (!channel) {
        edges.push(
          createEdge({
            id: generatedIdForEdge(message, consumer),
            source: messageId,
            target: consumerId,
            label: 'consumes',
            data: edgeProps,
          })
        );
        continue;
      }

      // We always add the consumer channel to be rendered
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

      // If the producer does not have any channels defined, we connect the message to the consumers channel directly
      if (!producerHasChannels) {
        edges.push(
          createEdge({
            id: generatedIdForEdge(message, channel),
            source: messageId,
            target: generateIdForNode(channel),
            label: 'routes to',
            data: edgeProps,
          })
        );
        edges.push(
          createEdge({
            id: generatedIdForEdge(channel, consumer),
            source: generateIdForNode(channel),
            target: generateIdForNode(consumer),
            label: getEdgeLabelForMessageAsSource(message),
            data: {
              ...edgeProps,
              rootSourceAndTarget: {
                source: { id: generateIdForNode(message), collection: message.collection },
                target: { id: generateIdForNode(consumer), collection: consumer.collection },
              },
            },
          })
        );
        continue;
      }

      // The producer has channels defined, we need to try and work out the path the message takes to the consumer
      for (const sourceChannel of hydratedChannelsFromSourceToMessage) {
        const channelChainToRender = getChannelChain(sourceChannel, channel, channels);

        if (channelChainToRender.length > 0) {
          const { nodes: channelNodes, edges: channelEdges } = getNodesAndEdgesForChannelChain({
            source: message,
            target: consumer,
            channelChain: channelChainToRender,
            mode,
          });

          nodes.push(...channelNodes);
          edges.push(...channelEdges);
        } else {
          // No chain found, we need to connect to the message to the channel
          // And the channel to the consumer
          edges.push(
            createEdge({
              id: generatedIdForEdge(message, channel),
              source: messageId,
              target: generateIdForNode(channel),
              label: 'routes to',
              data: {
                ...edgeProps,
                rootSourceAndTarget: {
                  source: { id: generateIdForNode(message), collection: message.collection },
                  target: { id: generateIdForNode(consumer), collection: consumer.collection },
                },
              },
            })
          );
          edges.push(
            createEdge({
              id: generatedIdForEdge(channel, consumer),
              source: generateIdForNode(channel),
              target: generateIdForNode(consumer),
              label: `${getEdgeLabelForMessageAsSource(message, true)} \n ${message.data.name}`,
              data: {
                ...edgeProps,
                rootSourceAndTarget: {
                  source: { id: generateIdForNode(message), collection: message.collection },
                  target: { id: generateIdForNode(consumer), collection: consumer.collection },
                },
              },
            })
          );
        }
      }
    }
  }

  // Remove any nodes that are already in the current nodes (already on the UI)
  nodes = nodes.filter((node) => !currentNodes.find((n) => n.id === node.id));

  //  Make sure all nodes are unique
  const uniqueNodes = nodes.filter((node, index, self) => index === self.findIndex((t) => t.id === node.id));

  const uniqueEdges = edges.filter(
    (edge: any, index: number, self: any[]) => index === self.findIndex((t: any) => t.id === edge.id)
  );

  return { nodes: uniqueNodes, edges: uniqueEdges };
};
