import { describe, expect, it } from 'vitest';
import { getSearchPreview } from './search-preview';
import type { NavigationData } from '../../stores/sidebar-store/state';

vi.mock('@utils/url-builder', () => ({ buildUrl: (url: string) => url }));

const overview = (href: string) => ({
  type: 'group' as const,
  title: 'Quick Reference',
  pages: [{ type: 'item' as const, title: 'Overview', href }],
});
const owners = (...names: string[]) => ({
  type: 'group' as const,
  title: 'Owners',
  pages: names.map((name) => ({ type: 'item' as const, title: name, href: `/docs/teams/${name}` })),
});

// Shaped like /api/sidebar-data.json: a domain lists systems, a system lists its services in a nested group, and
// unversioned keys point at the latest version
const nodes: NavigationData['nodes'] = {
  'domain:orders': 'domain:orders:1.0.0',
  'domain:orders:1.0.0': {
    type: 'item',
    title: 'Orders',
    badge: 'Domain',
    pages: [
      overview('/docs/domains/orders/1.0.0'),
      { type: 'group', title: 'Systems', pages: ['system:checkout:1.0.0'] },
      owners('Ordering Platform'),
    ],
  },
  'system:checkout:1.0.0': {
    type: 'item',
    title: 'Checkout System',
    badge: 'System',
    pages: [
      overview('/docs/systems/checkout/1.0.0'),
      { type: 'group', title: 'Resources', pages: [{ type: 'group', title: 'Services', pages: ['service:orders-api'] }] },
    ],
  },
  'service:orders-api': 'service:orders-api:1.0.0',
  'service:orders-api:1.0.0': {
    type: 'item',
    title: 'Orders API',
    badge: 'Service',
    pages: [
      overview('/docs/services/orders-api/1.0.0'),
      { type: 'group', title: 'Outbound Messages', pages: ['event:order-placed:1.0.0'] },
      { type: 'group', title: 'Inbound Messages', pages: ['command:place-order:1.0.0'] },
      {
        type: 'group',
        title: 'API & Contracts',
        pages: [{ type: 'item', title: 'Orders API (OpenAPI)', href: '/docs/services/orders-api/1.0.0/spec/openapi' }],
      },
      owners('Ordering Platform'),
    ],
  },
  'service:email:1.0.0': {
    type: 'item',
    title: 'Email Service',
    badge: 'Service',
    pages: [overview('/docs/services/email/1.0.0')],
  },
  'service:billing:1.0.0': { type: 'item', title: 'Billing', badge: 'Service', pages: [] },
  'service:warehouse:1.0.0': { type: 'item', title: 'Warehouse', badge: 'Service', pages: [] },
  'event:order-placed:1.0.0': {
    type: 'item',
    title: 'Order Placed',
    badge: 'Event',
    summary: 'Published when an order is placed.\n',
    pages: [
      overview('/docs/events/order-placed/1.0.0'),
      {
        type: 'group',
        title: 'Architecture',
        pages: [{ type: 'item', title: 'Diagram', href: '/visualiser/events/order-placed/1.0.0' }],
      },
      { type: 'group', title: 'Producers', pages: ['service:orders-api'] },
      {
        type: 'group',
        title: 'Consumers',
        pages: ['service:email:1.0.0', 'service:billing:1.0.0', 'service:warehouse:1.0.0'],
      },
      {
        type: 'group',
        title: 'API & Contracts',
        pages: [{ type: 'item', title: 'Schema (JSON)', href: '/schemas/explorer?id=order-placed' }],
      },
      owners('Ordering Platform'),
    ],
  },
  'command:place-order:1.0.0': {
    type: 'item',
    title: 'Place Order',
    badge: 'Command',
    pages: [
      { type: 'group', title: 'Producers', pages: ['service:email:1.0.0'] },
      { type: 'group', title: 'Consumers', pages: ['service:orders-api'] },
    ],
  },
};

const result = (key: string, name: string, type: string) => ({ key, name, type, url: `/open/${key}` });

describe('getSearchPreview', () => {
  it("previews an event: its producer's domain, who produces and consumes it, its owner, its schema and diagram", () => {
    expect(getSearchPreview(nodes, result('event:order-placed:1.0.0', 'Order Placed', 'Event'))).toEqual({
      type: 'Event',
      title: 'Order Placed',
      summary: 'Published when an order is placed.',
      facts: [
        { label: 'Domain', value: 'Orders', href: '/docs/domains/orders/1.0.0' },
        { label: 'Produced by', value: 'Orders API', href: '/docs/services/orders-api/1.0.0' },
        { label: 'Consumed by', value: 'Email Service, Billing +1 more' },
        { label: 'Owner', value: 'Ordering Platform', href: '/docs/teams/Ordering Platform' },
      ],
      actions: [
        { label: 'Open', href: '/open/event:order-placed:1.0.0', primary: true },
        { label: 'View schema', href: '/schemas/explorer?id=order-placed' },
        { label: 'Diagram', href: '/visualiser/events/order-placed/1.0.0' },
      ],
    });
  });

  it('puts a command in the domain of the service that handles it, and says who sends and handles it', () => {
    const { facts } = getSearchPreview(nodes, result('command:place-order:1.0.0', 'Place Order', 'Command'));
    expect(facts.map(({ label, value }) => `${label}: ${value}`)).toEqual([
      'Domain: Orders',
      'Sent by: Email Service',
      'Handled by: Orders API',
    ]);
  });

  it('previews a service through an unversioned key: its domain and system, what it sends and receives, its API', () => {
    const preview = getSearchPreview(nodes, result('service:orders-api', 'Orders API', 'Service'));
    expect(preview.facts.map(({ label, value }) => `${label}: ${value}`)).toEqual([
      'Domain: Orders',
      'System: Checkout System',
      'Sends: 1 message',
      'Receives: 1 message',
      'Owner: Ordering Platform',
    ]);
    expect(preview.actions.map(({ label }) => label)).toEqual(['Open', 'View API']);
  });

  it('previews a result the sidebar has no node for (e.g. a custom docs page) from the result itself', () => {
    expect(
      getSearchPreview(nodes, {
        name: 'Architecture overview',
        type: 'Page',
        url: '/docs/custom/overview',
        summary: 'How it fits',
      })
    ).toEqual({
      type: 'Page',
      title: 'Architecture overview',
      summary: 'How it fits',
      facts: [],
      actions: [{ label: 'Open', href: '/docs/custom/overview', primary: true }],
    });
  });
});
