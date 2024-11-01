import { findMatchingNodes } from '@utils/collections/util';
import { getCommands } from '@utils/commands';
import { calculatedNodes, createDagreGraph, generateIdForNode, generatedIdForEdge } from '@utils/node-graph-utils/utils';
import { type CollectionEntry } from 'astro:content';
import dagre from 'dagre';
import { MarkerType } from 'reactflow';

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

  const commands = await getCommands();

  const command = commands.find((command) => command.data.id === id && command.data.version === version);

  // Nothing found...
  if (!command) {
    return {
      nodes: [],
      edges: [],
    };
  }

  const producers = (command.data.producers as CollectionEntry<'services'>[]) || [];
  const consumers = (command.data.consumers as CollectionEntry<'services'>[]) || [];

  // Track nodes that are both sent and received
  const bothSentAndReceived = findMatchingNodes(producers, consumers);

  if (producers && producers.length > 0) {
    producers.forEach((producer, index) => {
      nodes.push({
        id: generateIdForNode(producer),
        type: producer?.collection,
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode, service: producer },
        position: { x: 250, y: 0 },
      });
      edges.push({
        id: generatedIdForEdge(producer, command),
        source: generateIdForNode(producer),
        target: generateIdForNode(command),
        type: 'smoothstep',
        label: 'invokes',
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
    id: generateIdForNode(command),
    sourcePosition: 'right',
    targetPosition: 'left',
    data: { mode, message: command },
    position: { x: 0, y: 0 },
    type: command.collection,
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
    edges.push({
      id: generatedIdForEdge(command, consumer),
      source: generateIdForNode(command),
      target: generateIdForNode(consumer),
      type: 'smoothstep',
      label: 'accepts',
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

  // Handle nodes that are both sent and received
  bothSentAndReceived.forEach((message) => {
    if (message) {
      edges.push({
        id: generatedIdForEdge(command, message) + '-both',
        source: generateIdForNode(command),
        target: generateIdForNode(message),
        type: 'smoothstep',
        label: `publishes and subscribes`,
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

  // Render the diagram in memory getting hte X and Y
  dagre.layout(flow);

  return {
    nodes: calculatedNodes(flow, nodes),
    edges: edges,
  };
};
