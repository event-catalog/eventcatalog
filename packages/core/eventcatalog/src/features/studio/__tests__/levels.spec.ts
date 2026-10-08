import { describe, it, expect } from 'vitest';
import type { Edge, Node } from '@xyflow/react';
import { getLevelGraph, getLevelUnavailableReason } from '../levels';
import { getNoteLevel, isOnLevel } from '../node-types';

const node = (id: string, type: string, extra: Partial<Node> = {}): Node => ({
  id,
  type,
  position: { x: 0, y: 0 },
  data: {},
  ...extra,
});
const message = (id: string, type: 'event' | 'command' | 'query', name: string, extra: Partial<Node> = {}) =>
  node(id, type, { data: { message: { name } }, ...extra });
const edge = (source: string, target: string, label?: string): Edge => ({
  id: `${source}->${target}`,
  source,
  target,
  ...(label !== undefined && { label }),
});
const ids = (nodes: Node[]) => nodes.map((n) => n.id).sort();

describe('getLevelGraph', () => {
  describe('L3', () => {
    it('returns the canvas as it is', () => {
      const nodes = [node('a', 'service'), message('e', 'event', 'OrderPlaced')];
      const edges = [edge('a', 'e')];
      const result = getLevelGraph(nodes, edges, 3);
      expect(result.nodes).toBe(nodes);
      expect(result.edges).toBe(edges);
    });
  });

  describe('L2', () => {
    it('connects the services either side of a message directly, labelled with the message', () => {
      const nodes = [node('orders', 'service'), message('placed', 'event', 'OrderPlaced'), node('billing', 'service')];
      const edges = [edge('orders', 'placed', 'publishes \nevent'), edge('placed', 'billing', 'subscribed by')];

      const result = getLevelGraph(nodes, edges, 2);

      expect(ids(result.nodes)).toEqual(['billing', 'orders']);
      expect(result.edges).toHaveLength(1);
      // Like the visualiser: a dashed, muted "bridged" edge, labelled with the message
      expect(result.edges[0]).toMatchObject({
        id: 'bridged-orders-billing',
        source: 'orders',
        target: 'billing',
        type: 'smoothstep',
        label: 'publishes\nOrderPlaced',
        style: { strokeDasharray: '5 5' },
        markerEnd: { type: 'arrowclosed', width: 20, height: 20 },
      });
      expect(result.edges[0]).not.toHaveProperty('data');
    });

    it('leaves edges through channels only unlabelled', () => {
      const result = getLevelGraph(
        [node('orders', 'service'), node('bus', 'channel'), node('billing', 'service')],
        [edge('orders', 'bus', 'publishes to'), edge('bus', 'billing', 'routes to')],
        2
      );
      expect(result.edges).toEqual([expect.objectContaining({ id: 'bridged-orders-billing' })]);
      expect(result.edges[0]).not.toHaveProperty('label');
    });

    it('carries messages through channels too', () => {
      const nodes = [
        node('orders', 'service'),
        message('placed', 'event', 'OrderPlaced'),
        node('bus', 'channel'),
        node('billing', 'service'),
      ];
      const edges = [edge('orders', 'placed'), edge('placed', 'bus'), edge('bus', 'billing')];

      const result = getLevelGraph(nodes, edges, 2);

      expect(ids(result.nodes)).toEqual(['billing', 'orders']);
      expect(result.edges.map(({ source, target }) => `${source}->${target}`)).toEqual(['orders->billing']);
      expect(result.edges[0].label).toBe('publishes\nOrderPlaced');
    });

    it('merges several messages between the same services into one edge', () => {
      const nodes = [
        node('orders', 'service'),
        message('placed', 'event', 'OrderPlaced'),
        message('cancelled', 'event', 'OrderCancelled'),
        node('billing', 'service'),
      ];
      const edges = [
        edge('orders', 'placed'),
        edge('placed', 'billing'),
        edge('orders', 'cancelled'),
        edge('cancelled', 'billing'),
      ];

      const result = getLevelGraph(nodes, edges, 2);

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].label).toBe('publishes\n2 events');
    });

    it('keeps edges between nodes that are not messages, with their labels', () => {
      const nodes = [node('orders', 'service'), node('db', 'data')];
      const edges = [edge('orders', 'db', 'writes to')];

      const result = getLevelGraph(nodes, edges, 2);

      // The canvas's own edge, as it is
      expect(result.edges).toEqual(edges);
    });

    it('leaves containers to be sized by the layout (to fit what is in them, or as empty ones)', () => {
      const nodes = [
        node('full', 'domain-group', { width: 720, height: 460, measured: { width: 720, height: 460 } }),
        node('svc', 'service', { parentId: 'full' }),
        node('empty', 'system-group', { width: 560, height: 360, measured: { width: 560, height: 360 } }),
        // Only a message in this container: hidden at L2, so the container is left empty
        { ...message('only-message', 'event', 'X'), parentId: 'empty' },
      ];

      const result = getLevelGraph(nodes, [], 2);
      const full = result.nodes.find((n) => n.id === 'full')!;
      const empty = result.nodes.find((n) => n.id === 'empty')!;

      expect(full.width).toBeUndefined();
      expect(full.height).toBeUndefined();
      expect(full.measured).toBeUndefined();
      expect(empty.width).toBeUndefined();
      expect(empty.measured).toBeUndefined();
    });
  });

  describe('L1', () => {
    // A domain container with a system container inside it (two services in that), a system card with a
    // service connected to it with "contains", and a loose service
    const nodes = [
      node('domain', 'domain-group', { width: 720, height: 460 }),
      node('checkout', 'system-group', { width: 560, height: 360, parentId: 'domain' }),
      node('orders', 'service', { parentId: 'checkout' }),
      node('payments', 'service', { parentId: 'checkout' }),
      node('warehouse', 'system'),
      node('stock', 'service'),
      node('emails', 'service'),
      message('placed', 'event', 'OrderPlaced'),
      message('reserve', 'command', 'ReserveStock'),
      node('db', 'data', { parentId: 'checkout' }),
      node('loose-db', 'data'),
      node('sticky', 'note'),
    ];
    const edges = [
      edge('orders', 'payments', 'calls'),
      edge('orders', 'placed'),
      edge('placed', 'emails'),
      edge('warehouse', 'stock', 'contains'),
      edge('orders', 'reserve'),
      edge('reserve', 'stock'),
      edge('orders', 'db'),
      edge('emails', 'loose-db'),
    ];
    const result = getLevelGraph(nodes, edges, 1);

    it('folds services into the system container they sit in and the system card they are connected to', () => {
      expect(ids(result.nodes)).toEqual(['checkout', 'domain', 'emails', 'warehouse']);
    });

    it('connects the systems, carrying messages through', () => {
      const byPair = new Map(result.edges.map((e) => [`${e.source}->${e.target}`, e]));
      expect([...byPair.keys()].sort()).toEqual(['checkout->emails', 'checkout->warehouse']);
      // Through messages: dashed, muted edges labelled with them, like EventCatalog's diagrams
      expect(byPair.get('checkout->emails')).toMatchObject({
        id: 'bridged-checkout-emails',
        label: 'publishes\nOrderPlaced',
        type: 'smoothstep',
      });
      expect(byPair.get('checkout->warehouse')).toMatchObject({ label: 'invokes\nReserveStock', type: 'smoothstep' });
      expect(byPair.get('checkout->warehouse')).not.toHaveProperty('data');
    });

    it('drops edges inside what was folded, and "contains" edges', () => {
      expect(result.edges.some((e) => e.source === e.target)).toBe(false);
      expect(result.edges.some((e) => e.label === 'contains')).toBe(false);
    });

    it('shows systems as cards in their domain container, with how many services they hold', () => {
      const domain = result.nodes.find((n) => n.id === 'domain')!;
      const checkout = result.nodes.find((n) => n.id === 'checkout')!;
      expect(checkout).toMatchObject({
        type: 'system',
        parentId: 'domain',
        data: { servicesCount: 2, containersCount: 1, messagesCount: 2 },
      });
      // Sized as a card by the layout, not as the container it is on the canvas
      expect(checkout).not.toHaveProperty('width');
      expect(checkout).not.toHaveProperty('measured');
      expect(domain.width).toBeUndefined();
    });

    it('connects systems through messages that sit in their domain rather than a system', () => {
      const result = getLevelGraph(
        [
          node('domain', 'domain-group'),
          node('inventory', 'system-group', { parentId: 'domain' }),
          node('stock', 'service', { parentId: 'inventory' }),
          node('shipping', 'system-group', { parentId: 'domain' }),
          node('ship', 'service', { parentId: 'shipping' }),
          message('reserved', 'event', 'StockReserved', { parentId: 'domain' }),
        ],
        [edge('stock', 'reserved'), edge('reserved', 'ship')],
        1
      );
      expect(result.edges).toEqual([
        expect.objectContaining({ source: 'inventory', target: 'shipping', label: 'publishes\nStockReserved' }),
      ]);
    });

    it('drops edges between a system and the domain it is in', () => {
      const result = getLevelGraph(
        [
          node('domain', 'domain-group'),
          node('loose', 'service', { parentId: 'domain' }),
          node('inventory', 'system-group', { parentId: 'domain' }),
          node('stock', 'service', { parentId: 'inventory' }),
        ],
        [edge('loose', 'stock', 'calls'), edge('stock', 'loose', 'replies')],
        1
      );
      expect(result.edges).toEqual([]);
    });

    it('folds services into a domain card when they are not in a system', () => {
      const result = getLevelGraph(
        [node('sales', 'context-domain'), node('crm', 'service'), node('other', 'service')],
        [edge('sales', 'crm', 'contains'), edge('crm', 'other', 'calls')],
        1
      );
      expect(ids(result.nodes)).toEqual(['other', 'sales']);
      // A plain edge: no messages, so no label (like the visualiser)
      expect(result.edges).toEqual([
        expect.objectContaining({
          id: 'level-sales-other',
          source: 'sales',
          target: 'other',
          style: { strokeWidth: 1, stroke: 'var(--ec-edge-stroke, #6b7280)' },
        }),
      ]);
      expect(result.edges[0]).not.toHaveProperty('label');
    });

    it('shows a domain container with no system in it as a domain card', () => {
      const result = getLevelGraph(
        [
          node('sales', 'domain-group', { data: { domain: { name: 'Sales' } } }),
          node('crm', 'service', { parentId: 'sales' }),
          node('hr', 'domain-group'),
        ],
        [],
        1
      );
      expect(result.nodes.find((n) => n.id === 'sales')).toMatchObject({
        type: 'context-domain',
        data: { domain: { name: 'Sales' }, servicesCount: 1, systemsCount: 0, subdomain: false },
      });
    });

    it('keeps the labels of actors connections, like relationships', () => {
      const result = getLevelGraph([node('customer', 'actor'), node('shop', 'system')], [edge('customer', 'shop', 'uses')], 1);
      expect(result.edges).toEqual([expect.objectContaining({ label: 'uses' })]);
    });
  });
});

