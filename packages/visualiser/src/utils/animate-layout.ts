import type { Dispatch, SetStateAction } from "react";
import type { Edge, Node, Viewport } from "@xyflow/react";

/** A graph being switched away from, for the next graph to animate from */
export type GraphTransition = {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
};

const SYSTEM_GROUP_PREFIX = "system-group-";

/**
 * Systems that change between being a node and being expanded into a group of
 * everything inside them (`system-group-<system node id>`), when switching
 * from one graph to another.
 */
export const getSystemMorphs = (fromNodes: Node[], toNodes: Node[]) => {
  const fromIds = new Set(fromNodes.map((node) => node.id));
  const toIds = new Set(toNodes.map((node) => node.id));
  const morphs: { from: string; to: string }[] = [];
  const pair = (groups: Node[], nodeIds: Set<string>, grows: boolean) =>
    groups
      .filter((node) => node.type === "system-group")
      .forEach((group) => {
        const systemId = group.id.slice(SYSTEM_GROUP_PREFIX.length);
        if (!nodeIds.has(systemId)) return;
        morphs.push(
          grows
            ? { from: systemId, to: group.id }
            : { from: group.id, to: systemId },
        );
      });
  pair(toNodes, fromIds, true);
  pair(fromNodes, toIds, false);
  return morphs.filter(
    (morph) => !toIds.has(morph.from) && !fromIds.has(morph.to),
  );
};

export const LAYOUT_ANIMATION_DURATION = 500;

const easeInOut = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

const size = (node: Node) => ({
  width: node.style?.width,
  height: node.style?.height,
});

// Size a node that hasn't been rendered yet is assumed to be
const ESTIMATED_NODE_SIZE = { width: 250, height: 120 };

type Rect = { x: number; y: number; width: number; height: number };

/** A node's rendered box: its position is offset into it by its origin */
const getRect = (node: Node, nodeOrigin: [number, number]): Rect => {
  const width =
    (typeof node.style?.width === "number" ? node.style.width : undefined) ??
    node.measured?.width ??
    ESTIMATED_NODE_SIZE.width;
  const height =
    (typeof node.style?.height === "number" ? node.style.height : undefined) ??
    node.measured?.height ??
    ESTIMATED_NODE_SIZE.height;
  const [originX, originY] = node.origin ?? nodeOrigin;
  return {
    x: node.position.x - originX * width,
    y: node.position.y - originY * height,
    width,
    height,
  };
};

/** Position that puts a node's rendered box at `rect` */
const getPositionForRect = (
  node: Node,
  rect: Rect,
  nodeOrigin: [number, number],
) => {
  const [originX, originY] = node.origin ?? nodeOrigin;
  return {
    x: rect.x + originX * rect.width,
    y: rect.y + originY * rect.height,
  };
};

/**
 * Animates from one layout of the graph to another. Nodes in both layouts
 * move (and groups resize) to their new place, frame by frame so edges follow
 * them. Nodes and edges only in the new layout fade in, and ones only in the
 * old layout fade out.
 *
 * `morphs` pair nodes in the old layout with different ones in the new
 * layout, e.g. a system node and the group of everything inside the system:
 * the group grows out of the system node, or shrinks back into it.
 *
 * Returns a function that cancels the animation.
 */
