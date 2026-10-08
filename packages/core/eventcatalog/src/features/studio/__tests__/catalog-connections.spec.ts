import { describe, it, expect } from 'vitest';
import { buildNode } from '../canvas-doc';
import { buildContainer, catalogNodeData, getCatalogLink } from '../catalog';
import { getCatalogConnections, nodeCenter, planWithConnections } from '../canvas-actions';
import { catalog, resourceByKey } from './catalog-fixture';

const orderService = resourceByKey('services:OrderService');
const orderPlaced = resourceByKey('events:OrderPlaced');
const groupsOf = (key: string, onCanvas: string[] = []) =>
  Object.fromEntries(
    getCatalogConnections(resourceByKey(key), catalog, new Set(onCanvas)).map((group) => [
      group.id,
      group.resources.map((resource) => resource.key),
    ])
  );
const everything = (key: string) =>
  getCatalogConnections(resourceByKey(key), catalog, new Set()).flatMap((group) => group.resources);
const keysOf = (nodes: { data: Record<string, unknown> }[]) => nodes.map((node) => getCatalogLink(node)?.key);

describe('getCatalogConnections', () => {
  it("finds a service's messages and data stores", () => {
    expect(groupsOf('services:OrderService')).toEqual({ sends: ['events:OrderPlaced'], dataStores: ['containers:OrdersDb'] });
    expect(groupsOf('services:Billing')).toEqual({ receives: ['events:OrderPlaced'] });
  });

  it('finds the services that send and receive a message', () => {
    expect(groupsOf('events:OrderPlaced')).toEqual({
      senders: ['services:OrderService'],
      receivers: ['services:Billing', 'services:Shipping'],
    });
  });

  it('leaves out what is already on the canvas, and what contains it', () => {
    expect(groupsOf('services:OrderService', ['events:OrderPlaced'])).toEqual({ dataStores: ['containers:OrdersDb'] });
    expect(groupsOf('events:OrderPlaced', ['services:OrderService', 'services:Billing', 'services:Shipping'])).toEqual({});
  });
});

describe('planWithConnections', () => {
  it('centres the service where it was dropped, with what it sends after it, all connected', () => {
    const { nodes, edges } = planWithConnections(
      [],
      orderService,
      { x: 400, y: 300 },
      everything('services:OrderService'),
      catalog
    );

    const [service, event, db] = nodes;
    expect(keysOf(nodes)).toEqual(['services:OrderService', 'events:OrderPlaced', 'containers:OrdersDb']);
    expect(nodeCenter(service)).toEqual({ x: 400, y: 300 });
    expect(event.position.x).toBeGreaterThan(service.position.x);
    expect(edges.map((edge) => [edge.source, edge.target])).toEqual(
      expect.arrayContaining([
        [service.id, event.id],
        [service.id, db.id],
      ])
    );
  });

  it('puts the services that send a message before it, and the ones that receive it after it', () => {
    const { nodes, edges } = planWithConnections([], orderPlaced, { x: 400, y: 300 }, everything('events:OrderPlaced'), catalog);
    const byKey = new Map(nodes.map((node) => [getCatalogLink(node)?.key, node]));
    const event = byKey.get('events:OrderPlaced')!;

    expect(nodeCenter(event)).toEqual({ x: 400, y: 300 });
    expect(byKey.get('services:OrderService')!.position.x).toBeLessThan(event.position.x);
    expect(byKey.get('services:Billing')!.position.x).toBeGreaterThan(event.position.x);
    expect(byKey.get('services:Shipping')!.position.x).toBeGreaterThan(event.position.x);
    expect(edges.map((edge) => [edge.source, edge.target])).toEqual(
      expect.arrayContaining([
        [byKey.get('services:OrderService')!.id, event.id],
        [event.id, byKey.get('services:Billing')!.id],
        [event.id, byKey.get('services:Shipping')!.id],
      ])
    );
  });

  it('connects to related resources already on the canvas', () => {
    const billing = buildNode('service', catalogNodeData(resourceByKey('services:Billing')), { x: 1200, y: 300 });
    const include = getCatalogConnections(orderService, catalog, new Set(['services:Billing']))
      .filter((group) => group.id === 'sends')
      .flatMap((group) => group.resources);
    const { nodes, edges } = planWithConnections([billing], orderService, { x: 200, y: 300 }, include, catalog);
    expect(edges.map((edge) => [edge.source, edge.target])).toContainEqual([nodes[1].id, billing.id]);
  });

  it('puts the service and its data stores in the container it was dropped on (not its messages)', () => {
    const checkout = { ...buildContainer(resourceByKey('systems:Checkout'), { x: 400, y: 300 }), width: 800, height: 600 };
    const { nodes } = planWithConnections(
      [checkout],
      orderService,
      { x: 400, y: 300 },
      everything('services:OrderService'),
      catalog
    );
    expect(Object.fromEntries(nodes.map((node) => [getCatalogLink(node)?.key, node.parentId]))).toEqual({
      'services:OrderService': checkout.id,
      'events:OrderPlaced': undefined,
      'containers:OrdersDb': checkout.id,
    });
  });
});
