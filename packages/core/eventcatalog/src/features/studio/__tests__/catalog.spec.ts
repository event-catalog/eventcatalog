import { describe, it, expect } from 'vitest';
import type { Node } from '@xyflow/react';
import {
  buildContainer,
  buildContainerWithContents,
  catalogNodeData,
  getCatalogLink,
  getContents,
  getRelatedEdges,
} from '../catalog';
import { catalog, resourceByKey } from './catalog-fixture';

const onCanvas = (key: string, id: string, type?: string): Node => {
  const resource = resourceByKey(key);
  return { id, type: type ?? resource.node.type, position: { x: 0, y: 0 }, data: catalogNodeData(resource) };
};

describe('getRelatedEdges', () => {
  const orderService = resourceByKey('services:OrderService');

  it('connects a dropped resource to related resources already on the canvas, with EventCatalog wording', () => {
    const existing = [onCanvas('events:OrderPlaced', 'evt'), onCanvas('services:Shipping', 'unrelated')];

    const edges = getRelatedEdges(orderService, 'new', existing, catalog.relationsByKey);

    expect(edges).toEqual([
      expect.objectContaining({
        source: 'new',
        target: 'evt',
        type: 'animated',
        label: 'publishes \nevent',
        data: { message: { collection: 'events' } },
      }),
    ]);
  });

  it('connects in the direction of the relation', () => {
    const edges = getRelatedEdges(
      resourceByKey('services:Billing'),
      'new',
      [onCanvas('events:OrderPlaced', 'evt')],
      catalog.relationsByKey
    );
    expect(edges).toEqual([expect.objectContaining({ source: 'evt', target: 'new', label: 'subscribed by' })]);
  });

  it('connects a system card to its services with "contains"', () => {
    const edges = getRelatedEdges(orderService, 'new', [onCanvas('systems:Checkout', 'sys')], catalog.relationsByKey);
    expect(edges).toEqual([expect.objectContaining({ source: 'sys', target: 'new', label: 'contains' })]);
  });

  it('does not connect "contains" to a container on the canvas', () => {
    const existing = [onCanvas('systems:Checkout', 'sys', 'system-group'), onCanvas('events:OrderPlaced', 'evt')];
    const edges = getRelatedEdges(orderService, 'new', existing, catalog.relationsByKey);
    expect(edges.map((edge) => edge.target)).toEqual(['evt']);
  });

  it('does not connect "contains" from a container being dropped', () => {
    const checkout = resourceByKey('systems:Checkout');
    const existing = [onCanvas('services:OrderService', 'svc')];
    expect(getRelatedEdges(checkout, 'new', existing, catalog.relationsByKey, 'system-group')).toEqual([]);
    // As a card it does
    expect(getRelatedEdges(checkout, 'new', existing, catalog.relationsByKey)).toEqual([
      expect.objectContaining({ source: 'new', target: 'svc', label: 'contains' }),
    ]);
  });

  it('connects to every copy of a related resource on the canvas', () => {
    const existing = [onCanvas('events:OrderPlaced', 'evt-1'), onCanvas('events:OrderPlaced', 'evt-2')];
    const edges = getRelatedEdges(orderService, 'new', existing, catalog.relationsByKey);
    expect(edges.map((edge) => edge.target)).toEqual(['evt-1', 'evt-2']);
  });
});

describe('buildContainer', () => {
  it('builds a domain as an empty container centred on a point, linked to the catalog', () => {
    const container = buildContainer(resourceByKey('domains:Orders'), { x: 0, y: 0 });
    expect(container).toMatchObject({
      type: 'domain-group',
      position: { x: -360, y: -230 },
      width: 720,
      height: 460,
      zIndex: -1,
      data: {
        domain: { id: 'Orders', name: 'Orders', version: '1.0.0', summary: 'Orders summary' },
        catalog: { key: 'domains:Orders', url: '/docs/domains/Orders/1.0.0', version: '1.0.0' },
      },
    });
  });

  it('builds a system as a system container', () => {
    const container = buildContainer(resourceByKey('systems:Checkout'), { x: 0, y: 0 });
    expect(container.type).toBe('system-group');
    expect(container.data).toHaveProperty('system.name', 'Checkout');
    expect(container.data).not.toHaveProperty('system.scope');
  });

  it('keeps an external system marked as one', () => {
    expect(buildContainer(resourceByKey('systems:Inventory'), { x: 0, y: 0 }).data).toHaveProperty('system.scope', 'external');
  });
});

