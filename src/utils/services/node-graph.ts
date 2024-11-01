import { getCollection, type CollectionEntry } from 'astro:content';
import dagre from 'dagre';
import { createDagreGraph, generateIdForNode, generatedIdForEdge, calculatedNodes } from '@utils/node-graph-utils/utils';
import { findMatchingNodes, getItemsFromCollectionByIdAndSemverOrLatest } from '@utils/collections/util';
import { MarkerType } from 'reactflow';

type DagreGraph = any;

interface Props {
  id: string;
  version: string;
  defaultFlow?: DagreGraph;
  mode?: 'simple' | 'full';
  renderAllEdges?: boolean;
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

export const getNodesAndEdges = async ({ id, defaultFlow, version, mode = 'simple', renderAllEdges = false }: Props) => {
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

  const messages = [...events, ...commands, ...queries];

  const receivesHydrated = receivesRaw
    .map((message) => getItemsFromCollectionByIdAndSemverOrLatest(messages, message.id, message.version))
    .flat()
    .filter((e) => e !== undefined);

  const sendsHydrated = sendsRaw
    .map((message) => getItemsFromCollectionByIdAndSemverOrLatest(messages, message.id, message.version))
    .flat()
    .filter((e) => e !== undefined);

  const receives = (receivesHydrated as CollectionEntry<'events' | 'commands' | 'queries'>[]) || [];
  const sends = (sendsHydrated as CollectionEntry<'events' | 'commands' | 'queries'>[]) || [];

  // Track messages that are both sent and received
  const bothSentAndReceived = findMatchingNodes(receives, sends);

  // Get all the data from them
  if (receives && receives.length > 0) {
    // All the messages the service receives
    receives.forEach((receive, index) => {
      nodes.push({
        id: generateIdForNode(receive),
        type: receive?.collection,
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode, message: receive, showTarget: renderAllEdges },
        position: { x: 250, y: index * 100 },
      });
      edges.push({
        id: generatedIdForEdge(receive, service),
        source: generateIdForNode(receive),
        target: generateIdForNode(service),
        type: 'smoothstep',
        label: getReceivesMessageByMessageType(receive?.collection),
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
    });
  }

  // The service itself
  nodes.push({
    id: generateIdForNode(service),
    sourcePosition: 'right',
    targetPosition: 'left',
    data: { mode, service: service, showSource: sends.length > 0, showTarget: receives.length > 0 },
    position: { x: 0, y: 0 },
    type: service.collection,
  });

  // The messages the service sends
  sends.forEach((send, index) => {
    nodes.push({
      id: generateIdForNode(send),
      sourcePosition: 'right',
      targetPosition: 'left',
      data: { mode, message: send, showSource: renderAllEdges },
      position: { x: 500, y: index * 100 },
      type: send?.collection,
    });
    edges.push({
      id: generatedIdForEdge(service, send),
      source: generateIdForNode(service),
      target: generateIdForNode(send),
      type: 'smoothstep',
      label: getSendsMessageByMessageType(send?.collection),
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
  });

  // Handle messages that are both sent and received
  bothSentAndReceived.forEach((message) => {
    if (message) {
      edges.push({
        id: generatedIdForEdge(service, message) + '-both',
        source: generateIdForNode(service),
        target: generateIdForNode(message),
        type: 'smoothstep',
        label: `${getSendsMessageByMessageType(message?.collection)} & ${getReceivesMessageByMessageType(message?.collection)}`,
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
    edges: edges,
  };
};
