import type { Node, XYPosition } from "@xyflow/react";
import {
  canGoInContainer,
  canHold,
  getNodeSize,
  isGroupType,
} from "./node-types";

/**
 * Containers: domains and systems shown as boxes that other nodes sit in.
 * A node inside one has its parentId, and its position is relative to the container.
 */

/** Room around what's in a container, and for its header */
export const GROUP_PADDING = { top: 80, right: 40, bottom: 40, left: 40 };

type Rect = { x: number; y: number; width: number; height: number };

const byId = (nodes: Node[]) => new Map(nodes.map((node) => [node.id, node]));

/** A node's size: as rendered (in the browser), as set (containers, notes), or what its type renders at */
export const sizeOf = (node: Node) => ({
  width: node.measured?.width ?? node.width ?? getNodeSize(node.type).width,
  height: node.measured?.height ?? node.height ?? getNodeSize(node.type).height,
});

/** Nodes are positioned relative to their container, so walk up the chain to get the canvas position */
export const getAbsolutePosition = (
  node: Node,
  lookup: Map<string, Node>,
): XYPosition => {
  const parent = node.parentId ? lookup.get(node.parentId) : undefined;
  if (!parent) return node.position;
  const parentPosition = getAbsolutePosition(parent, lookup);
  return {
    x: parentPosition.x + node.position.x,
    y: parentPosition.y + node.position.y,
  };
};

export const getAbsoluteRect = (
  node: Node,
  lookup: Map<string, Node>,
): Rect => ({
  ...getAbsolutePosition(node, lookup),
  ...sizeOf(node),
});

const getDepth = (node: Node, lookup: Map<string, Node>): number => {
  const parent = node.parentId ? lookup.get(node.parentId) : undefined;
  return parent ? 1 + getDepth(parent, lookup) : 0;
};

const isDescendantOf = (
  node: Node,
  ancestorId: string,
  lookup: Map<string, Node>,
): boolean => {
  if (!node.parentId) return false;
  if (node.parentId === ancestorId) return true;
  const parent = lookup.get(node.parentId);
  return parent ? isDescendantOf(parent, ancestorId, lookup) : false;
};

const containsPoint = (rect: Rect, point: XYPosition) =>
  point.x >= rect.x &&
  point.x <= rect.x + rect.width &&
  point.y >= rect.y &&
  point.y <= rect.y + rect.height;

/** React Flow needs containers before what's in them in the nodes array */
export const sortByHierarchy = (nodes: Node[]): Node[] => {
  const lookup = byId(nodes);
  return nodes
    .map((node, index) => ({ node, index, depth: getDepth(node, lookup) }))
    .sort((a, b) => a.depth - b.depth || a.index - b.index)
    .map(({ node }) => node);
};

/** The innermost container under the centre of a node (never itself, or one of its own children) */
export const findDropTarget = (
  nodeId: string,
  nodes: Node[],
): Node | undefined => {
  const lookup = byId(nodes);
  const node = lookup.get(nodeId);
  // Sticky notes and text go anywhere, never in a container (one that's in one is taken out when it's next moved)
  if (!node || !canGoInContainer(node.type)) return undefined;
  const rect = getAbsoluteRect(node, lookup);
  const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  return nodes
    .filter(
      (candidate) =>
        canHold(candidate.type, node.type) &&
        candidate.id !== nodeId &&
        !isDescendantOf(candidate, nodeId, lookup),
    )
    .filter((candidate) =>
      containsPoint(getAbsoluteRect(candidate, lookup), center),
    )
    .sort((a, b) => getDepth(b, lookup) - getDepth(a, lookup))[0];
};

/**
 * Where what's dragged goes when it's dropped: the containers it moves into (or out of, with no target), for the
 * ones whose container changes. A selection follows the node held by the pointer: when that one goes into a
 * container, or out of one, everything with it that can go there goes too (sticky notes and text never go in one).
 * When it stays where it is, each one goes into the container under its middle, as one dragged alone does.
 */
