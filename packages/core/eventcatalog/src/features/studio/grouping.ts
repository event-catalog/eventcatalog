import type { Node, XYPosition } from '@xyflow/react';
import { getNodeSize, isGroupType } from './node-types';

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
  if (!node) return undefined;
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
