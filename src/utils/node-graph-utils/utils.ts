import type { CollectionEntry } from 'astro:content';
import type { Node } from 'reactflow';
import dagre from 'dagre';

type DagreGraph = any;

export const generateIdForNode = (node: CollectionEntry<'events' | 'services' | 'commands'>) => {
  return `${node.data.id}-${node.data.version}`;
};

export const generatedIdForEdge = (
  source: CollectionEntry<'events' | 'services' | 'commands'>,
  target: CollectionEntry<'events' | 'services' | 'commands'>
) => {
  return `${source.data.id}-${source.data.version}-${target.data.id}-${target.data.version}`;
};

export const calculatedNodes = (flow: dagre.graphlib.Graph, nodes: Node[]) => {
  return nodes.map((node: any) => {
    const { x, y } = flow.node(node.id);
    return { ...node, position: { x, y } };
  });
};

// Creates a new dagre graph
export const createDagreGraph = ({ ranksep = 180, nodesep = 50 }: any) => {
  const graph = new dagre.graphlib.Graph({ compound: true });
  graph.setGraph({ rankdir: 'LR', ranksep, nodesep });
  graph.setDefaultEdgeLabel(() => ({}));
  return graph;
};
