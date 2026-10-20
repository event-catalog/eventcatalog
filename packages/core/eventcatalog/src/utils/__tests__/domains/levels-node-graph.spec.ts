import { expect, describe, it, vi } from 'vitest';
import {
  buildDomainGraph,
  buildDomainTree,
  collapseSystems,
  collectOwners,
  getNodesAndEdges,
  markCrossDomain,
  placeMessagesWithPublishers,
} from '@utils/node-graphs/domain-levels-node-graph';
import { getDomains } from '@utils/collections/domains';

const entry = (collection: string, id: string, data: Record<string, any> = {}) => ({
  id: `${collection}/${id}`,
  collection,
  data: { id, name: id, version: '1.0.0', ...data },
});

// Orders domain: the Checkout system (with a service) and an empty Returns system.
// Shipping domain: the Delivery system, whose service consumes an Orders message.
const checkoutService = entry('services', 'CheckoutService');
const deliveryService = entry('services', 'DeliveryService');
const checkout = entry('systems', 'Checkout', { services: [checkoutService] });
const returns = entry('systems', 'Returns', { services: [] });
const delivery = entry('systems', 'Delivery', { services: [deliveryService] });
// Reviews domain: a service that isn't in a system
const reviewService = entry('services', 'ReviewService');
// Customer domain: no systems of its own, and a Loyalty subdomain with a system
const loyaltyService = entry('services', 'LoyaltyService');
const loyaltySystem = entry('systems', 'LoyaltySystem', { services: [loyaltyService] });
const loyalty = entry('domains', 'Loyalty', { systems: [loyaltySystem], services: [] });
// A subdomain without systems (its service's diagram is the Review service's mock below)
const notifications = entry('domains', 'Notifications', { systems: [], services: [entry('services', 'NotificationService')] });
// Shipping's Tracking subdomain, with a service outside a system
const trackingService = entry('services', 'TrackingService');
const tracking = entry('domains', 'Tracking', { systems: [], services: [trackingService] });
const domains = [
  entry('domains', 'Orders', { systems: [checkout, returns], services: [] }),
  entry('domains', 'Shipping', { systems: [delivery], services: [], domains: [tracking] }),
  tracking,
  entry('domains', 'Reviews', { systems: [], services: [reviewService] }),
  entry('domains', 'Customer', { systems: [], services: [], domains: [loyalty, notifications] }),
  loyalty,
  notifications,
  // Lists the Checkout service (in the Orders domain's Checkout system) itself
  entry('domains', 'Shared', { systems: [], services: [checkoutService] }),
  // An older version of the Orders domain, before it had any systems
  entry('domains', 'Orders', { version: '0.0.1', systems: [], services: [] }),
];

vi.mock('@utils/collections/domains', () => ({
  getDomains: vi.fn(() => Promise.resolve(domains)),
}));

// Checkout's resource diagram: its service publishes OrderPlaced, which the
// Delivery service (in another domain) consumes
vi.mock('@utils/node-graphs/systems-node-graph', () => ({
  getNodesAndEdges: ({ id }: { id: string }) => {
    // The Loyalty system's service publishes PointsEarned, consumed by Checkout (Orders)
    if (id === 'LoyaltySystem') {
      const parentId = 'system-group-LoyaltySystem-1.0.0';
      return Promise.resolve({
        nodes: [
          { id: parentId, type: 'system-group', position: { x: 0, y: 0 }, data: { isFocused: true } },
          { id: 'LoyaltyService-1.0.0', type: 'services', parentId, position: { x: 0, y: 0 }, data: {} },
          {
            id: 'PointsEarned-1.0.0',
            type: 'events',
            parentId,
            position: { x: 0, y: 0 },
            data: { message: { name: 'Points Earned' } },
          },
          { id: 'CheckoutService-1.0.0', type: 'services', parentId, position: { x: 0, y: 0 }, data: {} },
          { id: 'TrackingService-1.0.0', type: 'services', parentId, position: { x: 0, y: 0 }, data: {} },
          { id: 'DeliveryService-1.0.0', type: 'services', parentId, position: { x: 0, y: 0 }, data: {} },
          // Sent by Checkout (Orders) through a channel to the Loyalty service
          { id: 'CouponIssued-1.0.0', type: 'events', parentId, position: { x: 0, y: 0 }, data: {} },
          { id: 'coupons-1.0.0', type: 'channels', parentId, position: { x: 0, y: 0 }, data: {} },
        ],
        edges: [
          { id: 'earns', source: 'LoyaltyService-1.0.0', target: 'PointsEarned-1.0.0' },
          { id: 'uses-points', source: 'PointsEarned-1.0.0', target: 'CheckoutService-1.0.0' },
          { id: 'tracks-points', source: 'PointsEarned-1.0.0', target: 'TrackingService-1.0.0' },
          { id: 'delivers-points', source: 'PointsEarned-1.0.0', target: 'DeliveryService-1.0.0' },
          { id: 'issues', source: 'CheckoutService-1.0.0', target: 'CouponIssued-1.0.0' },
          { id: 'coupon-topic', source: 'CouponIssued-1.0.0', target: 'coupons-1.0.0' },
          { id: 'redeems', source: 'coupons-1.0.0', target: 'LoyaltyService-1.0.0' },
        ],
      });
    }
    if (id !== 'Checkout') return Promise.resolve({ nodes: [], edges: [] });
    const parentId = 'system-group-Checkout-1.0.0';
    return Promise.resolve({
      nodes: [
        { id: parentId, type: 'system-group', position: { x: 0, y: 0 }, data: { isFocused: true } },
        { id: 'CheckoutService-1.0.0', type: 'services', parentId, position: { x: 0, y: 0 }, data: {} },
        {
          id: 'OrderPlaced-1.0.0',
          type: 'events',
          parentId,
          position: { x: 0, y: 0 },
          data: { message: { name: 'Order Placed' } },
        },
        { id: 'DeliveryService-1.0.0', type: 'services', parentId, position: { x: 0, y: 0 }, data: {} },
        // Published by Delivery (Shipping domain), consumed by Checkout
        {
          id: 'OrderShipped-1.0.0',
          type: 'events',
          parentId,
          position: { x: 0, y: 0 },
          data: { message: { name: 'Order Shipped' } },
        },
      ],
      edges: [
        { id: 'publishes', source: 'CheckoutService-1.0.0', target: 'OrderPlaced-1.0.0' },
        { id: 'consumes', source: 'OrderPlaced-1.0.0', target: 'DeliveryService-1.0.0' },
        { id: 'shipped', source: 'DeliveryService-1.0.0', target: 'OrderShipped-1.0.0' },
        { id: 'receives-shipped', source: 'OrderShipped-1.0.0', target: 'CheckoutService-1.0.0' },
      ],
    });
  },
}));

