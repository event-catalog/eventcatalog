import type { Edge, Node, XYPosition } from '@xyflow/react';
import { shortId, toSharedNode } from './canvas-doc';
import { findGroupAtPoint, getAbsolutePosition, sizeOf, sortByHierarchy, withDescendants } from './grouping';
import { canGoInContainer } from './node-types';

/**
 * Copying and pasting nodes, within a canvas or between canvases (through the system clipboard). What's copied is
 * the selected nodes, everything inside selected containers, and the connections between them. Comments aren't.
 */

/** The clipboard type Studio reads first (other apps get a plain text list of what was copied) */
export const CLIPBOARD_TYPE = 'application/x-eventcatalog-studio+json';
const MARKER = 'eventcatalog-studio/nodes@1';

export type ClipboardContent = { marker: typeof MARKER; nodes: Node[]; edges: Edge[] };

/** What's copied when these nodes are selected, or null if there's nothing to copy */
export const copyNodes = (nodes: Node[], edges: Edge[], selectedIds: string[]): ClipboardContent | null => {
  if (selectedIds.length === 0) return null;
  const lookup = new Map(nodes.map((node) => [node.id, node]));
  const ids = withDescendants(selectedIds, nodes);
  const copied = sortByHierarchy(nodes.filter((node) => ids.has(node.id))).map((node) => {
    const shared = toSharedNode(node);
    // Copied without its container: where it is on the canvas
    if (shared.parentId && !ids.has(shared.parentId)) {
      const { parentId: _, ...rest } = shared;
      return { ...rest, position: getAbsolutePosition(node, lookup) };
    }
    return shared;
  });
  return {
    marker: MARKER,
    nodes: copied,
    edges: edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)).map(({ selected: _, ...edge }) => edge),
  };
};

/** Copied content read back from the clipboard, if it's Studio's */
export const readClipboard = (text: string | undefined): ClipboardContent | null => {
  if (!text) return null;
  try {
    const content = JSON.parse(text) as Partial<ClipboardContent>;
    return content.marker === MARKER && Array.isArray(content.nodes) && Array.isArray(content.edges)
      ? (content as ClipboardContent)
      : null;
  } catch {
    return null;
  }
};

/**
 * Copies of the content to add to the canvas, with new ids: centred on a point (e.g. the pointer), or moved by an
 * offset from where they were copied. Copies that land in a container on the canvas go inside it.
 */
export const pasteNodes = (
  content: ClipboardContent,
  existing: Node[],
  place: { at: XYPosition } | { offset: XYPosition }
): { nodes: Node[]; edges: Edge[] } => {
  const ids = new Map(content.nodes.map((node) => [node.id, `${node.type ?? 'node'}-${shortId()}`]));
  const roots = content.nodes.filter((node) => !node.parentId);
  const offset = 'offset' in place ? place.offset : offsetToCentre(roots, place.at);

  const lookup = new Map(existing.map((node) => [node.id, node]));
  const nodes = content.nodes.map((node): Node => {
    const id = ids.get(node.id)!;
    if (node.parentId) return { ...node, id, parentId: ids.get(node.parentId) };
    const position = { x: node.position.x + offset.x, y: node.position.y + offset.y };
    const { width, height } = sizeOf(node);
    const container = canGoInContainer(node.type)
      ? findGroupAtPoint({ x: position.x + width / 2, y: position.y + height / 2 }, existing)
      : undefined;
    if (!container) return { ...node, id, position };
    const origin = getAbsolutePosition(container, lookup);
    return { ...node, id, parentId: container.id, position: { x: position.x - origin.x, y: position.y - origin.y } };
  });

  return {
    nodes,
    edges: content.edges.map((edge) => ({
      ...edge,
      id: `edge-${shortId()}`,
      source: ids.get(edge.source)!,
      target: ids.get(edge.target)!,
    })),
  };
};

/** How far to move nodes so the middle of them is at a point */
const offsetToCentre = (roots: Node[], at: XYPosition): XYPosition => {
  if (roots.length === 0) return { x: 0, y: 0 };
  const left = Math.min(...roots.map((node) => node.position.x));
  const top = Math.min(...roots.map((node) => node.position.y));
  const right = Math.max(...roots.map((node) => node.position.x + sizeOf(node).width));
  const bottom = Math.max(...roots.map((node) => node.position.y + sizeOf(node).height));
  return { x: at.x - (left + right) / 2, y: at.y - (top + bottom) / 2 };
};
