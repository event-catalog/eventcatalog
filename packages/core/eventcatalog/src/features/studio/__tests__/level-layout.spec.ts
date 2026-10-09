import { describe, it, expect } from 'vitest';
import type { Edge, Node } from '@xyflow/react';
import { arrangeLevel, levelPlaces, withDiagramRoutes } from '../level-layout';

const node = (id: string, type: string, extra: Partial<Node> = {}): Node => ({
  id,
  type,
  position: { x: 0, y: 0 },
  data: {},
  ...extra,
});
const edge = (source: string, target: string): Edge => ({ id: `${source}->${target}`, source, target });

// L1 of a canvas: a domain with a system in it, and a system outside it
const level = {
  nodes: [node('orders', 'domain-group'), node('checkout', 'system', { parentId: 'orders' }), node('billing', 'system')],
  edges: [edge('checkout', 'billing')],
};

describe('arrangeLevel', () => {
  it('puts each node where the level has it, containers at their size', () => {
    const layout = new Map([
      ['orders', { x: 0, y: 0, width: 600, height: 400 }],
      ['checkout', { x: 60, y: 100 }],
      ['billing', { x: 900, y: 100 }],
    ]);
    const { graph, placed } = arrangeLevel(level, layout)!;
    expect(graph.nodes.map((n) => [n.id, n.position])).toEqual([
      ['orders', { x: 0, y: 0 }],
      ['checkout', { x: 60, y: 100 }],
      ['billing', { x: 900, y: 100 }],
    ]);
    expect(graph.nodes[0].style).toEqual({ width: 600, height: 400 });
    // Nothing new: nothing to keep
    expect(placed.size).toBe(0);
  });

  it('uses where the diagram had something the level has no place for yet', () => {
    const { graph } = arrangeLevel(
      level,
      new Map([['billing', { x: 900, y: 100 }]]),
      levelPlaces([
        node('orders', 'domain-group', { position: { x: 5, y: 5 }, style: { width: 600, height: 400 } }),
        node('checkout', 'system', { position: { x: 60, y: 100 } }),
      ])
    )!;
    expect(graph.nodes.map((n) => n.position)).toEqual([
      { x: 5, y: 5 },
      { x: 60, y: 100 },
      { x: 900, y: 100 },
    ]);
  });

  it('places something new next to what it connects to, without moving anything that is there', () => {
    const layout = new Map([
      ['orders', { x: 0, y: 0, width: 600, height: 400 }],
      ['checkout', { x: 60, y: 100 }],
      ['billing', { x: 900, y: 100 }],
    ]);
    const withNew = { nodes: [...level.nodes, node('shipping', 'system')], edges: [...level.edges, edge('billing', 'shipping')] };
    const { graph, placed } = arrangeLevel(withNew, layout)!;
    const at = new Map(graph.nodes.map((n) => [n.id, n.position]));
    expect(at.get('billing')).toEqual({ x: 900, y: 100 });
    expect(at.get('checkout')).toEqual({ x: 60, y: 100 });
    // After billing, which sends to it (left to right), lined up with it
    expect(at.get('shipping')!.x).toBeGreaterThan(900);
    expect(at.get('shipping')!.y).toBe(100);
    expect([...placed.keys()]).toEqual(['shipping']);
  });

  it('grows a container to fit something new put in it, keeping what is in it where it is on the level', () => {
    const layout = new Map([
      ['orders', { x: 0, y: 0, width: 400, height: 300 }],
      ['checkout', { x: 60, y: 100 }],
      ['billing', { x: 900, y: 100 }],
    ]);
    const withNew = {
      nodes: [...level.nodes, node('payments', 'system', { parentId: 'orders' })],
      edges: [...level.edges, edge('checkout', 'payments')],
    };
    const { graph, placed } = arrangeLevel(withNew, layout)!;
    const orders = graph.nodes.find((n) => n.id === 'orders')!;
    expect((orders.style?.width as number) > 400).toBe(true);
    expect(graph.nodes.find((n) => n.id === 'checkout')!.position).toEqual({ x: 60, y: 100 });
    expect(placed.has('payments')).toBe(true);
    expect(placed.get('orders')).toMatchObject({ x: 0, y: 0, width: orders.style?.width });
  });

  it('shows a container with nothing in it at the size the visualiser lays empty ones out at', () => {
    const withEmpty = { nodes: [...level.nodes, node('shipping', 'system-group')], edges: level.edges };
    const layout = new Map([
      ['orders', { x: 0, y: 0, width: 600, height: 400 }],
      ['checkout', { x: 60, y: 100 }],
      ['billing', { x: 900, y: 100 }],
      ['shipping', { x: 0, y: 600 }],
    ]);
    const { graph } = arrangeLevel(withEmpty, layout)!;
    expect(graph.nodes.find((n) => n.id === 'shipping')!.style).toEqual({ width: 320, height: 160 });
  });

  it('leaves a level that has no places at all to be laid out from scratch', () => {
    expect(arrangeLevel(level, new Map())).toBeUndefined();
  });
});

describe('withDiagramRoutes', () => {
  it('draws connections the diagram had along its routes, and leaves the rest', () => {
    const route = {
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
    };
    const edges = withDiagramRoutes([edge('a', 'b'), edge('b', 'c')], [{ ...edge('a', 'b'), id: 'diagram-0', data: { route } }]);
    expect(edges[0].data).toEqual({ route });
    expect(edges[1]).toEqual(edge('b', 'c'));
  });
});
