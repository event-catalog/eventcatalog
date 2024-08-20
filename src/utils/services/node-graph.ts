// import { getColor } from '@utils/colors';
import { getCollection, type CollectionEntry } from 'astro:content';
import dagre from 'dagre';
import { createDagreGraph, generateIdForNode, generatedIdForEdge, calculatedNodes } from '@utils/node-graph-utils/utils';
import { MarkerType } from 'reactflow';
import { getVersionFromCollection } from '@utils/versions/versions';

type DagreGraph = any;

interface Props {
  id: string;
  version: string;
  defaultFlow?: DagreGraph;
  mode?: 'simple' | 'full';
  renderAllEdges?: boolean;
}

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

  const messages = [...events, ...commands];

  const receivesHydrated = receivesRaw
    .map((message) => getVersionFromCollection(messages, message.id, message.version))
    .flat()
    .filter((e) => e !== undefined);

  const sendsHydrated = sendsRaw
    .map((message) => getVersionFromCollection(messages, message.id, message.version))
    .flat()
    .filter((e) => e !== undefined);

  const receives = (receivesHydrated as CollectionEntry<'events' | 'commands'>[]) || [];
  const sends = (sendsHydrated as CollectionEntry<'events' | 'commands'>[]) || [];

  // Get all the data from them

  if (receives && receives.length > 0) {
    //All the messages the service receives
    receives.forEach((receive, index) => {
      nodes.push({
        id: generateIdForNode(receive),
        type: receive?.collection,
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode, message: receive, showTarget: renderAllEdges },
        position: { x: 250, y: 0 },
      });
      edges.push({
        id: generatedIdForEdge(receive, service),
        source: generateIdForNode(receive),
        target: generateIdForNode(service),
        type: 'smoothstep',
        label: receive?.collection === 'events' ? 'receives event' : 'accepts',
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
  sends.forEach((send) => {
    nodes.push({
      id: generateIdForNode(send),
      sourcePosition: 'right',
      targetPosition: 'left',
      data: { mode, message: send, showSource: renderAllEdges },
      position: { x: 0, y: 0 },
      type: send?.collection,
    });
    edges.push({
      id: generatedIdForEdge(service, send),
      source: generateIdForNode(service),
      target: generateIdForNode(send),
      type: 'smoothstep',
      label: send?.collection === 'events' ? 'publishes event' : 'invokes command',
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
