// import { getColor } from '@utils/colors';
import { getCollection } from 'astro:content';
import dagre from 'dagre';
import { getNodesAndEdges as getServicesNodeAndEdges } from '../services/node-graph';

type DagreGraph = any;

// Creates a new dagre graph
export const getDagreGraph = () => {
  const graph = new dagre.graphlib.Graph({ compound: true });
  graph.setGraph({ rankdir: 'LR', ranksep: 200, nodesep: 200 });
  graph.setDefaultEdgeLabel(() => ({}));
  return graph;
};

interface Props {
  id: string;
  version: string;
  defaultFlow?: DagreGraph;
  mode?: 'simple' | 'full';
}

export const getNodesAndEdges = async ({ id, version, defaultFlow, mode = 'simple' }: Props) => {
  const flow = defaultFlow || getDagreGraph();
  let nodes = [] as any,
    edges = [] as any;

  const domains = await getCollection('domains');

  const domain = domains.find((domain) => domain.data.id === id && domain.data.version === version);

  // Nothing found...
  if (!domain) {
    return {
      nodes: [],
      edges: [],
    };
  }

  const rawServices = domain?.data.services || [];

  // Get all the nodes for everyhing

  for (const service of rawServices) {
    const { nodes: serviceNodes, edges: serviceEdges } = await getServicesNodeAndEdges({
      id: service.id,
      version: service.version,
      defaultFlow: flow,
      mode,
      renderAllEdges: true,
    });
    nodes = [...nodes, ...serviceNodes];
    edges = [...edges, ...serviceEdges];
  }

  return {
    nodes: nodes,
    edges: edges,
  };
};