// The Review service's diagram: it publishes ReviewPosted (consumed by the
// Delivery service, in another domain) and writes to its database
vi.mock('@utils/node-graphs/services-node-graph', () => ({
  getNodesAndEdges: () =>
    Promise.resolve({
      nodes: [
        { id: 'ReviewService-1.0.0', type: 'services', position: { x: 0, y: 0 }, data: {} },
        { id: 'ReviewPosted-1.0.0', type: 'events', position: { x: 0, y: 0 }, data: { message: { name: 'Review Posted' } } },
        { id: 'DeliveryService-1.0.0', type: 'services', position: { x: 0, y: 0 }, data: {} },
        { id: 'ReviewDatabase-1.0.0', type: 'data', position: { x: 0, y: 0 }, data: {} },
      ],
      edges: [
        { id: 'posts', source: 'ReviewService-1.0.0', target: 'ReviewPosted-1.0.0' },
        { id: 'consumes', source: 'ReviewPosted-1.0.0', target: 'DeliveryService-1.0.0' },
        { id: 'writes', source: 'ReviewService-1.0.0', target: 'ReviewDatabase-1.0.0' },
      ],
    }),
}));

// The Orders domain's context diagram: Checkout relates to the Carrier system
// (outside the domain), and a Shopper actor uses Checkout
vi.mock('@utils/node-graphs/system-context-node-graph', () => ({
  getNodesAndEdgesForDomainSystems: () =>
    Promise.resolve({
      nodes: [
        { id: 'Checkout-1.0.0', type: 'systems', position: { x: 0, y: 0 }, data: { system: { name: 'Checkout' } } },
        { id: 'Returns-1.0.0', type: 'systems', position: { x: 0, y: 0 }, data: { system: { name: 'Returns' } } },
        { id: 'Carrier-1.0.0', type: 'systems', position: { x: 0, y: 0 }, data: { system: { name: 'Carrier' } } },
        { id: 'actor-shopper', type: 'context-actor', position: { x: 0, y: 0 }, data: {} },
      ],
      edges: [
        { id: 'Checkout-Carrier', source: 'Checkout-1.0.0', target: 'Carrier-1.0.0', label: 'ships with' },
        { id: 'shopper-Checkout', source: 'actor-shopper', target: 'Checkout-1.0.0', label: 'buys with' },
      ],
    }),
}));

