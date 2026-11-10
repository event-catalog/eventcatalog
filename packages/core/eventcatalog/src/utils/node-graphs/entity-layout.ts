/**
 * How entity maps are laid out: ELK's force layout, each entity sized by how many properties it has.
 * Kept apart from the graph builders (which read the catalog's collections), so the catalog's entity
 * map can lay out what it shows in the browser the same way.
 */
import ELK from 'elkjs/lib/elk.bundled.js';
import { getNodeSize } from '@eventcatalog/visualiser/layout';

const elk = new ELK();

/** Places entities with ELK's force layout, sized by how many properties they have */
export const layoutEntityNodes = async (nodes: any[], edges: any[]) => {
  // Prepare ELK graph structure
  // Sized as the visualiser estimates them (a row for each property), so the catalog and the browser agree
  const elkNodes = nodes.map((node: any) => ({ id: node.id, ...getNodeSize(node) }));

  const elkEdges = edges.map((edge: any) => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }));

  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'force',
      'elk.force.iterations': '300',
      'elk.spacing.nodeNode': '45',
      'elk.spacing.componentComponent': '50',
      'elk.padding': '[top=30,left=30,bottom=30,right=30]',
      'elk.separateConnectedComponents': 'true',
    },
    children: elkNodes,
    edges: elkEdges,
  };

  // Run ELK layout
  const layoutedGraph = await elk.layout(elkGraph);

  // Apply positions to nodes
  const positionedNodes = nodes.map((node: any) => {
    const elkNode = layoutedGraph.children?.find((n: any) => n.id === node.id);
    return {
      ...node,
      position: {
        x: elkNode?.x || 0,
        y: elkNode?.y || 0,
      },
    };
  });

  return positionedNodes;
};