describe('sticky notes on levels', () => {
  it('are on the level they were added on, and notes without one are on L3', () => {
    expect(getNoteLevel(node('n1', 'note', { data: { text: '', level: 1 } }))).toBe(1);
    expect(getNoteLevel(node('n2', 'note', { data: { text: '' } }))).toBe(3);
    expect(getNoteLevel(node('s', 'service'))).toBeUndefined();
  });

  it('are only on their own level, while other nodes are on L3', () => {
    const l1Note = node('n1', 'note', { data: { text: '', level: 1 } });
    expect(isOnLevel(l1Note, 1)).toBe(true);
    expect(isOnLevel(l1Note, 3)).toBe(false);
    expect(isOnLevel(node('n2', 'note', { data: { text: '' } }), 3)).toBe(true);
    expect(isOnLevel(node('s', 'service'), 3)).toBe(true);
  });

  it.each([1, 2] as const)('are not laid out with L%i (the level shows them where they were put)', (level) => {
    const nodes = [
      node('orders', 'service'),
      node('billing', 'service'),
      node('n1', 'note', { data: { text: 'Why?', level } }),
      node('n3', 'note', { data: { text: 'Old' } }),
    ];
    const result = getLevelGraph(nodes, [edge('orders', 'billing')], level);
    expect(result.nodes.some((n) => n.type === 'note')).toBe(false);
  });
});

describe('getLevelUnavailableReason', () => {
  it('says L1 is not available without systems or domains to relate (one domain on its own, like the visualiser)', () => {
    expect(getLevelUnavailableReason([node('a', 'service')], 1)).toMatch(/system, or more than one domain/);
    expect(getLevelUnavailableReason([node('d', 'domain-group'), node('a', 'service')], 1)).toMatch(/system/);
  });

  it('allows L1 with a system (container or card), or more than one domain', () => {
    expect(getLevelUnavailableReason([node('s', 'system-group')], 1)).toBeUndefined();
    expect(getLevelUnavailableReason([node('s', 'system')], 1)).toBeUndefined();
    expect(getLevelUnavailableReason([node('d', 'domain-group'), node('e', 'context-domain')], 1)).toBeUndefined();
  });

  it('always allows L2, like the visualiser', () => {
    expect(getLevelUnavailableReason([node('a', 'service')], 2)).toBeUndefined();
  });

  it('always allows L3', () => {
    expect(getLevelUnavailableReason([], 3)).toBeUndefined();
  });
});
