import type { Edge, Node } from '@xyflow/react';
import { getAbsolutePosition, sizeOf } from './grouping';
import { isGroupType } from './node-types';

/**
 * A canvas drawn small, for lists of canvases: each node as a box where it is on the canvas (containers as outlines
 * behind what's in them) and each connection as a line between the boxes' middles. In the canvas's own coordinates,
 * starting at 0,0, to draw in an SVG with a viewBox of its width and height.
 */
export type CanvasPreview = {
  width: number;
  height: number;
  shapes: { x: number; y: number; width: number; height: number; type: string; container: boolean }[];
  lines: { x1: number; y1: number; x2: number; y2: number }[];
};

/** Big canvases are drawn from their first few hundred nodes and connections: enough for a thumbnail */
const MAX_SHAPES = 300;
const MAX_LINES = 300;

export const getCanvasPreview = (nodes: Node[], edges: Edge[]): CanvasPreview | null => {
  if (nodes.length === 0) return null;
  const lookup = new Map(nodes.map((node) => [node.id, node]));
  const boxes = new Map(
    nodes.slice(0, MAX_SHAPES).map((node) => {
      const { x, y } = getAbsolutePosition(node, lookup);
      return [node.id, { x, y, ...sizeOf(node), type: node.type ?? 'node', container: isGroupType(node.type) }];
    })
  );
  const all = [...boxes.values()];
  const left = Math.min(...all.map((box) => box.x));
  const top = Math.min(...all.map((box) => box.y));
  const right = Math.max(...all.map((box) => box.x + box.width));
  const bottom = Math.max(...all.map((box) => box.y + box.height));
  const middle = (id: string) => {
    const box = boxes.get(id);
    return box && { x: box.x - left + box.width / 2, y: box.y - top + box.height / 2 };
  };

  return {
    width: Math.max(right - left, 1),
    height: Math.max(bottom - top, 1),
    // Containers first, so what's in them is drawn over them
    shapes: all
      .map((box) => ({ ...box, x: box.x - left, y: box.y - top }))
      .sort((a, b) => Number(b.container) - Number(a.container)),
    lines: edges.slice(0, MAX_LINES).flatMap((edge) => {
      const from = middle(edge.source);
      const to = middle(edge.target);
      return from && to ? [{ x1: from.x, y1: from.y, x2: to.x, y2: to.y }] : [];
    }),
  };
};
