import { getQueries } from '@utils/queries';
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

  const queries = await getQueries();

  const query = queries.find((query) => query.data.id === id && query.data.version === version);

  // Nothing found...
  if (!query) {
    return {
      nodes: [],
      edges: [],
    };
  }

  const producers = (query.data.producers as CollectionEntry<'services'>[]) || [];
  const consumers = (query.data.consumers as CollectionEntry<'services'>[]) || [];

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
        id: generatedIdForEdge(producer, query),
        source: generateIdForNode(producer),
        target: generateIdForNode(query),
        type: 'smoothstep',
        label: 'requests',
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

  // The query itself
  nodes.push({
    id: generateIdForNode(query),
    sourcePosition: 'right',
    targetPosition: 'left',
    data: { mode, message: query, showTarget: producers.length > 0, showSource: consumers.length > 0 },
    position: { x: 0, y: 0 },
    type: query.collection,
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
      id: generatedIdForEdge(query, consumer),
      source: generateIdForNode(query),
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
