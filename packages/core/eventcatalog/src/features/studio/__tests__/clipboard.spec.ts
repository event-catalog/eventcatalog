import { describe, it, expect } from 'vitest';
import type { Edge, Node } from '@xyflow/react';
import { copyNodes, pasteNodes, readClipboard } from '../clipboard';

const node = (id: string, x: number, y: number, extra: Partial<Node> = {}): Node => ({
  id,
  type: 'service',
  position: { x, y },
  data: { service: { name: id } },
  width: 200,
  height: 100,
  ...extra,
});
const container = (id: string, x: number, y: number) => node(id, x, y, { type: 'domain-group', width: 600, height: 400 });
const edge = (source: string, target: string): Edge => ({ id: `${source}-${target}`, source, target });

describe('copyNodes', () => {
  it('copies the selected nodes and the connections between them, without local state', () => {
    const content = copyNodes(
      [node('a', 0, 0, { selected: true, measured: { width: 1, height: 1 } }), node('b', 400, 0), node('c', 800, 0)],
      [{ ...edge('a', 'b'), selected: true }, edge('b', 'c')],
      ['a', 'b']
    )!;

    expect(content.nodes.map((n) => n.id)).toEqual(['a', 'b']);
    expect(content.nodes[0]).not.toHaveProperty('selected');
    expect(content.nodes[0]).not.toHaveProperty('measured');
    expect(content.edges).toEqual([edge('a', 'b')]);
  });

  it('copies what is inside a selected container, and takes nodes copied without their container out of it', () => {
    const nodes = [
      container('d', 100, 100),
      node('inside', 40, 80, { parentId: 'd' }),
      node('alone', 300, 80, { parentId: 'd' }),
    ];

    const withContainer = copyNodes(nodes, [], ['d'])!;
    expect(withContainer.nodes.map((n) => n.id)).toEqual(['d', 'inside', 'alone']);
    expect(withContainer.nodes[1]).toMatchObject({ parentId: 'd', position: { x: 40, y: 80 } });

    const withoutContainer = copyNodes(nodes, [], ['alone'])!;
    expect(withoutContainer.nodes[0]).not.toHaveProperty('parentId');
    expect(withoutContainer.nodes[0].position).toEqual({ x: 400, y: 180 });
  });

  it('copies nothing when nothing is selected', () => {
    expect(copyNodes([node('a', 0, 0)], [], [])).toBeNull();
  });
});

describe('pasteNodes', () => {
  const content = copyNodes([node('a', 0, 0), node('b', 400, 0)], [edge('a', 'b')], ['a', 'b'])!;

  it('makes copies with new ids, connected to each other', () => {
    const { nodes, edges } = pasteNodes(content, [], { offset: { x: 40, y: 40 } });

    expect(nodes.map((n) => n.id)).not.toContain('a');
    expect(nodes.map((n) => n.position)).toEqual([
      { x: 40, y: 40 },
      { x: 440, y: 40 },
    ]);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ source: nodes[0].id, target: nodes[1].id });
    expect(edges[0].id).not.toBe('a-b');
  });

  it('centres the copies on a point', () => {
    const { nodes } = pasteNodes(content, [], { at: { x: 1000, y: 1000 } });
    // The copies span 0..600 by 0..100, so their middle is 300, 50
    expect(nodes.map((n) => n.position)).toEqual([
      { x: 700, y: 950 },
      { x: 1100, y: 950 },
    ]);
  });

  it('puts copies that land in a container inside it', () => {
    const domain = container('d', 1000, 1000);
    const single = copyNodes([node('a', 0, 0)], [], ['a'])!;
    const { nodes } = pasteNodes(single, [domain], { at: { x: 1200, y: 1200 } });
    expect(nodes[0]).toMatchObject({ parentId: 'd', position: { x: 100, y: 150 } });
  });

  it('pastes a sticky note on the canvas, even over a container', () => {
    const domain = container('d', 1000, 1000);
    const note = copyNodes([node('n', 0, 0, { type: 'note' })], [], ['n'])!;
    const { nodes } = pasteNodes(note, [domain], { at: { x: 1200, y: 1200 } });
    expect(nodes[0]).not.toHaveProperty('parentId');
  });

  it('keeps copied containers and their contents together', () => {
    const copied = copyNodes([container('d', 0, 0), node('inside', 40, 80, { parentId: 'd' })], [], ['d'])!;
    const { nodes } = pasteNodes(copied, [], { offset: { x: 10, y: 10 } });
    expect(nodes[1]).toMatchObject({ parentId: nodes[0].id, position: { x: 40, y: 80 } });
    expect(nodes[0].position).toEqual({ x: 10, y: 10 });
  });
});

describe('readClipboard', () => {
  it("reads Studio's content back, and nothing else", () => {
    const content = copyNodes([node('a', 0, 0)], [], ['a'])!;
    expect(readClipboard(JSON.stringify(content))).toEqual(content);
    expect(readClipboard('Orders Service')).toBeNull();
    expect(readClipboard(JSON.stringify({ nodes: [], edges: [] }))).toBeNull();
    expect(readClipboard(undefined)).toBeNull();
  });
});
