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
  getChannelNodesAndEdges,
  getEdgeLabelForMessageAsSource,
  getEdgeLabelForServiceAsTarget,
} from './utils/utils';
import { MarkerType } from '@xyflow/react';
import { findMatchingNodes } from '@utils/collections/util';
import type { CollectionMessageTypes } from '@types';
import { getCommands } from '@utils/commands';
import { getQueries } from '@utils/queries';

type DagreGraph = any;

interface Props {
  id: string;
  version: string;
  defaultFlow?: DagreGraph;
  mode?: 'simple' | 'full';
  collection?: CollectionEntry<CollectionMessageTypes>[];
}

const getNodesAndEdges = async ({ id, version, defaultFlow, mode = 'simple', collection = [] }: Props) => {
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

  const producers = (message.data.producers as CollectionEntry<'services'>[]) || [];
  const consumers = (message.data.consumers as CollectionEntry<'services'>[]) || [];
  const channels = (message.data.messageChannels as CollectionEntry<'channels'>[]) || [];

  // Track nodes that are both sent and received
  const bothSentAndReceived = findMatchingNodes(producers, consumers);

  producers.forEach((producer) => {
    nodes.push({
      id: generateIdForNode(producer),
      type: producer?.collection,
      sourcePosition: 'right',
      targetPosition: 'left',
      data: { mode, service: producer },
      position: { x: 250, y: 0 },
    });

    // If the event has channels, we need to render them, otherwise connect the producer to the event
    if (message.data.channels) {
      const { nodes: channelNodes, edges: channelEdges } = getChannelNodesAndEdges({
        channels,
        channelsToRender: message.data.channels,
        source: producer,
        target: message,
        sourceToChannelLabel: getEdgeLabelForServiceAsTarget(message),
        channelToTargetLabel: getEdgeLabelForServiceAsTarget(message),
        mode,
        currentNodes: nodes,
      });
      nodes.push(...channelNodes);
      edges.push(...channelEdges);
    } else {
      edges.push({
        id: generatedIdForEdge(producer, message),
        source: generateIdForNode(producer),
        target: generateIdForNode(message),
        label: getEdgeLabelForServiceAsTarget(message),
        data: { message },
        animated: false,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 40,
          height: 40,
        },
        style: {
          strokeWidth: 1,
        },
      });
    }
  });

  // The message itself
  nodes.push({
    id: generateIdForNode(message),
    sourcePosition: 'right',
    targetPosition: 'left',
    data: { mode, message: message },
    position: { x: 0, y: 0 },
    type: message.collection,
  });

  // The messages the service sends
  consumers.forEach((consumer) => {
    nodes.push({
      id: generateIdForNode(consumer),
      sourcePosition: 'right',
      targetPosition: 'left',
      data: { title: consumer?.data.id, mode, service: consumer },
      position: { x: 0, y: 0 },
      type: consumer?.collection,
    });

    if (message.data.channels) {
      const { nodes: channelNodes, edges: channelEdges } = getChannelNodesAndEdges({
        channels,
        channelsToRender: channels.map((channel) => ({ id: channel.data.id, version: channel.data.version })),
        source: message,
        target: consumer,
        channelToTargetLabel: getEdgeLabelForMessageAsSource(message),
        mode,
        currentNodes: nodes,
      });

      nodes.push(...channelNodes);
      edges.push(...channelEdges);
    } else {
      edges.push(
        createEdge({
          id: generatedIdForEdge(message, consumer),
          source: generateIdForNode(message),
          target: generateIdForNode(consumer),
          label: getEdgeLabelForMessageAsSource(message),
          data: { message },
        })
      );
    }
  });

  // Handle messages that are both sent and received
  bothSentAndReceived.forEach((_message) => {
    if (message) {
      edges.push(
        createEdge({
          id: generatedIdForEdge(message, _message) + '-both',
          source: generateIdForNode(message),
          target: generateIdForNode(_message),
          label: 'publishes and subscribes',
          data: { message },
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

export const getNodesAndEdgesForQueries = async ({ id, version, defaultFlow, mode = 'simple' }: Props) => {
  const queries = await getQueries();
  return getNodesAndEdges({ id, version, defaultFlow, mode, collection: queries });
};

export const getNodesAndEdgesForCommands = async ({ id, version, defaultFlow, mode = 'simple' }: Props) => {
  const commands = await getCommands();
  return getNodesAndEdges({ id, version, defaultFlow, mode, collection: commands });
};

export const getNodesAndEdgesForEvents = async ({ id, version, defaultFlow, mode = 'simple' }: Props) => {
  const events = await getEvents();
  return getNodesAndEdges({ id, version, defaultFlow, mode, collection: events });
};
