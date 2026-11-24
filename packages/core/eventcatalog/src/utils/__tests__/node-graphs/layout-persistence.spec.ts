import { describe, expect, it } from 'vitest';
import { applyLayoutToNodes, type SavedLayout } from '@utils/node-graphs/layout-persistence';

const node = (id: string, x = 0, y = 0) => ({ id, position: { x, y } });

const layout = (positions: SavedLayout['positions']): SavedLayout => ({
  version: 1,
  savedAt: '2026-06-29T08:55:18.430Z',
  resourceKey: 'system-context-map/system-context-map/1.0.0',
  positions,
});

describe('applyLayoutToNodes', () => {
  it('uses the laid out positions when nothing was saved', () => {
    const nodes = [node('a', 10, 20)];
    expect(applyLayoutToNodes(nodes, null)).toBe(nodes);
  });

  it('puts every node where it was saved when the layout knows them all', () => {
    const nodes = [node('a'), node('b')];
    const result = applyLayoutToNodes(nodes, layout({ a: { x: 1, y: 2 }, b: { x: 3, y: 4 } }));
    expect(result.map((n) => n.position)).toEqual([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ]);
  });

  it('ignores saved positions of nodes no longer on the diagram', () => {
    const result = applyLayoutToNodes([node('a')], layout({ a: { x: 1, y: 2 }, removed: { x: 9, y: 9 } }));
    expect(result).toEqual([{ id: 'a', position: { x: 1, y: 2 } }]);
  });

  it('lays the diagram out automatically again once it has a node the saved layout does not know', () => {
    // Saved before "new" was added: mixing its saved positions with the automatic ones overlaps nodes
    const nodes = [node('a', 10, 20), node('new', 30, 40)];
    expect(applyLayoutToNodes(nodes, layout({ a: { x: 500, y: 500 } }))).toBe(nodes);
  });

  it('keeps the saved positions it has, and new nodes their own, when partial layouts are allowed (designs)', () => {
    const nodes = [node('a', 10, 20), node('new', 30, 40)];
    const result = applyLayoutToNodes(nodes, layout({ a: { x: 500, y: 500 } }), { allowPartial: true });
    expect(result.map((n) => n.position)).toEqual([
      { x: 500, y: 500 },
      { x: 30, y: 40 },
    ]);
  });
});
