import { describe, it, expect } from 'vitest';
import type { Edge, Node } from '@xyflow/react';
import {
  keepDragged,
  keepUnchanged,
  LOCAL_EDGE_KEYS,
  LOCAL_NODE_KEYS,
  patchShared,
  withLocalState,
  withPositions,
} from '../flow-state';

const node = (id: string, extra: Partial<Node> = {}): Node => ({
  id,
  type: 'service',
  position: { x: 0, y: 0 },
  data: { name: id },
  ...extra,
});

const sharedFrom = (items: Node[]) => {
  const byId = new Map(items.map((item) => [item.id, item]));
  return (id: string) => byId.get(id);
};

describe('withLocalState', () => {
  it('returns the shared item when nothing is shown locally yet', () => {
    const shared = node('a');
    expect(withLocalState(shared, undefined, LOCAL_NODE_KEYS)).toBe(shared);
  });

  it('keeps local-only keys (selected, measured, dragging, resizing) from the local item', () => {
    const local = node('a', {
      selected: true,
      dragging: true,
      resizing: true,
      measured: { width: 250, height: 120 },
      position: { x: 1, y: 1 },
    });
    const shared = node('a', { position: { x: 50, y: 60 }, data: { name: 'Renamed' } });

    const result = withLocalState(shared, local, LOCAL_NODE_KEYS);

    expect(result).toEqual({
      ...shared,
      selected: true,
      dragging: true,
      resizing: true,
      measured: { width: 250, height: 120 },
    });
  });

  it('takes every other key from the shared item', () => {
    const local = node('a', { width: 100, height: 100, zIndex: 3, data: { name: 'Old' } });
    const shared = node('a', { width: 300, data: { name: 'New' } });

    const result = withLocalState(shared, local, LOCAL_NODE_KEYS);

    expect(result.width).toBe(300);
    expect(result).not.toHaveProperty('height');
    expect(result).not.toHaveProperty('zIndex');
    expect(result.data).toEqual({ name: 'New' });
  });

  it('drops a stale parentId when the shared node was dragged out of its container (regression)', () => {
    const local = node('a', { parentId: 'group-1', selected: true, position: { x: 10, y: 10 } });
    const shared = node('a', { position: { x: 210, y: 310 } });

    const result = withLocalState(shared, local, LOCAL_NODE_KEYS);

    expect(result).not.toHaveProperty('parentId');
    expect(result.position).toEqual({ x: 210, y: 310 });
    expect(result.selected).toBe(true);
  });

  it('only keeps selection locally for edges', () => {
    const local: Edge = { id: 'e', source: 'a', target: 'b', selected: true, label: 'old' };
    const shared: Edge = { id: 'e', source: 'a', target: 'c', label: 'new' };

    expect(withLocalState(shared, local, LOCAL_EDGE_KEYS)).toEqual({ ...shared, selected: true });
  });
});

describe('patchShared', () => {
  it('returns the same array when nothing changed', () => {
    const local = [node('a'), node('b')];
    expect(patchShared(local, [], sharedFrom(local), LOCAL_NODE_KEYS)).toBe(local);
  });

  it('returns the same array when a changed id was deleted but was never shown', () => {
    const local = [node('a')];
    expect(patchShared(local, ['ghost'], () => undefined, LOCAL_NODE_KEYS)).toBe(local);
  });

  it('keeps unchanged items as the same objects and replaces changed ones', () => {
    const a = node('a');
    const b = node('b');
    const c = node('c');
    const movedB = node('b', { position: { x: 5, y: 5 } });

    const result = patchShared([a, b, c], ['b'], sharedFrom([a, movedB, c]), LOCAL_NODE_KEYS);

    expect(result[0]).toBe(a);
    expect(result[2]).toBe(c);
    expect(result[1]).not.toBe(b);
    expect(result[1].position).toEqual({ x: 5, y: 5 });
  });

  it('removes deleted items', () => {
    const a = node('a');
    const b = node('b');

    const result = patchShared([a, b], ['a'], sharedFrom([b]), LOCAL_NODE_KEYS);

    expect(result).toEqual([b]);
    expect(result[0]).toBe(b);
  });

  it('appends new items at the end, in the order they changed', () => {
    const a = node('a');
    const x = node('x');
    const y = node('y');

    const result = patchShared([a], ['y', 'x'], sharedFrom([a, x, y]), LOCAL_NODE_KEYS);

    expect(result.map((item) => item.id)).toEqual(['a', 'y', 'x']);
    expect(result[0]).toBe(a);
  });

  it('keeps local-only state on changed items', () => {
    const local = node('a', { selected: true, measured: { width: 240, height: 112 } });
    const shared = node('a', { position: { x: 100, y: 100 } });

    const [result] = patchShared([local], ['a'], sharedFrom([shared]), LOCAL_NODE_KEYS);

    expect(result.selected).toBe(true);
    expect(result.measured).toEqual({ width: 240, height: 112 });
    expect(result.position).toEqual({ x: 100, y: 100 });
  });

  it('drops a stale parentId when a node was dragged out of its container (regression)', () => {
    const group = node('group-1', { type: 'domain-group' });
    const local = node('a', { parentId: 'group-1', position: { x: 20, y: 40 }, selected: true });
    const shared = node('a', { position: { x: 320, y: 440 } });

    const result = patchShared([group, local], ['a'], sharedFrom([group, shared]), LOCAL_NODE_KEYS);

    expect(result[0]).toBe(group);
    expect(result[1]).not.toHaveProperty('parentId');
    expect(result[1].position).toEqual({ x: 320, y: 440 });
    expect(result[1].selected).toBe(true);
  });

  it('handles changes, deletes and additions together', () => {
    const a = node('a');
    const b = node('b');
    const c = node('c');
    const changedC = node('c', { data: { name: 'C2' } });
    const d = node('d');

    const result = patchShared([a, b, c], ['b', 'c', 'd'], sharedFrom([a, changedC, d]), LOCAL_NODE_KEYS);

    expect(result.map((item) => item.id)).toEqual(['a', 'c', 'd']);
    expect(result[0]).toBe(a);
    expect(result[1].data).toEqual({ name: 'C2' });
  });
});