export const findDropTargets = (
  grabbedId: string,
  draggedIds: Iterable<string>,
  nodes: Node[],
): { id: string; target: Node | undefined }[] => {
  const lookup = byId(nodes);
  const dragged = new Set(draggedIds);
  // What's moved itself: not what's in a container dragged with it (that moves with its container)
  const roots = [...dragged].filter((id) => {
    const parentId = lookup.get(id)?.parentId;
    return lookup.has(id) && (!parentId || !dragged.has(parentId));
  });
  let held = lookup.get(grabbedId);
  while (held?.parentId && dragged.has(held.parentId))
    held = lookup.get(held.parentId);
  const heldTarget =
    held && canGoInContainer(held.type)
      ? findDropTarget(held.id, nodes)
      : undefined;
  const followHeld =
    !!held && canGoInContainer(held.type) && heldTarget?.id !== held.parentId;
  const canFollow = (node: Node) =>
    canGoInContainer(node.type) &&
    (!heldTarget ||
      (canHold(heldTarget.type, node.type) &&
        heldTarget.id !== node.id &&
        !isDescendantOf(heldTarget, node.id, lookup)));
  return roots.flatMap((id) => {
    const node = lookup.get(id)!;
    const target =
      followHeld && canFollow(node) ? heldTarget : findDropTarget(id, nodes);
    return target?.id === node.parentId ? [] : [{ id, target }];
  });
};

/** The innermost container at a canvas point, for things dropped there (that can hold a kind of node, when given) */
export const findGroupAtPoint = (
  point: XYPosition,
  nodes: Node[],
  type?: string,
): Node | undefined => {
  const lookup = byId(nodes);
  return nodes
    .filter(
      (candidate) =>
        (type ? canHold(candidate.type, type) : isGroupType(candidate.type)) &&
        containsPoint(getAbsoluteRect(candidate, lookup), point),
    )
    .sort((a, b) => getDepth(b, lookup) - getDepth(a, lookup))[0];
};

/** The container something added goes in: the one asked for (by id), else the one it's dropped on */
export const containerFor = (
  point: XYPosition,
  nodes: Node[],
  inside?: string,
  type?: string,
): Node | undefined =>
  inside
    ? nodes.find(
        (node) =>
          node.id === inside &&
          (type ? canHold(node.type, type) : isGroupType(node.type)),
      )
    : findGroupAtPoint(point, nodes, type);

/** A node moved into (or out of, without a parentId) a container, staying in the same place on the canvas */
export const withParent = (
  node: Node,
  parentId: string | undefined,
  nodes: Node[],
): Node => {
  const lookup = byId(nodes);
  const absolute = getAbsolutePosition(node, lookup);
  const parent = parentId ? lookup.get(parentId) : undefined;
  const parentPosition = parent
    ? getAbsolutePosition(parent, lookup)
    : { x: 0, y: 0 };
  const { parentId: _, extent: __, ...rest } = node;
  return {
    ...rest,
    ...(parent && { parentId: parent.id }),
    position: {
      x: absolute.x - parentPosition.x,
      y: absolute.y - parentPosition.y,
    },
  };
};

/** The least room left between something dropped in a container and what's already in it */
export const DROP_GAP = 32;

/**
 * How much more moving something out past its container's edges (making it grow) counts than moving it further:
 * more up and left, where the container grows by moving on the canvas (towards what's there), than down and right
 */
const GROWTH_COST = { down: 4, up: 12 };

const overlaps = (a: Rect, b: Rect, gap: number) =>
  a.x < b.x + b.width + gap &&
  b.x < a.x + a.width + gap &&
  a.y < b.y + b.height + gap &&
  b.y < a.y + a.height + gap;

/** How far a rect is past the edges of an area: above and left of it, and below and right of it */
const pastEdges = (rect: Rect, area: Rect) => ({
  up: Math.max(0, area.x - rect.x) + Math.max(0, area.y - rect.y),
  down:
    Math.max(0, rect.x + rect.width - (area.x + area.width)) +
    Math.max(0, rect.y + rect.height - (area.y + area.height)),
});

