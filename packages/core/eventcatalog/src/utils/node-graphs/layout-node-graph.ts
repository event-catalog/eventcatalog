import { hideMessageNodes, layoutWithElk } from '@eventcatalog/visualiser/layout';

type Graph = { nodes: any[]; edges: any[] };

/**
 * Lays a node graph out for the visualiser (with ELK, left to right). Builders
 * create their nodes and edges without positions and lay the finished graph
 * out once with this. Nodes get top-left positions (`origin: [0, 0]`), groups
 * (nodes with children) are sized to fit them, and edges get the route they're
 * drawn along (`data.route`), with room for their labels.
 */
export const layoutNodeGraph = async <G extends Graph>(graph: G): Promise<G> => (await layoutWithElk(graph)) as unknown as G;

/**
 * Lays out the graphs of a levels page: level 1 (`overview`: domains, systems
 * and their relationships), level 3 (the detailed graph, with messages and
 * channels) and level 2 in between, the detailed graph with its messages and
 * channels hidden (`hiddenMessages`), so the browser doesn't have to lay it out
 * again. Without an overview there's no level 1.
 */
export const layoutLevels = async (detailed: Graph, overview?: Graph) => {
  const [laidOut, laidOutOverview, hiddenMessages] = await Promise.all([
    layoutNodeGraph(detailed),
    overview && layoutNodeGraph(overview),
    layoutNodeGraph(hideMessageNodes(detailed.nodes, detailed.edges)),
  ]);
  return { ...laidOut, overview: laidOutOverview, hiddenMessages };
};
