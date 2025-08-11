import { getCollection, type CollectionEntry } from 'astro:content';
import dagre from 'dagre';
import {
  createDagreGraph,
  generateIdForNode,
  generatedIdForEdge,
  calculatedNodes,
  createEdge,
  getChannelNodesAndEdges,
} from '@utils/node-graphs/utils/utils';
import { findMatchingNodes, getItemsFromCollectionByIdAndSemverOrLatest } from '@utils/collections/util';
import { MarkerType } from '@xyflow/react';
import type { CollectionMessageTypes } from '@types';

type DagreGraph = any;

interface Props {
  id: string;
  version: string;
  defaultFlow?: DagreGraph;
  mode?: 'simple' | 'full';
  renderAllEdges?: boolean;
  channelRenderMode?: 'single' | 'flat';
}

const getSendsMessageByMessageType = (messageType: string) => {
  switch (messageType) {
    case 'events':
      return 'publishes event';
    case 'commands':
      return 'invokes command';
    case 'queries':
      return 'requests';
    default:
      return 'invokes message';
  }
};

const getReceivesMessageByMessageType = (messageType: string) => {
  switch (messageType) {
    case 'events':
      return 'receives event';
    case 'commands':
    case 'queries':
      return 'accepts';
    default:
      return 'accepts message';
  }
};

export const getNodesAndEdges = async ({
  id,
  defaultFlow,
  version,
  mode = 'simple',
  renderAllEdges = false,
  channelRenderMode = 'flat',
}: Props) => {
  const flow = defaultFlow || createDagreGraph({ ranksep: 300, nodesep: 50 });
  const nodes = [] as any,
    edges = [] as any;

  const services = await getCollection('services');

  const service = services.find((service) => service.data.id === id && service.data.version === version);

  // Nothing found...
  if (!service) {
    return {
      nodes: [],
      edges: [],
    };
  }

  const receivesRaw = service?.data.receives || [];
  const sendsRaw = service?.data.sends || [];

  const events = await getCollection('events');
  const commands = await getCollection('commands');
  const queries = await getCollection('queries');
  const channels = await getCollection('channels');

  const messages = [...events, ...commands, ...queries];

  const receivesHydrated = receivesRaw
    .map((message) => getItemsFromCollectionByIdAndSemverOrLatest(messages, message.id, message.version))
    .flat()
    .filter((e) => e !== undefined);

  const sendsHydrated = sendsRaw
    .map((message) => getItemsFromCollectionByIdAndSemverOrLatest(messages, message.id, message.version))
    .flat()
    .filter((e) => e !== undefined);

  const receives = (receivesHydrated as CollectionEntry<CollectionMessageTypes>[]) || [];
  const sends = (sendsHydrated as CollectionEntry<CollectionMessageTypes>[]) || [];

  // Track messages that are both sent and received
  const bothSentAndReceived = findMatchingNodes(receives, sends);

  // All the messages the service receives
  receives.forEach((receive) => {
    // Create the node for the message
    nodes.push({
      id: generateIdForNode(receive),
      type: receive?.collection,
      sourcePosition: 'right',
      targetPosition: 'left',
      data: { mode, message: { ...receive.data } },
    });

    // does the message have channels defined?
    if (receive.data.channels) {
      const { nodes: channelNodes, edges: channelEdges } = getChannelNodesAndEdges({
        channels,
        channelsToRender: receive.data.channels,
        source: receive,
        channelToTargetLabel: getReceivesMessageByMessageType(receive?.collection),
        target: service,
        mode,
        currentNodes: nodes,
        channelRenderMode,
      });

      nodes.push(...channelNodes);
      edges.push(...channelEdges);
    } else {
      // No channels, just link the message to the service
      edges.push(
        createEdge({
          id: generatedIdForEdge(receive, service),
          source: generateIdForNode(receive),
          target: generateIdForNode(service),
          label: getReceivesMessageByMessageType(receive?.collection),
          data: { message: { ...receive.data } },
        })
      );
    }
  });

  // The service itself
  nodes.push({
    id: generateIdForNode(service),
    sourcePosition: 'right',
    targetPosition: 'left',
    // data: { mode, service: { ...service, ...service.data } },
    data: { mode, service: { ...service.data } },
    type: service.collection,
  });

  // The messages the service sends
  sends.forEach((send, index) => {
    nodes.push({
      id: generateIdForNode(send),
      sourcePosition: 'right',
      targetPosition: 'left',
      data: { mode, message: { ...send.data } },
      type: send?.collection,
    });

    if (send.data.channels) {
      const { nodes: channelNodes, edges: channelEdges } = getChannelNodesAndEdges({
        channels,
        channelsToRender: send.data.channels,
        source: service,
        target: send,
        mode,
        sourceToChannelLabel: `${getSendsMessageByMessageType(send?.collection)}`,
        channelToTargetLabel: getSendsMessageByMessageType(send?.collection),
        currentNodes: nodes,
        channelRenderMode,
      });
      nodes.push(...channelNodes);
      edges.push(...channelEdges);
    } else {
      // No channels, just link the message to the service
      edges.push(
        createEdge({
          id: generatedIdForEdge(service, send),
          source: generateIdForNode(service),
          target: generateIdForNode(send),
          label: getSendsMessageByMessageType(send?.collection),
          data: { message: { ...send.data } },
        })
      );
    }
  });

  // Handle messages that are both sent and received
  bothSentAndReceived.forEach((message) => {
    if (message) {
      edges.push({
        id: generatedIdForEdge(service, message) + '-both',
        source: generateIdForNode(service),
        target: generateIdForNode(message),
        label: `${getSendsMessageByMessageType(message?.collection)} & ${getReceivesMessageByMessageType(message?.collection)}`,
        animated: false,
        data: { message: { ...message.data } },
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

  nodes.forEach((node: any) => {
    flow.setNode(node.id, { width: 150, height: 100 });
  });

  edges.forEach((edge: any) => {
    flow.setEdge(edge.source, edge.target);
  });

  // Render the diagram in memory getting the X and Y
  dagre.layout(flow);

  return {
    nodes: calculatedNodes(flow, nodes),
    edges,
  };
};
