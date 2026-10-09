import type { Edge, Node, XYPosition } from '@xyflow/react';
import { layoutWithElk } from '@eventcatalog/visualiser/layout';
import { getEdgeRoute, type EdgeRoute } from './canvas-doc';
import { isGroupType, isOnLevel } from './node-types';

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

export type LayoutResult = {
  /** Where each node goes (relative to its container, if it's in one), and containers' new sizes */
  nodes: Map<string, { position: XYPosition; size?: { width: number; height: number } }>;
  /** How each connection is drawn (around the nodes), by edge id */
  routes: Map<string, EdgeRoute>;
};

/**
 * The canvas laid out: new positions for its nodes, new sizes for containers, and routes for the connections
 * (drawn like the visualiser's: around the nodes, following them when they're moved, and as a plain step once
 * they've moved too far for it). Notes added on L1 or L2 aren't on this canvas, so they stay where they are.
 */
export const getLayoutPositions = async (nodes: Node[], edges: Edge[]): Promise<LayoutResult> => {
  const onCanvas = nodes.filter((node) => isOnLevel(node, 3));
  if (onCanvas.length === 0) return { nodes: new Map(), routes: new Map() };
  const ids = new Set(onCanvas.map((node) => node.id));
  const between = edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));
  const laidOut = await layoutGraph(onCanvas, between);
  return {
    nodes: new Map(
      withGroupSizes(laidOut.nodes).map((node) => [
        node.id,
        {
          position: node.position,
          ...(isGroupType(node.type) && node.width && node.height && { size: { width: node.width, height: node.height } }),
        },
      ])
    ),
    routes: new Map(
      laidOut.edges.flatMap((edge) => {
        const route = getEdgeRoute(edge);
        return route ? [[edge.id, route] as const] : [];
      })
    ),
  };
};