describe('Domain Levels NodeGraph', () => {
  it('nests the systems in the domain, showing services in other domains as that domain', async () => {
    const { nodes, edges } = await getNodesAndEdges({ id: 'Orders', version: '1.0.0' });
    const byId = new Map(nodes.map((node: any) => [node.id, node]));

    expect(byId.get('domain-group-Orders-1.0.0')).toMatchObject({ type: 'domain-group', data: { isFocused: true } });
    expect(byId.get('system-group-Checkout-1.0.0')).toMatchObject({
      parentId: 'domain-group-Orders-1.0.0',
      data: { isFocused: false },
    });
    // An empty system still shows
    expect(byId.get('system-group-Returns-1.0.0')).toMatchObject({ parentId: 'domain-group-Orders-1.0.0' });
    // Other domains are a single card, with counts of what's in them
    expect(byId.has('DeliveryService-1.0.0')).toBe(false);
    expect(byId.get('domain-Shipping-1.0.0')).toMatchObject({
      type: 'context-domain',
      // Marked as another domain's, to highlight cross-domain communication
      data: { domain: { name: 'Shipping' }, systemsCount: 1, servicesCount: 1, otherDomain: true },
    });
    expect(edges.map((edge: any) => `${edge.source}->${edge.target}`)).toEqual([
      'CheckoutService-1.0.0->OrderPlaced-1.0.0',
      'OrderPlaced-1.0.0->domain-Shipping-1.0.0',
      'domain-Shipping-1.0.0->OrderShipped-1.0.0',
      'OrderShipped-1.0.0->CheckoutService-1.0.0',
      // The context, connected to the expanded system
      'system-group-Checkout-1.0.0->Carrier-1.0.0',
      'actor-shopper->system-group-Checkout-1.0.0',
    ]);
  });

  it('places messages sent only by other domains outside the domain', async () => {
    const { nodes } = await getNodesAndEdges({ id: 'Orders', version: '1.0.0' });
    const byId = new Map(nodes.map((node: any) => [node.id, node]));

    expect(byId.get('OrderShipped-1.0.0')).toMatchObject({ parentId: undefined, data: { otherDomain: true } });
    // Messages this domain sends stay in the system sending them
    expect(byId.get('OrderPlaced-1.0.0')?.parentId).toBe('system-group-Checkout-1.0.0');
  });

  it('lays out each node in its own place', async () => {
    const { nodes, overview } = await getNodesAndEdges({ id: 'Orders', version: '1.0.0' });

    [nodes, overview!.nodes].forEach((graphNodes) => {
      const places = graphNodes.map((node: any) => `${node.parentId}:${node.position.x},${node.position.y}`);
      expect(new Set(places).size).toBe(places.length);
    });
  });

  describe('layout', () => {
    // Whether a point lies on one of the route's (horizontal or vertical) segments
    const isOnRoute = (point: { x: number; y: number }, points: { x: number; y: number }[]) =>
      points.slice(1).some((to, index) => {
        const from = points[index];
        const between = (value: number, a: number, b: number) => value >= Math.min(a, b) - 1 && value <= Math.max(a, b) + 1;
        return (
          (Math.abs(from.y - to.y) < 1 && Math.abs(point.y - from.y) < 2 && between(point.x, from.x, to.x)) ||
          (Math.abs(from.x - to.x) < 1 && Math.abs(point.x - from.x) < 2 && between(point.y, from.y, to.y))
        );
      });

    it('routes every edge, with labels placed on their edge', async () => {
      const { edges, overview } = await getNodesAndEdges({ id: 'Orders', version: '1.0.0' });

      [...edges, ...overview!.edges].forEach((edge: any) => {
        expect(edge.data.route.points.length).toBeGreaterThanOrEqual(2);
        if (edge.label) expect(isOnRoute(edge.data.route.label, edge.data.route.points)).toBe(true);
      });
    });

    it('lays out level 2 too, without messages or channels', async () => {
      const { hiddenMessages } = await getNodesAndEdges({ id: 'Orders', version: '1.0.0' });

      expect(hiddenMessages.nodes.some((node: any) => ['events', 'commands', 'queries', 'channels'].includes(node.type))).toBe(
        false
      );
      expect(hiddenMessages.edges.find((edge: any) => edge.source === 'CheckoutService-1.0.0')).toMatchObject({
        target: 'domain-Shipping-1.0.0',
        label: 'publishes\nOrder Placed',
      });
    });

    it('keeps nodes in the same group apart', async () => {
      const { nodes } = await getNodesAndEdges({ id: 'Orders', version: '1.0.0' });
      const places = nodes.map((node: any) => `${node.parentId}:${node.position.x},${node.position.y}`);

      expect(new Set(places).size).toBe(places.length);
    });
  });

  it('puts parents before their children', async () => {
    const { nodes } = await getNodesAndEdges({ id: 'Orders', version: '1.0.0' });
    const index = new Map(nodes.map((node: any, i: number) => [node.id, i]));

    nodes.forEach((node: any) => {
      if (node.parentId) expect(index.get(node.parentId)).toBeLessThan(index.get(node.id)!);
    });
  });

  it('collapses each system into a node for level 1, labelling edges with their messages', async () => {
    const { overview } = await getNodesAndEdges({ id: 'Orders', version: '1.0.0' });

    expect(overview!.nodes.map((node: any) => node.id).sort()).toEqual([
      'Carrier-1.0.0',
      'Checkout-1.0.0',
      'Returns-1.0.0',
      'actor-shopper',
      'domain-Shipping-1.0.0',
      'domain-group-Orders-1.0.0',
    ]);
    expect(overview!.nodes.find((node: any) => node.id === 'Checkout-1.0.0')).toMatchObject({
      type: 'systems',
      parentId: 'domain-group-Orders-1.0.0',
    });
    expect(overview!.edges.map((edge: any) => [edge.source, edge.target, edge.label])).toEqual([
      ['Checkout-1.0.0', 'domain-Shipping-1.0.0', 'publishes\nOrder Placed'],
      ['domain-Shipping-1.0.0', 'Checkout-1.0.0', 'publishes\nOrder Shipped'],
      ['Checkout-1.0.0', 'Carrier-1.0.0', 'ships with'],
      ['actor-shopper', 'Checkout-1.0.0', 'buys with'],
    ]);
  });

  it('shows what services outside a system connect to, in the domain', async () => {
    const { nodes, edges, overview, hiddenMessages } = await getNodesAndEdges({ id: 'Reviews', version: '1.0.0' });
    const byId = new Map(nodes.map((node: any) => [node.id, node]));

    ['ReviewService-1.0.0', 'ReviewPosted-1.0.0', 'ReviewDatabase-1.0.0'].forEach((id) =>
      expect(byId.get(id)?.parentId).toBe('domain-group-Reviews-1.0.0')
    );
    expect(edges.map((edge: any) => `${edge.source}->${edge.target}`)).toEqual(
      expect.arrayContaining([
        'ReviewService-1.0.0->ReviewPosted-1.0.0',
        'ReviewPosted-1.0.0->domain-Shipping-1.0.0',
        'ReviewService-1.0.0->ReviewDatabase-1.0.0',
      ])
    );
    // No systems, so no level 1. Level 2 connects the service to the other domain
    expect(overview).toBeUndefined();
    expect(hiddenMessages.edges.find((edge: any) => edge.target === 'domain-Shipping-1.0.0')).toMatchObject({
      source: 'ReviewService-1.0.0',
      label: 'publishes\nReview Posted',
    });
  });

  it('shows subdomains as domains inside the domain, with their systems', async () => {
    const { nodes, edges, overview } = await getNodesAndEdges({ id: 'Customer', version: '1.0.0' });
    const byId = new Map(nodes.map((node: any) => [node.id, node]));

    expect(byId.get('domain-group-Loyalty-1.0.0')).toMatchObject({
      type: 'domain-group',
      parentId: 'domain-group-Customer-1.0.0',
      data: { subdomain: true, isFocused: false },
    });
    expect(byId.get('system-group-LoyaltySystem-1.0.0')?.parentId).toBe('domain-group-Loyalty-1.0.0');
    expect(byId.get('LoyaltyService-1.0.0')?.parentId).toBe('system-group-LoyaltySystem-1.0.0');
    // Services in other domains are still shown as that domain
    expect(edges.map((edge: any) => `${edge.source}->${edge.target}`)).toContain('PointsEarned-1.0.0->domain-Orders-1.0.0');

    // Level 1: the subdomain with its system collapsed, talking to the other domain
    expect(overview!.nodes.find((node: any) => node.id === 'domain-group-Loyalty-1.0.0')?.parentId).toBe(
      'domain-group-Customer-1.0.0'
    );
    expect(overview!.nodes.find((node: any) => node.id === 'LoyaltySystem-1.0.0')?.parentId).toBe('domain-group-Loyalty-1.0.0');
    expect(overview!.edges.find((edge: any) => edge.target === 'domain-Orders-1.0.0')).toMatchObject({
      source: 'LoyaltySystem-1.0.0',
      label: 'publishes\nPoints Earned',
    });
  });

  it('shows a subdomain without systems as a card at level 1, with no services', async () => {
    const { nodes, overview } = await getNodesAndEdges({ id: 'Customer', version: '1.0.0' });

    // Level 3 shows the subdomain's service inside it
    expect(nodes.find((node: any) => node.id === 'NotificationService-1.0.0')?.parentId).toBe('domain-group-Notifications-1.0.0');
    expect(overview!.nodes.find((node: any) => node.id === 'domain-Notifications-1.0.0')).toMatchObject({
      type: 'context-domain',
      parentId: 'domain-group-Customer-1.0.0',
      data: { subdomain: true },
    });
    expect(overview!.nodes.some((node: any) => ['services', 'data', 'events'].includes(node.type))).toBe(false);
    // Other domains talk to the subdomain
    expect(overview!.edges.some((edge: any) => edge.target === 'domain-Notifications-1.0.0')).toBe(true);
  });

  it("shows another domain's subdomain inside a box for that domain", async () => {
    const { nodes, edges, overview } = await getNodesAndEdges({ id: 'Customer', version: '1.0.0' });
    const byId = new Map(nodes.map((node: any) => [node.id, node]));

    // Shipping is a box (not a card as well), with its Tracking subdomain in it
    expect(byId.get('domain-group-Shipping-1.0.0')).toMatchObject({ type: 'domain-group', data: { isFocused: false } });
    expect(byId.has('domain-Shipping-1.0.0')).toBe(false);
    expect(byId.get('domain-Tracking-1.0.0')).toMatchObject({
      type: 'context-domain',
      parentId: 'domain-group-Shipping-1.0.0',
      data: { subdomain: true },
    });
    const connections = edges.map((edge: any) => `${edge.source}->${edge.target}`);
    expect(connections).toContain('PointsEarned-1.0.0->domain-Tracking-1.0.0');
    // Shipping's own services connect to its box
    expect(connections).toContain('PointsEarned-1.0.0->domain-group-Shipping-1.0.0');

    expect(overview!.nodes.find((node: any) => node.id === 'domain-Tracking-1.0.0')?.parentId).toBe(
      'domain-group-Shipping-1.0.0'
    );
    expect(overview!.edges.some((edge: any) => edge.target === 'domain-Tracking-1.0.0')).toBe(true);
  });

  it('places channels only other domains send through outside the domain', async () => {
    const { nodes } = await getNodesAndEdges({ id: 'Customer', version: '1.0.0' });
    const byId = new Map(nodes.map((node: any) => [node.id, node]));

    expect(byId.get('CouponIssued-1.0.0')?.parentId).toBeUndefined();
    expect(byId.get('coupons-1.0.0')?.parentId).toBeUndefined();
    // This domain's own messages stay in the system sending them
    expect(byId.get('PointsEarned-1.0.0')?.parentId).toBe('system-group-LoyaltySystem-1.0.0');
  });

  it('shows the version of the domain asked for, not the latest', async () => {
    const { nodes, overview } = await getNodesAndEdges({ id: 'Orders', version: '0.0.1' });

    expect(nodes.map((node: any) => node.id)).toContain('domain-group-Orders-0.0.1');
    expect(nodes.some((node: any) => node.id === 'domain-group-Orders-1.0.0')).toBe(false);
    // It had no systems then, so no level 1
    expect(overview).toBeUndefined();
    // Older versions are only there when asking for every version
    expect(getDomains).toHaveBeenCalledWith(expect.objectContaining({ getAllVersions: true }));
  });

  it('shows a service the domain lists itself, even when a system in another domain has it', async () => {
    const { nodes } = await getNodesAndEdges({ id: 'Shared', version: '1.0.0' });

    expect(nodes.find((node: any) => node.id === 'CheckoutService-1.0.0')?.parentId).toBe('domain-group-Shared-1.0.0');
  });

  it("labels the domain viewed as a subdomain when it's a subdomain of another", async () => {
    const { nodes } = await getNodesAndEdges({ id: 'Loyalty', version: '1.0.0' });

    expect(nodes.find((node: any) => node.id === 'domain-group-Loyalty-1.0.0')).toMatchObject({
      data: { subdomain: true, isFocused: true },
    });
  });

  it('marks the level 1 edges to and from other domains, to highlight them', async () => {
    const { overview } = await getNodesAndEdges({ id: 'Orders', version: '1.0.0' });
    const crossDomain = overview!.edges.filter((edge: any) => edge.data?.crossDomain);

    expect(crossDomain.map((edge: any) => `${edge.source}->${edge.target}`)).toEqual([
      'Checkout-1.0.0->domain-Shipping-1.0.0',
      'domain-Shipping-1.0.0->Checkout-1.0.0',
    ]);
  });
});