describe('getContents', () => {
  it("returns a domain's systems and services", () => {
    expect(getContents(resourceByKey('domains:Orders'), catalog).map((r) => r.key)).toEqual([
      'systems:Checkout',
      'services:Billing',
    ]);
  });

  it("returns a system's services", () => {
    expect(getContents(resourceByKey('systems:Checkout'), catalog).map((r) => r.key)).toEqual(['services:OrderService']);
  });

  it('returns nothing for resources that contain nothing', () => {
    expect(getContents(resourceByKey('services:OrderService'), catalog)).toEqual([]);
    expect(getContents(resourceByKey('systems:Inventory'), catalog)).toEqual([]);
  });
});

describe('buildContainerWithContents', () => {
  const keyOf = (node: Node) => getCatalogLink(node)?.key;

  it('adds a domain with its systems, services, their messages and data stores, laid out and centred', async () => {
    const { nodes, edges } = await buildContainerWithContents(resourceByKey('domains:Orders'), { x: 1000, y: 500 }, catalog, []);

    const byKey = new Map(nodes.map((node) => [keyOf(node), node]));
    expect([...byKey.keys()].sort()).toEqual([
      'containers:OrdersDb',
      'domains:Orders',
      'events:OrderPlaced',
      'services:Billing',
      'services:OrderService',
      'systems:Checkout',
    ]);

    const root = byKey.get('domains:Orders')!;
    expect(root.type).toBe('domain-group');
    expect(root.parentId).toBeUndefined();
    expect(root.position.x + root.width! / 2).toBeCloseTo(1000);
    expect(root.position.y + root.height! / 2).toBeCloseTo(500);

    const checkout = byKey.get('systems:Checkout')!;
    expect(checkout).toMatchObject({ type: 'system-group', parentId: root.id });
    expect(checkout.width).toBeGreaterThan(0);
    expect(byKey.get('services:OrderService')!.parentId).toBe(checkout.id);
    expect(byKey.get('containers:OrdersDb')!.parentId).toBe(checkout.id);
    expect(byKey.get('services:Billing')!.parentId).toBe(root.id);
    expect(byKey.get('events:OrderPlaced')!.parentId).toBe(root.id);

    const ids = (key: string) => byKey.get(key)!.id;
    const pairs = edges.map((edge) => `${edge.source}->${edge.target}`).sort();
    expect(pairs).toEqual(
      [
        `${ids('services:OrderService')}->${ids('events:OrderPlaced')}`,
        `${ids('services:OrderService')}->${ids('containers:OrdersDb')}`,
        `${ids('events:OrderPlaced')}->${ids('services:Billing')}`,
      ].sort()
    );
  });

  it('does not add resources already on the canvas again, and connects to them', async () => {
    const existing = [onCanvas('events:OrderPlaced', 'existing-event')];

    const { nodes, edges } = await buildContainerWithContents(resourceByKey('domains:Orders'), { x: 0, y: 0 }, catalog, existing);

    expect(nodes.some((node) => keyOf(node) === 'events:OrderPlaced')).toBe(false);
    const service = nodes.find((node) => keyOf(node) === 'services:OrderService')!;
    const billing = nodes.find((node) => keyOf(node) === 'services:Billing')!;
    expect(edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: service.id, target: 'existing-event' }),
        expect.objectContaining({ source: 'existing-event', target: billing.id }),
      ])
    );
  });

  it('returns just the container, centred, when the resource contains nothing', async () => {
    const { nodes, edges } = await buildContainerWithContents(
      resourceByKey('systems:Inventory'),
      { x: 100, y: 100 },
      catalog,
      []
    );
    expect(edges).toEqual([]);
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({ type: 'system-group', position: { x: -180, y: -80 }, width: 560, height: 360 });
  });
});
