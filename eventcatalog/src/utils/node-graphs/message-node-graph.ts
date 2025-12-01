// import { getColor } from '@utils/colors';
import { getEvents } from '@utils/events';
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
} from './utils/utils';
import { MarkerType, type Node, type Edge } from '@xyflow/react';
import {
  findMatchingNodes,
  getItemsFromCollectionByIdAndSemverOrLatest,
  getLatestVersionInCollectionById,
} from '@utils/collections/util';
import type { CollectionMessageTypes } from '@types';
import { getCommands } from '@utils/commands';
import { getQueries } from '@utils/queries';
import { createNode } from './utils/utils';
import { getConsumersOfMessage, getProducersOfMessage } from '@utils/collections/services';
import { getNodesAndEdgesForChannelChain } from './channel-node-graph';
import { getChannelChain, isChannelsConnected } from '@utils/channels';
import { getChannels } from '@utils/channels';

type DagreGraph = any;

interface Props {
  id: string;
  version: string;
  defaultFlow?: DagreGraph;
  mode?: 'simple' | 'full';
  channelRenderMode?: 'flat' | 'single';
  collection?: CollectionEntry<CollectionMessageTypes>[];
  channels?: CollectionEntry<'channels'>[];
}

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

  // We always render the message itself
  nodes.push({
    id: generateIdForNode(message),
    sourcePosition: 'right',
    targetPosition: 'left',
    data: {
      mode,
      message: {
        ...message.data,
      },
    },
    position: { x: 0, y: 0 },
    type: message.collection,
  });

  const producers = (message.data.producers as CollectionEntry<'services'>[]) || [];
  const consumers = (message.data.consumers as CollectionEntry<'services'>[]) || [];

  // Track nodes that are both sent and received
  const bothSentAndReceived = findMatchingNodes(producers, consumers);

  for (const producer of producers) {
    // Create the producer node
    nodes.push({
      id: generateIdForNode(producer),
      type: producer?.collection,
      sourcePosition: 'right',
      targetPosition: 'left',
      data: { mode, service: { ...producer.data } },
      position: { x: 250, y: 0 },
    });

    // Is the producer sending this message to a channel?
    const producerConfigurationForMessage = producer.data.sends?.find((send) => send.id === message.data.id);
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
          width: 40,
          height: 40,
        },
      });
      continue;
    }

    // If the producer has channels defined, we need to render them
    for (const producerChannel of producerChannelConfiguration) {
      const channel = getItemsFromCollectionByIdAndSemverOrLatest(
        channels,
        producerChannel.id,
        producerChannel.version
      )[0] as CollectionEntry<'channels'>;

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
          data: { mode, channel: { ...channel.data } },
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

  // The messages the service sends
  for (const consumer of consumers) {
    // Render the consumer node
    nodes.push({
      id: generateIdForNode(consumer),
      sourcePosition: 'right',
      targetPosition: 'left',
      data: { title: consumer?.data.id, mode, service: { ...consumer.data } },
      position: { x: 0, y: 0 },
      type: consumer?.collection,
    });

    // Is the consumer receiving this message from a channel?
    const consumerConfigurationForMessage = consumer.data.receives?.find((receive) => receive.id === message.data.id);
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
      const channel = getItemsFromCollectionByIdAndSemverOrLatest(
        channels,
        consumerChannel.id,
        consumerChannel.version
      )[0] as CollectionEntry<'channels'>;

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
      const producerChannels = producers
        .map((producer) => producer.data.sends?.find((send) => send.id === message.data.id)?.to ?? [])
        .flat();
      const consumerChannels = consumer.data.receives?.find((receive) => receive.id === message.data.id)?.from ?? [];

      for (const producerChannel of producerChannels) {
        const producerChannelValue = getItemsFromCollectionByIdAndSemverOrLatest(
          channels,
          producerChannel.id,
          producerChannel.version
        )[0] as CollectionEntry<'channels'>;

        for (const consumerChannel of consumerChannels) {
          const consumerChannelValue = getItemsFromCollectionByIdAndSemverOrLatest(
            channels,
            consumerChannel.id,
            consumerChannel.version
          )[0] as CollectionEntry<'channels'>;
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
    flow.setNode(node.id, { width: 150, height: 100 });
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
  const queries = await getQueries();
  const channels = await getChannels();
  return getNodesAndEdges({ id, version, defaultFlow, mode, channelRenderMode, collection: queries, channels });
};

export const getNodesAndEdgesForCommands = async ({
  id,
  version,
  defaultFlow,
  mode = 'simple',
  channelRenderMode = 'flat',
}: Props) => {
  const commands = await getCommands();
  const channels = await getChannels();
  return getNodesAndEdges({ id, version, defaultFlow, mode, channelRenderMode, collection: commands, channels });
};

export const getNodesAndEdgesForEvents = async ({
  id,
  version,
  defaultFlow,
  mode = 'simple',
  channelRenderMode = 'flat',
}: Props) => {
  const events = await getEvents();
  const channels = await getChannels();
  return getNodesAndEdges({ id, version, defaultFlow, mode, channelRenderMode, collection: events, channels });
};

export const getNodesAndEdgesForConsumedMessage = ({
  message,
  targetChannels = [],
  services,
  channels,
  currentNodes = [],
  target,
  mode = 'simple',
}: {
  message: CollectionEntry<CollectionMessageTypes>;
  targetChannels?: { id: string; version: string }[];
  services: CollectionEntry<'services'>[];
  channels: CollectionEntry<'channels'>[];
  currentNodes: Node[];
  target: CollectionEntry<'services'>;
  mode?: 'simple' | 'full';
}) => {
  let nodes = [] as Node[],
    edges = [] as any;

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
      data: { mode, message: { ...message.data } },
      position: { x: 0, y: 0 },
    })
  );

  // Render the target node
  nodes.push(
    createNode({
      id: generateIdForNode(target),
      type: target.collection,
      data: { mode, service: { ...target.data } },
      position: { x: 0, y: 0 },
    })
  );

  const targetMessageConfiguration = target.data.receives?.find((receive) => receive.id === message.data.id);
  const channelsFromMessageToTarget = targetMessageConfiguration?.from ?? [];
  const hydratedChannelsFromMessageToTarget = channelsFromMessageToTarget
    .map((channel) => getItemsFromCollectionByIdAndSemverOrLatest(channels, channel.id, channel.version)[0])
    .filter((channel) => channel !== undefined);

  // Now we get the producers of the message and create nodes and edges for them
  const producers = getProducersOfMessage(services, message);

  const hasProducers = producers.length > 0;
  const targetHasDefinedChannels = targetChannels.length > 0;

  const isMessageEvent = message.collection === 'events';

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
      const channel = getItemsFromCollectionByIdAndSemverOrLatest(
        channels,
        targetChannel.id,
        targetChannel.version
      )[0] as CollectionEntry<'channels'>;

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
          data: { mode, channel: { ...channel.data, ...channel, id: channel.data.id } },
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
        const isEvent = message.collection === 'events';

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
        data: { mode, service: { ...producer.data } },
        position: { x: 0, y: 0 },
      })
    );

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
    const producerConfigurationForMessage = producer.data.sends?.find((send) => send.id === message.data.id);
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
      const channel = getItemsFromCollectionByIdAndSemverOrLatest(
        channels,
        producerChannel.id,
        producerChannel.version
      )[0] as CollectionEntry<'channels'>;

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
  channels,
  currentNodes = [],
  currentEdges = [],
  source,
  mode = 'simple',
}: {
  message: CollectionEntry<CollectionMessageTypes>;
  sourceChannels?: { id: string; version: string }[];
  services: CollectionEntry<'services'>[];
  channels: CollectionEntry<'channels'>[];
  currentNodes: Node[];
  currentEdges: Edge[];
  source: CollectionEntry<'services'>;
  mode?: 'simple' | 'full';
}) => {
  let nodes = [] as Node[],
    edges = [] as any;

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
      data: { mode, message: { ...message.data } },
      position: { x: 0, y: 0 },
    })
  );

  // Render the producer node
  nodes.push(
    createNode({
      id: generateIdForNode(source),
      type: source.collection,
      data: { mode, service: { ...source.data } },
      position: { x: 0, y: 0 },
    })
  );

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

  const sourceMessageConfiguration = source.data.sends?.find((send) => send.id === message.data.id);
  const channelsFromSourceToMessage = sourceMessageConfiguration?.to ?? [];

  const hydratedChannelsFromSourceToMessage = channelsFromSourceToMessage
    .map((channel) => getItemsFromCollectionByIdAndSemverOrLatest(channels, channel.id, channel.version)[0])
    .filter((channel) => channel !== undefined);

  // If the source defined channels they send the message to, we need to create the channel nodes and edges
  if (sourceChannels && sourceChannels.length > 0) {
    for (const sourceChannel of sourceChannels) {
      const channel = getItemsFromCollectionByIdAndSemverOrLatest(
        channels,
        sourceChannel.id,
        sourceChannel.version
      )[0] as CollectionEntry<'channels'>;

      if (!channel) {
        // No channel found, we just connect the message to the source directly
        edges.push(
          createEdge({
            id: generatedIdForEdge(message, source),
            source: messageId,
            target: generateIdForNode(source),
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
          data: { mode, channel: { ...channel.data, ...channel, mode, id: channel.data.id } },
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

  // Now we get the producers of the message and create nodes and edges for them
  const consumers = getConsumersOfMessage(services, message);

  // TODO: Make this a UI Switch in the future....
  const latestConsumers = consumers.filter(
    (consumer) => getLatestVersionInCollectionById(services, consumer.data.id) === consumer.data.version
  );

  // Process the consumers for the message
  for (const consumer of latestConsumers) {
    const consumerId = generateIdForNode(consumer);

    // Create the consumer node
    nodes.push(
      createNode({
        id: consumerId,
        type: consumer.collection,
        data: { mode, service: { ...consumer.data } },
        position: { x: 0, y: 0 },
      })
    );

    // Check if the consumer is consuming the message from a channel
    const consumerConfigurationForMessage = consumer.data.receives?.find((receive) => receive.id === message.data.id);
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
      const channel = getItemsFromCollectionByIdAndSemverOrLatest(
        channels,
        consumerChannel.id,
        consumerChannel.version
      )[0] as CollectionEntry<'channels'>;

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
          data: { mode, channel: { ...channel.data, ...channel } },
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