describe('markCrossDomain', () => {
  const node = (id: string, type: string, parentId?: string) => ({ id, type, parentId, data: {} });
  const edge = (source: string, target: string) => ({ id: `${source}-${target}`, source, target });
  const { nodes, edges } = markCrossDomain(
    {
      nodes: [
        node('group', 'system-group'),
        node('Service', 'services', 'group'),
        node('Sent', 'events', 'group'),
        node('topic', 'channels', 'group'),
        node('Received', 'events', 'group'),
        node('Internal', 'events', 'group'),
        node('Other', 'services', 'group'),
        node('domain-Shipping', 'context-domain'),
      ],
      edges: [
        edge('Service', 'Sent'),
        edge('Sent', 'topic'),
        edge('topic', 'domain-Shipping'),
        edge('domain-Shipping', 'Received'),
        edge('Received', 'Service'),
        edge('Service', 'Internal'),
        edge('Internal', 'Other'),
      ],
    },
    new Set(['domain-Shipping'])
  );
  const byId = new Map(nodes.map((n: any) => [n.id, n]));

  it("marks this domain's messages and channels reaching other domains", () => {
    expect(byId.get('Sent')).toMatchObject({ parentId: 'group', data: { crossDomain: true } });
    expect(byId.get('topic')).toMatchObject({ parentId: 'group', data: { crossDomain: true } });
    expect(byId.get('Internal')!.data).toEqual({});
  });

  it('places messages only other domains send outside the domain', () => {
    expect(byId.get('Received')).toMatchObject({ parentId: undefined, data: { otherDomain: true, crossDomain: true } });
  });

  it('marks the edges on cross-domain paths', () => {
    expect(edges.filter((e: any) => e.data?.crossDomain).map((e: any) => e.id)).toEqual([
      'Service-Sent',
      'Sent-topic',
      'topic-domain-Shipping',
      'domain-Shipping-Received',
      'Received-Service',
    ]);
  });
});

