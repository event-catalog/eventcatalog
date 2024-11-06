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
} from '../node-graph-utils/utils';
import { MarkerType } from 'reactflow';
import { findMatchingNodes } from '@utils/collections/util';

type DagreGraph = any;

interface Props {
  id: string;
  version: string;
  defaultFlow?: DagreGraph;
  mode?: 'simple' | 'full';
}

export const getNodesAndEdges = async ({ id, version, defaultFlow, mode = 'simple' }: Props) => {
  const flow = defaultFlow || createDagreGraph({ ranksep: 300, nodesep: 50 });
  const nodes = [] as any,
    edges = [] as any;

  const events = await getEvents();

  const event = events.find((event) => {
    return event.data.id === id && event.data.version === version;
  });

  // Nothing found...
  if (!event) {
    return {
      nodes: [],
      edges: [],
    };
  }

  const producers = (event.data.producers as CollectionEntry<'services'>[]) || [];
  const consumers = (event.data.consumers as CollectionEntry<'services'>[]) || [];
  const channels = (event.data.messageChannels as CollectionEntry<'channels'>[]) || [];

  // Track nodes that are both sent and received
  const bothSentAndReceived = findMatchingNodes(producers, consumers);

  producers.forEach((producer) => {
    nodes.push({
      id: generateIdForNode(producer),
      type: producer?.collection,
      sourcePosition: 'right',
      targetPosition: 'left',
      data: { mode, service: producer, showTarget: false },
      position: { x: 250, y: 0 },
    });

    // If the event has channels, we need to render them, otherwise connect the producer to the event
    if (event.data.channels) {
      const { nodes: channelNodes, edges: channelEdges } = getChannelNodesAndEdges({
        channels,
        channelsToRender: event.data.channels,
        source: producer,
        target: event,
        channelToTargetLabel: 'publishes event',
      });
      nodes.push(...channelNodes);
      edges.push(...channelEdges);
    } else {
      edges.push({
        id: generatedIdForEdge(producer, event),
        source: generateIdForNode(producer),
        target: generateIdForNode(event),
        type: 'smoothstep',
        label: 'publishes event',
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

  // The event itself
  nodes.push({
    id: generateIdForNode(event),
    sourcePosition: 'right',
    targetPosition: 'left',
    data: { mode, message: event, showTarget: producers.length > 0, showSource: consumers.length > 0 },
    position: { x: 0, y: 0 },
    type: event.collection,
  });

  // The messages the service sends
  consumers.forEach((consumer) => {
    nodes.push({
      id: generateIdForNode(consumer),
      sourcePosition: 'right',
      targetPosition: 'left',
      data: { title: consumer?.data.id, mode, service: consumer, showSource: false },
      position: { x: 0, y: 0 },
      type: consumer?.collection,
    });

    if (event.data.channels) {
      const { nodes: channelNodes, edges: channelEdges } = getChannelNodesAndEdges({
        channels,
        channelsToRender: channels.map((channel) => ({ id: channel.data.id, version: channel.data.version })),
        source: event,
        target: consumer,
        sourceToChannelLabel: 'sent to channel',
        channelToTargetLabel: 'subscribed by',
      });

      nodes.push(...channelNodes);
      edges.push(...channelEdges);
    } else {
      const sourceNodes = [event];
      sourceNodes.forEach((sourceNode) => {
        edges.push(
          createEdge({
            id: generatedIdForEdge(sourceNode, consumer),
            source: generateIdForNode(sourceNode),
            target: generateIdForNode(consumer),
          })
        );
      });
    }
  });

  // Handle messages that are both sent and received
  bothSentAndReceived.forEach((message) => {
    if (message) {
      edges.push(
        createEdge({
          id: generatedIdForEdge(event, message) + '-both',
          source: generateIdForNode(event),
          target: generateIdForNode(message),
          label: 'publishes and subscribes',
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
    edges: edges,
  };
};
