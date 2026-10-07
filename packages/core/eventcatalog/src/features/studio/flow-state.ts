import type { Edge, Node, XYPosition } from '@xyflow/react';

/**
 * The design (nodes and edges) comes from the shared document; some state stays with each person: what they
 * have selected, what they're dragging and resizing, and the sizes React Flow measured in their browser.
 */
export const LOCAL_NODE_KEYS = ['selected', 'dragging', 'resizing', 'measured'] as const satisfies readonly (keyof Node)[];
export const LOCAL_EDGE_KEYS = ['selected'] as const satisfies readonly (keyof Edge)[];

/** A shared item with the local-only state of the one already shown. Nothing else is kept from the local one. */
export const withLocalState = <T extends object>(shared: T, local: T | undefined, localKeys: readonly (keyof T)[]): T => {
  if (!local) return shared;
  const kept: Partial<T> = {};
  for (const key of localKeys) if (local[key] !== undefined) kept[key] = local[key];
  return { ...shared, ...kept };
};

/**
 * Applies changes to shared items (by id) to the items shown, keeping every unchanged item as the same object
 * (so React Flow doesn't re-render it) and the order they were first seen in (new ones go at the end).
 * `getShared` returns an item's shared value, or undefined if it was deleted. Returns `local` itself when
 * nothing changed.
 */
export const patchShared = <T extends { id: string }>(
  local: T[],
  changedIds: Iterable<string>,
  getShared: (id: string) => T | undefined,
  localKeys: readonly (keyof T)[]
): T[] => {
  const indexById = new Map(local.map((item, index) => [item.id, index]));
  let next: T[] | undefined;
  const removed = new Set<string>();
  const added: T[] = [];

  for (const id of changedIds) {
    const shared = getShared(id);
    const index = indexById.get(id);
    if (!shared) {
      if (index !== undefined) removed.add(id);
      continue;
    }
    if (index === undefined) {
      added.push(shared);
      continue;
    }
    next ??= [...local];
    next[index] = withLocalState(shared, local[index], localKeys);
  }

  if (!next && removed.size === 0 && added.length === 0) return local;
  const patched = next ?? local;
  return [...(removed.size ? patched.filter((item) => !removed.has(item.id)) : patched), ...added];
};

/** Where nodes being dragged are, by id, until they're dropped (and saved) */
export type Moves = ReadonlyMap<string, XYPosition>;

const samePosition = (a: XYPosition, b: XYPosition) => a.x === b.x && a.y === b.y;

/**
 * Nodes moved to the positions given (e.g. where someone else is dragging them), except ones being dragged
 * here. Returns `nodes` itself when none move.
 */
export const withPositions = (nodes: Node[], positions: Moves): Node[] => {
  if (positions.size === 0) return nodes;
  let next: Node[] | undefined;
  nodes.forEach((node, index) => {
    const position = positions.get(node.id);
    if (!position || node.dragging || samePosition(position, node.position)) return;
    next ??= [...nodes];
    next[index] = { ...node, position };
  });
  return next ?? nodes;
};

/**
 * After shared changes are applied (`next`, from `previous`): nodes being dragged here stay where they're being
 * dragged (when they're dropped, the drop is saved and wins). Returns `next` itself when none are.
 */
export const keepDragged = (next: Node[], previous: Node[]): Node[] => {
  if (next === previous) return next;
  const dragged = new Map(previous.filter((node) => node.dragging).map((node) => [node.id, node.position]));
  if (dragged.size === 0) return next;
  let kept: Node[] | undefined;
  next.forEach((node, index) => {
    const position = dragged.get(node.id);
    if (!position || samePosition(position, node.position)) return;
    kept ??= [...next];
    kept[index] = { ...node, position };
  });
  return kept ?? next;
};