describe('placeMessagesWithPublishers', () => {
  it('moves a message from the system consuming it to the system publishing it', () => {
    const nodes = new Map<string, any>([
      ['consumer-group', { id: 'consumer-group', type: 'system-group' }],
      ['publisher-group', { id: 'publisher-group', type: 'system-group' }],
      ['Publisher', { id: 'Publisher', type: 'services', parentId: 'publisher-group' }],
      ['Consumer', { id: 'Consumer', type: 'services', parentId: 'consumer-group' }],
      ['Message', { id: 'Message', type: 'events', parentId: 'consumer-group' }],
    ]);

    placeMessagesWithPublishers(nodes, [
      { id: 'publishes', source: 'Publisher', target: 'Message' },
      { id: 'consumes', source: 'Message', target: 'Consumer' },
    ]);

    expect(nodes.get('Message').parentId).toBe('publisher-group');
  });
});

describe('domain-level messages', () => {
  // Payments sends PaymentTaken and receives ProcessPayment itself (no service
  // of its own does). Orders' service sends ProcessPayment, Ledger receives
  // PaymentTaken itself, and the Audit service (in no domain) receives it too
  const paymentTaken = entry('events', 'PaymentTaken');
  const processPayment = entry('commands', 'ProcessPayment');
  const orderService = entry('services', 'OrderService', { sends: [processPayment] });
  const auditService = entry('services', 'AuditService', { receives: [paymentTaken] });
  const accountsService = entry('services', 'AccountsService', { receives: [paymentTaken] });
  const payments = entry('domains', 'Payments', { services: [], sends: [paymentTaken], receives: [processPayment] });
  const orders = entry('domains', 'Orders', { services: [orderService] });
  const ledger = entry('domains', 'Ledger', { services: [], receives: [paymentTaken] });
  const accounts = entry('domains', 'Accounts', { services: [accountsService] });
  const allDomains = [payments, orders, ledger, accounts];
  const catalogServices = [orderService, auditService, accountsService];

  const build = (
    domain: any,
    serviceGraphs: { service: any; graph: any }[] = [],
    catalog: { domains?: any[]; catalogServices?: any[] } = {}
  ) => {
    // The domain given (e.g. Payments with a service) in place of the one with its id
    const domains = (catalog.domains ?? allDomains).map((d) => (d.data.id === domain.data.id ? domain : d));
    const tree = buildDomainTree(domain, (id) => domains.find((d) => d.data.id === id));
    const { owners, parentDomainOf } = collectOwners(domains);
    const { nodes, edges, otherDomainIds, domainMessages } = buildDomainGraph({
      tree,
      owners,
      parentDomainOf,
      systems: [],
      systemGraphs: [],
      looseServices: serviceGraphs.map(({ service }) => ({ service, groupId: tree[0].groupId })),
      serviceGraphs: serviceGraphs.map(({ graph }) => graph),
      mode: 'full',
      domains,
      catalogServices: catalog.catalogServices ?? catalogServices,
    });
    return { nodes, edges: edges.map((edge: any) => `${edge.source}->${edge.target}`), otherDomainIds, domainMessages };
  };

  it('connects the messages a domain sends and receives itself to its box, and to the other side outside it', () => {
    const { nodes, edges, otherDomainIds } = build(payments);

    expect(edges).toEqual([
      'domain-group-Payments-1.0.0->PaymentTaken-1.0.0',
      'PaymentTaken-1.0.0->AuditService-1.0.0',
      'PaymentTaken-1.0.0->domain-Accounts-1.0.0',
      'ProcessPayment-1.0.0->domain-group-Payments-1.0.0',
      'domain-Orders-1.0.0->ProcessPayment-1.0.0',
      'PaymentTaken-1.0.0->domain-Ledger-1.0.0',
    ]);
    // Outside the domain, as the domain is drawn sending and receiving them
    expect(nodes.get('PaymentTaken-1.0.0')).toMatchObject({ type: 'events' });
    expect(nodes.get('PaymentTaken-1.0.0').parentId).toBeUndefined();
    // A service in no domain is shown as itself
    expect(nodes.get('AuditService-1.0.0')).toMatchObject({ type: 'services' });
    expect(nodes.get('AuditService-1.0.0').parentId).toBeUndefined();
    expect([...otherDomainIds].sort()).toEqual(['domain-Accounts-1.0.0', 'domain-Ledger-1.0.0', 'domain-Orders-1.0.0']);
  });

  it("leaves a domain-level message as it is when one of the domain's services already sends it", () => {
    const paymentService = entry('services', 'PaymentService');
    const withService = { ...payments, data: { ...payments.data, services: [paymentService], receives: [] } };
    const { edges } = build(withService, [
      {
        service: paymentService,
        graph: {
          nodes: [
            { id: 'PaymentService-1.0.0', type: 'services', position: { x: 0, y: 0 }, data: {} },
            { id: 'PaymentTaken-1.0.0', type: 'events', position: { x: 0, y: 0 }, data: {} },
          ],
          edges: [{ id: 'takes', source: 'PaymentService-1.0.0', target: 'PaymentTaken-1.0.0' }],
        },
      },
    ]);

    expect(edges).not.toContain('domain-group-Payments-1.0.0->PaymentTaken-1.0.0');
    expect(edges).toContain('PaymentService-1.0.0->PaymentTaken-1.0.0');
  });

  it('shows other domains sending a message the domain receives themselves', () => {
    const { edges } = build(ledger);

    expect(edges).toContain('domain-Payments-1.0.0->PaymentTaken-1.0.0');
  });

  it('leaves out other domains only receiving the same message as the domain', () => {
    // Accounts' service receives PaymentTaken, which Ledger receives too
    const { edges } = build(accounts, [
      {
        service: accountsService,
        graph: {
          nodes: [
            { id: 'AccountsService-1.0.0', type: 'services', position: { x: 0, y: 0 }, data: {} },
            { id: 'PaymentTaken-1.0.0', type: 'events', position: { x: 0, y: 0 }, data: { message: paymentTaken.data } },
          ],
          edges: [{ id: 'books', source: 'PaymentTaken-1.0.0', target: 'AccountsService-1.0.0' }],
        },
      },
    ]);

    expect(edges).toEqual(['PaymentTaken-1.0.0->AccountsService-1.0.0', 'domain-Payments-1.0.0->PaymentTaken-1.0.0']);
  });

  it('shows the domain sending a message one of its own services consumes, outside its box', () => {
    // PaymentService (in Payments) consumes PaymentTaken, which Payments sends itself
    const paymentService = entry('services', 'PaymentService', { receives: [paymentTaken] });
    const withService = { ...payments, data: { ...payments.data, services: [paymentService], receives: [] } };
    const { nodes, edges, domainMessages } = build(withService, [
      {
        service: paymentService,
        graph: {
          nodes: [
            { id: 'PaymentService-1.0.0', type: 'services', position: { x: 0, y: 0 }, data: {} },
            { id: 'PaymentTaken-1.0.0', type: 'events', position: { x: 0, y: 0 }, data: {} },
          ],
          edges: [{ id: 'takes', source: 'PaymentTaken-1.0.0', target: 'PaymentService-1.0.0' }],
        },
      },
    ]);

    expect(edges).toContain('domain-group-Payments-1.0.0->PaymentTaken-1.0.0');
    expect(edges).toContain('PaymentTaken-1.0.0->PaymentService-1.0.0');
    // Moved out of the box it was left in by the service consuming it
    expect(nodes.get('PaymentTaken-1.0.0').parentId).toBeUndefined();
    // Folded into the box at level 1
    expect(domainMessages.get('PaymentTaken-1.0.0')).toEqual(new Set(['domain-group-Payments-1.0.0']));
  });

  it('shows the domain receiving a message one of its own services sends, outside its box', () => {
    // RefundService (in Payments) sends RefundIssued, which Payments receives itself
    const refundIssued = entry('events', 'RefundIssued');
    const refundService = entry('services', 'RefundService', { sends: [refundIssued] });
    const withService = {
      ...payments,
      data: { ...payments.data, services: [refundService], sends: [], receives: [refundIssued] },
    };
    const { nodes, edges } = build(withService, [
      {
        service: refundService,
        graph: {
          nodes: [
            { id: 'RefundService-1.0.0', type: 'services', position: { x: 0, y: 0 }, data: {} },
            { id: 'RefundIssued-1.0.0', type: 'events', position: { x: 0, y: 0 }, data: {} },
          ],
          edges: [{ id: 'refunds', source: 'RefundService-1.0.0', target: 'RefundIssued-1.0.0' }],
        },
      },
    ]);

    expect(edges).toEqual(['RefundService-1.0.0->RefundIssued-1.0.0', 'RefundIssued-1.0.0->domain-group-Payments-1.0.0']);
    // Not moved back into the box by its publisher being in it
    expect(nodes.get('RefundIssued-1.0.0').parentId).toBeUndefined();
  });

  it('shows an agent on the other side as an agent', () => {
    // FraudAgent (in no domain) receives PaymentTaken, which Payments sends itself
    const fraudAgent = entry('agents', 'FraudAgent', { receives: [paymentTaken] });
    const { nodes, edges } = build(payments, [], { catalogServices: [...catalogServices, fraudAgent] });

    expect(edges).toContain('PaymentTaken-1.0.0->FraudAgent-1.0.0');
    expect(nodes.get('FraudAgent-1.0.0')).toMatchObject({ type: 'agents', data: { agent: { name: 'FraudAgent' } } });
  });

  it("shows an agent in another domain as that domain, and leaves out one in the domain's own", () => {
    // RiskAgent (in Risk) and PaymentAgent (in Payments) receive PaymentTaken, which Payments sends itself
    const riskAgent = entry('agents', 'RiskAgent', { receives: [paymentTaken] });
    const paymentAgent = entry('agents', 'PaymentAgent', { receives: [paymentTaken] });
    const risk = entry('domains', 'Risk', { services: [], agents: [riskAgent] });
    const withAgent = { ...payments, data: { ...payments.data, agents: [paymentAgent] } };
    const { nodes, edges } = build(withAgent, [], {
      domains: [...allDomains, risk],
      catalogServices: [...catalogServices, riskAgent, paymentAgent],
    });

    expect(edges).toContain('PaymentTaken-1.0.0->domain-Risk-1.0.0');
    expect(nodes.has('RiskAgent-1.0.0')).toBe(false);
    expect(nodes.has('PaymentAgent-1.0.0')).toBe(false);
  });

  it('keeps every subdomain sending a message itself', () => {
    // Two subdomains of Finance both send PaymentTaken themselves
    const billing = entry('domains', 'Billing', { services: [], sends: [paymentTaken] });
    const refunds = entry('domains', 'Refunds', { services: [], sends: [paymentTaken] });
    const finance = entry('domains', 'Finance', { services: [], domains: [billing, refunds] });
    const { domainMessages } = build(finance, [], { domains: [...allDomains, finance, billing, refunds] });

    expect(domainMessages.get('PaymentTaken-1.0.0')).toEqual(
      new Set(['domain-group-Billing-1.0.0', 'domain-group-Refunds-1.0.0'])
    );
  });

  it("leaves a domain-level message as it is when one of the domain's services receives it through a channel", () => {
    const paymentService = entry('services', 'PaymentService', { receives: [processPayment] });
    const withService = { ...payments, data: { ...payments.data, services: [paymentService], sends: [] } };
    const { edges } = build(withService, [
      {
        service: paymentService,
        graph: {
          nodes: [
            { id: 'PaymentService-1.0.0', type: 'services', position: { x: 0, y: 0 }, data: {} },
            { id: 'ProcessPayment-1.0.0', type: 'commands', position: { x: 0, y: 0 }, data: {} },
            { id: 'payments-queue-1.0.0', type: 'channels', position: { x: 0, y: 0 }, data: {} },
          ],
          edges: [
            { id: 'queued', source: 'ProcessPayment-1.0.0', target: 'payments-queue-1.0.0' },
            { id: 'pulls', source: 'payments-queue-1.0.0', target: 'PaymentService-1.0.0' },
          ],
        },
      },
    ]);

    expect(edges).not.toContain('ProcessPayment-1.0.0->domain-group-Payments-1.0.0');
  });
});