describe('keepUnchanged', () => {
  it('keeps items worked out again the same as the objects shown, and returns the array shown when none changed', () => {
    const shown = [node('a', { selected: true, measured: { width: 250, height: 120 } }), node('b', { style: { width: 300 } })];
    const again = [node('a'), node('b', { style: { width: 300 } })];

    expect(keepUnchanged(shown, again, LOCAL_NODE_KEYS)).toBe(shown);
  });

  it('replaces changed items (comparing what is in them), keeping their local state, and adds new ones', () => {
    const a = node('a');
    const b = node('b', { selected: true, measured: { width: 250, height: 120 } });
    const movedB = node('b', { position: { x: 10, y: 0 } });
    const c = node('c');

    const result = keepUnchanged([a, b], [node('a'), movedB, c], LOCAL_NODE_KEYS);

    expect(result[0]).toBe(a);
    expect(result[1]).toEqual({ ...movedB, selected: true, measured: { width: 250, height: 120 } });
    expect(result[2]).toBe(c);
  });

  it('notices changes deep in data, and items that were removed', () => {
    const a = node('a', { data: { name: 'a', counts: { services: 1 } } });
    const b = node('b');

    const result = keepUnchanged([a, b], [node('a', { data: { name: 'a', counts: { services: 2 } } })], LOCAL_NODE_KEYS);

    expect(result).toHaveLength(1);
    expect(result[0]).not.toBe(a);
    expect(result[0].data).toEqual({ name: 'a', counts: { services: 2 } });
  });
});

describe('withPositions', () => {
  const nodes: Node[] = [
    { id: 'a', position: { x: 0, y: 0 }, data: {} },
    { id: 'b', position: { x: 10, y: 10 }, data: {} },
    { id: 'c', position: { x: 20, y: 20 }, data: {}, dragging: true },
  ];

  it('moves the nodes given, keeping the others as the same objects', () => {
    const next = withPositions(nodes, new Map([['a', { x: 5, y: 5 }]]));
    expect(next[0].position).toEqual({ x: 5, y: 5 });
    expect(next[1]).toBe(nodes[1]);
  });

  it('leaves nodes being dragged here where they are', () => {
    expect(withPositions(nodes, new Map([['c', { x: 99, y: 99 }]]))).toBe(nodes);
  });

  it('returns the same array when nothing moves', () => {
    expect(withPositions(nodes, new Map([['b', { x: 10, y: 10 }]]))).toBe(nodes);
    expect(withPositions(nodes, new Map())).toBe(nodes);
  });
});

describe('keepDragged', () => {
  it('keeps nodes being dragged here where they are being dragged when a shared change arrives for them', () => {
    const previous: Node[] = [
      { id: 'a', position: { x: 50, y: 50 }, data: {}, dragging: true },
      { id: 'b', position: { x: 0, y: 0 }, data: {} },
    ];
    // Someone renamed the node being dragged, and moved the other one
    const next: Node[] = [
      { id: 'a', position: { x: 0, y: 0 }, data: { name: 'Renamed' }, dragging: true },
      { id: 'b', position: { x: 5, y: 5 }, data: {} },
    ];

    const kept = keepDragged(next, previous);
    expect(kept[0]).toMatchObject({ position: { x: 50, y: 50 }, data: { name: 'Renamed' } });
    expect(kept[1]).toBe(next[1]);
  });

  it('returns the shared nodes as they are when nothing is being dragged', () => {
    const previous: Node[] = [{ id: 'a', position: { x: 0, y: 0 }, data: {} }];
    const next: Node[] = [{ id: 'a', position: { x: 1, y: 1 }, data: {} }];
    expect(keepDragged(next, previous)).toBe(next);
  });
});
