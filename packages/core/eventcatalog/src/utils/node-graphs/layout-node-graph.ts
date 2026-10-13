import { hideMessageNodes, layoutWithElk } from '@eventcatalog/visualiser/layout';
import { isSSR } from '@utils/feature';

type Graph = { nodes: any[]; edges: any[] };

// A build renders one route at a time (every message's docs page, then every schema page), so the
// cache has to outlast a whole route to be reused. A server keeps running as the catalog changes and
// renders pages as they're asked for, so it keeps the most recent layouts only.
const MAX_CACHED_LAYOUTS = isSSR() ? 200 : 5000;
const layouts = new Map<string, ReturnType<typeof layoutWithElk>>();

/**
 * Lays a node graph out for the visualiser (with ELK, left to right). Builders
 * create their nodes and edges without positions and lay the finished graph
 * out once with this. Nodes get top-left positions (`origin: [0, 0]`), groups
 * (nodes with children) are sized to fit them, and edges get the route they're
 * drawn along (`data.route`), with room for their labels.
 */
export const layoutNodeGraph = async <G extends Graph>(graph: G): Promise<G> => {
  // A build lays the same graph out on several pages (a message's docs, visualiser and schema pages):
  // reuse the layout. Each caller gets its own copy, so it can't change the one kept.
  const key = JSON.stringify(graph);
  let layout = layouts.get(key);
  if (!layout) {
    layout = layoutWithElk(graph);
    layouts.set(key, layout);
    layout.catch(() => layouts.delete(key));
    if (layouts.size > MAX_CACHED_LAYOUTS) layouts.delete(layouts.keys().next().value!);
  }
  return structuredClone(await layout) as unknown as G;
};

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