describe('collapseSystems', () => {
  it('folds the messages a domain sends or receives itself into its box, connecting it to the other side directly', () => {
    const graph = {
      nodes: [
        { id: 'domain-group-Marketing-1.0.0', type: 'domain-group', position: { x: 0, y: 0 }, data: {} },
        { id: 'GetProduct-1.0.0', type: 'queries', position: { x: 0, y: 0 }, data: { message: { name: 'Get Product' } } },
        { id: 'domain-Catalog-1.0.0', type: 'context-domain', position: { x: 0, y: 0 }, data: {} },
      ],
      edges: [
        { id: 'requests', source: 'domain-group-Marketing-1.0.0', target: 'GetProduct-1.0.0' },
        { id: 'accepts', source: 'GetProduct-1.0.0', target: 'domain-Catalog-1.0.0' },
      ],
    };

    const { nodes, edges } = collapseSystems(
      graph,
      [],
      new Map(),
      new Map(),
      new Map([['GetProduct-1.0.0', new Set(['domain-group-Marketing-1.0.0'])]])
    );

    expect(nodes.map((node: any) => node.id)).not.toContain('GetProduct-1.0.0');
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ source: 'domain-group-Marketing-1.0.0', target: 'domain-Catalog-1.0.0' });
    expect(String(edges[0].label)).toContain('Get Product');
  });

  it('leaves a message more than one subdomain sends itself as it is, rather than folding it into one of them', () => {
    const graph = {
      nodes: [
        { id: 'domain-group-Billing-1.0.0', type: 'domain-group', position: { x: 0, y: 0 }, data: {} },
        { id: 'domain-group-Refunds-1.0.0', type: 'domain-group', position: { x: 0, y: 0 }, data: {} },
        { id: 'PaymentTaken-1.0.0', type: 'events', position: { x: 0, y: 0 }, data: {} },
        { id: 'domain-Ledger-1.0.0', type: 'context-domain', position: { x: 0, y: 0 }, data: {} },
      ],
      edges: [
        { id: 'billing', source: 'domain-group-Billing-1.0.0', target: 'PaymentTaken-1.0.0' },
        { id: 'refunds', source: 'domain-group-Refunds-1.0.0', target: 'PaymentTaken-1.0.0' },
        { id: 'ledger', source: 'PaymentTaken-1.0.0', target: 'domain-Ledger-1.0.0' },
      ],
    };

    const { edges } = collapseSystems(
      graph,
      [],
      new Map(),
      new Map(),
      new Map([['PaymentTaken-1.0.0', new Set(['domain-group-Billing-1.0.0', 'domain-group-Refunds-1.0.0'])]])
    );

    // Each subdomain reaches Ledger through the message; neither is drawn sending to the other
    expect(edges.map((edge: any) => `${edge.source}->${edge.target}`)).toEqual([
      'domain-group-Billing-1.0.0->PaymentTaken-1.0.0',
      'domain-group-Refunds-1.0.0->PaymentTaken-1.0.0',
      'PaymentTaken-1.0.0->domain-Ledger-1.0.0',
    ]);
  });
});
