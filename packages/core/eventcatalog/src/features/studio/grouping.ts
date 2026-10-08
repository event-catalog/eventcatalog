import type { Node, XYPosition } from '@xyflow/react';
import { canGoInContainer, getNodeSize, isGroupType } from './node-types';

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
export const getAbsolutePosition = (node: Node, lookup: Map<string, Node>): XYPosition => {
  const parent = node.parentId ? lookup.get(node.parentId) : undefined;
  if (!parent) return node.position;
  const parentPosition = getAbsolutePosition(parent, lookup);
  return { x: parentPosition.x + node.position.x, y: parentPosition.y + node.position.y };
};

export const getAbsoluteRect = (node: Node, lookup: Map<string, Node>): Rect => ({
  ...getAbsolutePosition(node, lookup),
  ...sizeOf(node),
});

const getDepth = (node: Node, lookup: Map<string, Node>): number => {
  const parent = node.parentId ? lookup.get(node.parentId) : undefined;
  return parent ? 1 + getDepth(parent, lookup) : 0;
};

const isDescendantOf = (node: Node, ancestorId: string, lookup: Map<string, Node>): boolean => {
  if (!node.parentId) return false;
  if (node.parentId === ancestorId) return true;
  const parent = lookup.get(node.parentId);
  return parent ? isDescendantOf(parent, ancestorId, lookup) : false;
};

const containsPoint = (rect: Rect, point: XYPosition) =>
  point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;

/** React Flow needs containers before what's in them in the nodes array */
export const sortByHierarchy = (nodes: Node[]): Node[] => {
  const lookup = byId(nodes);
  return nodes
    .map((node, index) => ({ node, index, depth: getDepth(node, lookup) }))
    .sort((a, b) => a.depth - b.depth || a.index - b.index)
    .map(({ node }) => node);
};

/** The innermost container under the centre of a node (never itself, or one of its own children) */
export const findDropTarget = (nodeId: string, nodes: Node[]): Node | undefined => {
  const lookup = byId(nodes);
  const node = lookup.get(nodeId);
  // Sticky notes go anywhere, never in a container (one that's in one is taken out when it's next moved)
  if (!node || !canGoInContainer(node.type)) return undefined;
  const rect = getAbsoluteRect(node, lookup);
  const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  return nodes
    .filter((candidate) => isGroupType(candidate.type) && candidate.id !== nodeId && !isDescendantOf(candidate, nodeId, lookup))
    .filter((candidate) => containsPoint(getAbsoluteRect(candidate, lookup), center))
    .sort((a, b) => getDepth(b, lookup) - getDepth(a, lookup))[0];
};

/** The innermost container at a canvas point, for things dropped there */
export const findGroupAtPoint = (point: XYPosition, nodes: Node[]): Node | undefined => {
  const lookup = byId(nodes);
  return nodes
    .filter((candidate) => isGroupType(candidate.type) && containsPoint(getAbsoluteRect(candidate, lookup), point))
    .sort((a, b) => getDepth(b, lookup) - getDepth(a, lookup))[0];
};

/** A node moved into (or out of, without a parentId) a container, staying in the same place on the canvas */
export const withParent = (node: Node, parentId: string | undefined, nodes: Node[]): Node => {
  const lookup = byId(nodes);
  const absolute = getAbsolutePosition(node, lookup);
  const parent = parentId ? lookup.get(parentId) : undefined;
  const parentPosition = parent ? getAbsolutePosition(parent, lookup) : { x: 0, y: 0 };
  const { parentId: _, extent: __, ...rest } = node;
  return {
    ...rest,
    ...(parent && { parentId: parent.id }),
    position: { x: absolute.x - parentPosition.x, y: absolute.y - parentPosition.y },
  };
};

/** A canvas point, relative to a container */
export const toRelativePosition = (point: XYPosition, parentId: string, nodes: Node[]): XYPosition => {
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
  const rects = children.map((child) => ({ ...child.position, ...sizeOf(child) }));
  const shift = {
    x: Math.max(0, GROUP_PADDING.left - Math.min(...rects.map((rect) => rect.x))),
    y: Math.max(0, GROUP_PADDING.top - Math.min(...rects.map((rect) => rect.y))),
  };
  const current = sizeOf(group);
  return {
    shift,
    width: Math.max(current.width, Math.max(...rects.map((rect) => rect.x + rect.width)) + shift.x + GROUP_PADDING.right),
    height: Math.max(current.height, Math.max(...rects.map((rect) => rect.y + rect.height)) + shift.y + GROUP_PADDING.bottom),
  };
};

/** How far a dragged node's middle can go past a container's edge and still be kept in it (growing it) */
export const KEEP_IN_CONTAINER_MARGIN = 160;

type Size = { width: number; height: number };
/** A node's place and size as shown while something's dragged */
export type NodePreview = { position: XYPosition; width?: number; height?: number };

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
  now: ReadonlyMap<string, Node>
): Map<string, NodePreview> => {
  const previews = new Map<string, NodePreview>();
  // Where each container's top left was on the canvas when the drag started (moving a container grown up or
  // left is offset by what's in it moving the other way, so only its own shift changes it)
  const startOrigin = (id: string) => getAbsolutePosition(start.get(id)!, start as Map<string, Node>);
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
        if (kept) items.push({ rect: { ...at, x: at.x - origin.x, y: at.y - origin.y } });
        continue;
      }
      // A container inside it that's grown: where it's grown to
      const inner = previews.get(node.id);
      const innerShift = shifts.get(node.id) ?? { x: 0, y: 0 };
      items.push({
        rect: {
          x: node.position.x - innerShift.x,
          y: node.position.y - innerShift.y,
          ...(inner?.width && inner.height ? { width: inner.width, height: inner.height } : sizeOf(node)),
        },
      });
    }

    const shift = { x: 0, y: 0 };
    let width = startSize.width;
    let height = startSize.height;
    if (items.length > 0) {
      shift.x = Math.max(0, GROUP_PADDING.left - Math.min(...items.map(({ rect }) => rect.x)));
      shift.y = Math.max(0, GROUP_PADDING.top - Math.min(...items.map(({ rect }) => rect.y)));
      width =
        Math.max(startSize.width, Math.max(...items.map(({ rect }) => rect.x + rect.width)) + GROUP_PADDING.right) + shift.x;
      height =
        Math.max(startSize.height, Math.max(...items.map(({ rect }) => rect.y + rect.height)) + GROUP_PADDING.bottom) + shift.y;
    }
    shifts.set(id, shift);
    previews.set(id, {
      position: { x: container.position.x - shift.x, y: container.position.y - shift.y },
      width,
      height,
    });
    // What's in it moves the other way. Not what's dragged: React Flow places it against the container as it is.
    for (const node of start.values()) {
      if (node.parentId !== id || draggedIds.has(node.id)) continue;
      const own = previews.get(node.id);
      const base = own?.position ?? node.position;
      previews.set(node.id, { ...own, position: { x: base.x + shift.x, y: base.y + shift.y } });
    }
  }
  return previews;
};
