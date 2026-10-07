import type { Edge, Node, XYPosition } from '@xyflow/react';
import { layoutWithElk } from '@eventcatalog/visualiser/layout';
import { isGroupType } from './node-types';

/**
 * Lays a canvas out with the same ELK layout as EventCatalog's visualiser (left to right, edges routed
 * around nodes, containers laid out with what's in them and sized to fit). Nodes are sized as rendered when
 * they have been (in the browser), or by their type.
 */
export const layoutGraph = (nodes: Node[], edges: Edge[]) => layoutWithElk({ nodes, edges });

/** The layout sizes containers with style.width/height; the canvas sizes them with width/height */
export const withGroupSizes = (nodes: Node[]) =>
  nodes.map((node) => {
    const { width, height, ...style } = node.style ?? {};
    if (typeof width !== 'number' || typeof height !== 'number') return node;
    return { ...node, width, height, style };
  });

export type LayoutResult = Map<string, { position: XYPosition; size?: { width: number; height: number } }>;

/**
 * New positions (relative to their container, if they're in one) for the nodes on a canvas, and new sizes for
 * containers. Only these are kept for the canvas people edit: the edge routes ELK draws would be out of date
 * as soon as someone moves a node.
 */
export const getLayoutPositions = async (nodes: Node[], edges: Edge[]): Promise<LayoutResult> => {
  if (nodes.length === 0) return new Map();
  const laidOut = withGroupSizes((await layoutGraph(nodes, edges)).nodes);
  return new Map(
    laidOut.map((node) => [
      node.id,
      {
        position: node.position,
        ...(isGroupType(node.type) && node.width && node.height && { size: { width: node.width, height: node.height } }),
      },
    ])
  );
};