export const animateLayout = ({
  fromNodes,
  fromEdges,
  toNodes,
  toEdges,
  setNodes,
  setEdges,
  morphs = [],
  nodeOrigin = [0, 0],
  onDone,
}: {
  fromNodes: Node[];
  fromEdges: Edge[];
  toNodes: Node[];
  toEdges: Edge[];
  setNodes: (nodes: Node[]) => void;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  morphs?: { from: string; to: string }[];
  nodeOrigin?: [number, number];
  onDone?: () => void;
}) => {
  const fromNodesById = new Map(fromNodes.map((node) => [node.id, node]));
  const toNodeIds = new Set(toNodes.map((node) => node.id));
  const fromEdgeIds = new Set(fromEdges.map((edge) => edge.id));
  const toEdgeIds = new Set(toEdges.map((edge) => edge.id));

  // Morphing: a group (sized by its style) grows out of the old node, or the
  // old group shrinks to where the new node will be while it fades in
  const shrinking: { node: Node; from: Rect; to: Rect }[] = [];
  morphs.forEach((morph) => {
    const morphFrom = fromNodesById.get(morph.from);
    const morphTo = toNodes.find((node) => node.id === morph.to);
    if (!morphFrom || !morphTo) return;
    const fromRect = getRect(morphFrom, nodeOrigin);
    if (typeof morphTo.style?.width === "number") {
      fromNodesById.set(morphTo.id, {
        ...morphTo,
        position: getPositionForRect(morphTo, fromRect, nodeOrigin),
        style: {
          ...morphTo.style,
          width: fromRect.width,
          height: fromRect.height,
        },
      });
    } else {
      shrinking.push({
        node: { ...morphFrom, origin: [0, 0], className: "ec-morph-exit" },
        from: fromRect,
        to: getRect(morphTo, nodeOrigin),
      });
    }
  });
  const shrinkingIds = new Set(shrinking.map(({ node }) => node.id));

  const exitingNodes = fromNodes
    .filter((node) => !toNodeIds.has(node.id) && !shrinkingIds.has(node.id))
    .map((node) => ({ ...node, className: "ec-exit" }));

  const frame = (t: number): Node[] => {
    const nodes = toNodes.map((node) => {
      const from = fromNodesById.get(node.id);
      if (!from) return { ...node, className: "ec-enter" };

      const next: Node = {
        ...node,
        position: {
          x: lerp(from.position.x, node.position.x, t),
          y: lerp(from.position.y, node.position.y, t),
        },
      };
      // Groups grow or shrink to their new size
      const fromSize = size(from);
      const toSize = size(node);
      if (
        typeof fromSize.width === "number" &&
        typeof toSize.width === "number" &&
        typeof fromSize.height === "number" &&
        typeof toSize.height === "number"
      ) {
        next.style = {
          ...node.style,
          width: lerp(fromSize.width, toSize.width, t),
          height: lerp(fromSize.height, toSize.height, t),
        };
      }
      return next;
    });

    shrinking.forEach(({ node, from, to }) =>
      nodes.push({
        ...node,
        position: { x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t) },
        style: {
          ...node.style,
          width: lerp(from.width, to.width, t),
          height: lerp(from.height, to.height, t),
        },
      }),
    );
    // Exiting nodes stay (fading out) until the animation ends
    return [...nodes, ...exitingNodes];
  };

  // Start straight away so the new layout is never painted before it animates
  setNodes(frame(0));
  setEdges([
    ...toEdges.map((edge) =>
      fromEdgeIds.has(edge.id) ? edge : { ...edge, className: "ec-enter" },
    ),
    ...fromEdges
      .filter((edge) => !toEdgeIds.has(edge.id))
      .map((edge) => ({ ...edge, className: "ec-exit" })),
  ]);

  const start = performance.now();
  let animationFrame = requestAnimationFrame(function tick(now) {
    const t = Math.min(1, (now - start) / LAYOUT_ANIMATION_DURATION);
    if (t < 1) {
      setNodes(frame(easeInOut(t)));
      animationFrame = requestAnimationFrame(tick);
      return;
    }
    setNodes(toNodes);
    // Drop the faded out edges. Updated in place rather than replaced, so any
    // changes made to the edges since the start (e.g. animation) are kept.
    setEdges((edges) =>
      edges
        .filter((edge) => toEdgeIds.has(edge.id))
        .map((edge) =>
          edge.className === "ec-enter"
            ? { ...edge, className: undefined }
            : edge,
        ),
    );
    onDone?.();
  });

  return () => cancelAnimationFrame(animationFrame);
};

/**
 * Bounds of a laid out graph, for fitting the view to it before it's rendered
 * (none for an empty graph)
 */
export const getLayoutBounds = (nodes: Node[], currentNodes: Node[]) => {
  const currentById = new Map(currentNodes.map((node) => [node.id, node]));
  const topLevel = nodes.filter((node) => !node.parentId);
  if (topLevel.length === 0) return undefined;
  const rects = topLevel.map((node) => {
    const measured = currentById.get(node.id)?.measured ?? node.measured;
    const width =
      (typeof node.style?.width === "number" ? node.style.width : undefined) ??
      measured?.width ??
      150;
    const height =
      (typeof node.style?.height === "number"
        ? node.style.height
        : undefined) ??
      measured?.height ??
      100;
    return { ...node.position, width, height };
  });
  const x = Math.min(...rects.map((rect) => rect.x));
  const y = Math.min(...rects.map((rect) => rect.y));
  return {
    x,
    y,
    width: Math.max(...rects.map((rect) => rect.x + rect.width)) - x,
    height: Math.max(...rects.map((rect) => rect.y + rect.height)) - y,
  };
};
