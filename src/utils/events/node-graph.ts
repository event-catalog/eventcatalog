// import { getColor } from '@utils/colors';
import { getEvents } from '@utils/events';
import type { CollectionEntry } from 'astro:content';
import dagre from 'dagre';
import { calculatedNodes, createDagreGraph, generatedIdForEdge, generateIdForNode } from '../node-graph-utils/utils';
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

  const events = await getEvents();

  const event = events.find((event) => event.data.id === id && event.data.version === version);

  // Nothing found...
  if (!event) {
    return {
      nodes: [],
      edges: [],
    };
  }

  const producers = (event.data.producers as CollectionEntry<'services'>[]) || [];
  const consumers = (event.data.consumers as CollectionEntry<'services'>[]) || [];

  if (producers && producers.length > 0) {
    producers.forEach((producer) => {
      nodes.push({
        id: generateIdForNode(producer),
        type: producer?.collection,
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode, service: producer, showTarget: false },
        position: { x: 250, y: 0 },
      });
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
    });
  }

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
    edges.push({
      id: generatedIdForEdge(event, consumer),
      source: generateIdForNode(event),
      target: generateIdForNode(consumer),
      type: 'smoothstep',
      label: 'subscribed by',
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