/** Where a rect goes inside an area, moved as little as it can be (its top left, when it's bigger than the area) */
const into = (rect: Rect, area: Rect): XYPosition => ({
  x: Math.max(area.x, Math.min(rect.x, area.x + area.width - rect.width)),
  y: Math.max(area.y, Math.min(rect.y, area.y + area.height - rect.height)),
});

/**
 * Where a rect goes so it's not on (or within `gap` of) an obstacle: the free place that's the least move from where
 * it is, counting a move out past the area's edges (its container growing) as `GROWTH_COST` times more (more up and
 * left). Looked for by stepping beside what's in the way (right, left, below, above), a few steps deep, from where it
 * is and from there moved into the area. Boxed in: below everything.
 */
const freeSpot = (
  rect: Rect,
  obstacles: Rect[],
  area: Rect,
  gap: number,
): XYPosition => {
  const at = (position: XYPosition) => ({ ...rect, ...position });
  const inTheWay = (position: XYPosition) =>
    obstacles.filter((obstacle) => overlaps(at(position), obstacle, gap));
  const cost = (position: XYPosition) => {
    const past = pastEdges(at(position), area);
    return (
      Math.hypot(position.x - rect.x, position.y - rect.y) +
      GROWTH_COST.up * past.up +
      GROWTH_COST.down * past.down
    );
  };
  const seen = new Set<string>();
  let best: XYPosition | undefined;
  let frontier: XYPosition[] = [];
  const consider = (position: XYPosition) => {
    const key = `${position.x},${position.y}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (best && cost(position) >= cost(best)) return;
    if (inTheWay(position).length) frontier.push(position);
    else best = position;
  };
  consider({ x: rect.x, y: rect.y });
  consider(into(rect, area));
  for (let depth = 0; depth < 4 && frontier.length; depth++) {
    const from = frontier.sort((a, b) => cost(a) - cost(b)).slice(0, 24);
    frontier = [];
    for (const position of from) {
      for (const obstacle of inTheWay(position)) {
        consider({ x: obstacle.x + obstacle.width + gap, y: position.y });
        consider({ x: obstacle.x - gap - rect.width, y: position.y });
        consider({ x: position.x, y: obstacle.y + obstacle.height + gap });
        consider({ x: position.x, y: obstacle.y - gap - rect.height });
      }
    }
  }
  return (
    best ?? {
      x: rect.x,
      y: Math.max(
        ...obstacles.map((obstacle) => obstacle.y + obstacle.height + gap),
      ),
    }
  );
};

/**
 * Where things dropped in containers go in them (relative to the container): where they were dropped when that's
 * free and inside it, else the nearest free place, keeping inside the container (so it doesn't grow over what's around
 * it) unless there's no room. What's dropped stays clear of what's in the container and of each other. `moves` are
 * what `findDropTargets` returns; ones taken out of a container aren't placed (they stay where they were dropped).
 * `nudged` when any had to move from where it was dropped (to show it gliding there).
 */
export const placeDropped = (
  nodes: Node[],
  moves: { id: string; target: Node | undefined }[],
  gap = DROP_GAP,
): { places: Map<string, XYPosition>; nudged: boolean } => {
  const lookup = byId(nodes);
  const places = new Map<string, XYPosition>();
  let nudged = false;
  const moved = new Set(moves.map(({ id }) => id));
  const byTarget = new Map<string, string[]>();
  for (const { id, target } of moves) {
    if (target)
      byTarget.set(target.id, [...(byTarget.get(target.id) ?? []), id]);
  }
  for (const [targetId, ids] of byTarget) {
    const container = lookup.get(targetId)!;
    const size = sizeOf(container);
    // Inside its padding, under its header
    const area = {
      x: GROUP_PADDING.left,
      y: GROUP_PADDING.top,
      width: Math.max(0, size.width - GROUP_PADDING.left - GROUP_PADDING.right),
      height: Math.max(
        0,
        size.height - GROUP_PADDING.top - GROUP_PADDING.bottom,
      ),
    };
    const obstacles = nodes
      .filter((node) => node.parentId === targetId && !moved.has(node.id))
      .map((node) => ({ ...node.position, ...sizeOf(node) }));
    const dropped = ids.flatMap((id) => {
      const node = lookup.get(id);
      if (!node) return [];
      const inside = withParent(node, targetId, nodes);
      return [{ id, rect: { ...inside.position, ...sizeOf(node) } }];
    });
    // What's dropped in a free place inside it first, so it keeps that place and the rest go round it
    const settled = (rect: Rect) => {
      const past = pastEdges(rect, area);
      return (
        !past.up &&
        !past.down &&
        !obstacles.some((obstacle) => overlaps(rect, obstacle, gap))
      );
    };
    dropped.sort((a, b) => Number(settled(b.rect)) - Number(settled(a.rect)));
    for (const { id, rect } of dropped) {
      const spot = freeSpot(rect, obstacles, area, gap);
      if (spot.x !== rect.x || spot.y !== rect.y) nudged = true;
      places.set(id, spot);
      obstacles.push({ ...rect, ...spot });
    }
  }
  return { places, nudged };
};

/** A canvas point, relative to a container */
export const toRelativePosition = (
  point: XYPosition,
  parentId: string,
  nodes: Node[],
): XYPosition => {
  const lookup = byId(nodes);
  const parent = lookup.get(parentId);
  if (!parent) return point;
  const parentPosition = getAbsolutePosition(parent, lookup);
  return { x: point.x - parentPosition.x, y: point.y - parentPosition.y };
};

/** Nodes and everything inside them (deleted with their container) */
export const withDescendants = (ids: string[], nodes: Node[]): Set<string> => {
  const lookup = byId(nodes);
  const result = new Set(ids);
  nodes.forEach((node) => {
    if (ids.some((id) => isDescendantOf(node, id, lookup))) result.add(node.id);
  });
  return result;
};

/**
 * The size a container needs to fit what's inside it, never smaller than it is, and how far its children
 * must shift when some sit above or left of its content area (so the header stays clear).
 */
export const fitGroup = (groupId: string, nodes: Node[]) => {
  const lookup = byId(nodes);
  const group = lookup.get(groupId);
  const children = nodes.filter((node) => node.parentId === groupId);
  if (!group || children.length === 0) return undefined;
  const rects = children.map((child) => ({
    ...child.position,
    ...sizeOf(child),
  }));
  const shift = {
    x: Math.max(
      0,
      GROUP_PADDING.left - Math.min(...rects.map((rect) => rect.x)),
    ),
    y: Math.max(
      0,
      GROUP_PADDING.top - Math.min(...rects.map((rect) => rect.y)),
    ),
  };
  const current = sizeOf(group);
  return {
    shift,
    width: Math.max(
      current.width,
      Math.max(...rects.map((rect) => rect.x + rect.width)) +
        shift.x +
        GROUP_PADDING.right,
    ),
    height: Math.max(
      current.height,
      Math.max(...rects.map((rect) => rect.y + rect.height)) +
        shift.y +
        GROUP_PADDING.bottom,
    ),
  };
};

/** How far a dragged node's middle can go past a container's edge and still be kept in it (growing it) */
export const KEEP_IN_CONTAINER_MARGIN = 160;

/** A node's place and size as shown while something's dragged */
export type NodePreview = {
  position: XYPosition;
  width?: number;
  height?: number;
};

/**
 * Containers growing to fit what's being dragged in them, on every side, as a preview of where things will be.
 * `containerIds` are the containers around what's dragged, innermost first. `start` is the canvas when the drag
 * started, and `now` the canvas as shown (with the dragged nodes where they are now). A dragged node is kept in a
 * container while its middle is within `KEEP_IN_CONTAINER_MARGIN` of where the container was, and dropping it
 * further away takes it out, so the container goes back to its size. A container growing up or left moves, and
 * what's in it moves the other way, so nothing moves on the canvas.
 *
 * Returns, by id, where containers and the nodes in them that aren't dragged go (positions relative to their
 * containers), and their sizes for containers.
 */
export const previewContainerGrowth = (
  containerIds: string[],
  draggedIds: ReadonlySet<string>,
  start: ReadonlyMap<string, Node>,
  now: ReadonlyMap<string, Node>,
): Map<string, NodePreview> => {
  const previews = new Map<string, NodePreview>();
  // Where each container's top left was on the canvas when the drag started (moving a container grown up or
  // left is offset by what's in it moving the other way, so only its own shift changes it)
  const startOrigin = (id: string) =>
    getAbsolutePosition(start.get(id)!, start as Map<string, Node>);
  const shifts = new Map<string, XYPosition>();

  for (const id of containerIds) {
    const container = start.get(id);
    if (!container) continue;
    const origin = startOrigin(id);
    const startSize = sizeOf(container);
    // Everything in it, in its coordinates when the drag started
    const items: { rect: Rect }[] = [];
    for (const node of start.values()) {
      if (node.parentId !== id) continue;
      if (draggedIds.has(node.id)) {
        const current = now.get(node.id);
        if (!current) continue;
        const at = getAbsoluteRect(current, now as Map<string, Node>);
        const middle = { x: at.x + at.width / 2, y: at.y + at.height / 2 };
        const kept =
          middle.x >= origin.x - KEEP_IN_CONTAINER_MARGIN &&
          middle.x <= origin.x + startSize.width + KEEP_IN_CONTAINER_MARGIN &&
          middle.y >= origin.y - KEEP_IN_CONTAINER_MARGIN &&
          middle.y <= origin.y + startSize.height + KEEP_IN_CONTAINER_MARGIN;
        if (kept)
          items.push({
            rect: { ...at, x: at.x - origin.x, y: at.y - origin.y },
          });
        continue;
      }
      // A container inside it that's grown: where it's grown to
      const inner = previews.get(node.id);
      const innerShift = shifts.get(node.id) ?? { x: 0, y: 0 };
      items.push({
        rect: {
          x: node.position.x - innerShift.x,
          y: node.position.y - innerShift.y,
          ...(inner?.width && inner.height
            ? { width: inner.width, height: inner.height }
            : sizeOf(node)),
        },
      });
    }

    const shift = { x: 0, y: 0 };
    let width = startSize.width;
    let height = startSize.height;
    if (items.length > 0) {
      shift.x = Math.max(
        0,
        GROUP_PADDING.left - Math.min(...items.map(({ rect }) => rect.x)),
      );
      shift.y = Math.max(
        0,
        GROUP_PADDING.top - Math.min(...items.map(({ rect }) => rect.y)),
      );
      width =
        Math.max(
          startSize.width,
          Math.max(...items.map(({ rect }) => rect.x + rect.width)) +
            GROUP_PADDING.right,
        ) + shift.x;
      height =
        Math.max(
          startSize.height,
          Math.max(...items.map(({ rect }) => rect.y + rect.height)) +
            GROUP_PADDING.bottom,
        ) + shift.y;
    }
    shifts.set(id, shift);
    previews.set(id, {
      position: {
        x: container.position.x - shift.x,
        y: container.position.y - shift.y,
      },
      width,
      height,
    });
    // What's in it moves the other way. Not what's dragged: React Flow places it against the container as it is.
    for (const node of start.values()) {
      if (node.parentId !== id || draggedIds.has(node.id)) continue;
      const own = previews.get(node.id);
      const base = own?.position ?? node.position;
      previews.set(node.id, {
        ...own,
        position: { x: base.x + shift.x, y: base.y + shift.y },
      });
    }
  }
  return previews;
};
