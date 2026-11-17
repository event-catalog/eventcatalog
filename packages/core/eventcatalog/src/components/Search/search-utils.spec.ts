import { describe, expect, it, beforeEach } from 'vitest';
import {
  applyActiveFilter,
  getIndexedResultRank,
  getSearchFilters,
  getUrlForSearchItem,
  hasMeaningfulIndexedMatch,
  highlightQuery,
  mapPagefindResultsToSearchItems,
  normalizeResultUrl,
  normalizeSearchText,
  rankResourceSearchItems,
} from './search-utils';

declare global {
  interface Window {
    __EC_TRAILING_SLASH__: boolean;
  }
}

describe('getUrlForSearchItem', () => {
  beforeEach(() => {
    // @ts-ignore
    global.__EC_TRAILING_SLASH__ = false;
  });

  it.each([
    ['container:OrdersDatabase:1.0.0', '/docs/containers/OrdersDatabase/1.0.0'],
    ['data-product:Customer360:1.0.0', '/docs/data-products/Customer360/1.0.0'],
    ['entity:Order:1.0.0', '/docs/entities/Order/1.0.0'],
    ['flow:CheckoutFlow:1.0.0', '/docs/flows/CheckoutFlow/1.0.0'],
    ['system:CheckoutSystem:1.0.0', '/docs/systems/CheckoutSystem/1.0.0'],
    ['agent:SupportAgent:1.0.0', '/docs/agents/SupportAgent/1.0.0'],
    ['adr:adr-001-event-sourcing:1.0.0', '/docs/adrs/adr-001-event-sourcing/1.0.0'],
  ])('builds a docs URL for %s', (key, expected) => {
    expect(getUrlForSearchItem({}, key)).toBe(expected);
  });

  it('uses the explicit node href when provided', () => {
    expect(getUrlForSearchItem({ href: '/custom/search-result' }, 'data-product:Customer360:1.0.0')).toBe(
      '/custom/search-result'
    );
  });

  it('opens teams and users, which have no version, at their own page', () => {
    expect(getUrlForSearchItem({ href: '/docs/teams/payments-platform' }, 'team:payments-platform')).toBe(
      '/docs/teams/payments-platform'
    );
    expect(getUrlForSearchItem({ href: '/docs/users/dboyne' }, 'user:dboyne')).toBe('/docs/users/dboyne');
  });

  it('keeps ids that contain ":" whole, so each resource gets its own URL', () => {
    expect(getUrlForSearchItem({}, 'channel:persistent://tenant/dead-letter/ns:outgoing-sms:sms-worker:1.0.0')).toBe(
      '/docs/channels/persistent:/tenant/dead-letter/ns:outgoing-sms:sms-worker/1.0.0'
    );
    expect(getUrlForSearchItem({}, 'event:urn:protobuf:outgoing-sms:publish:2.1.0')).toBe(
      '/docs/events/urn:protobuf:outgoing-sms:publish/2.1.0'
    );
  });

  it('skips aliases and unsupported keys', () => {
    expect(getUrlForSearchItem({}, 'data-product:Customer360')).toBeNull();
    expect(getUrlForSearchItem({}, 'list:data-products')).toBeNull();
    expect(getUrlForSearchItem({}, 'unknown:Customer360:1.0.0')).toBeNull();
  });
});

describe('indexed search result helpers', () => {
  it('filters weak single-character highlighted matches for longer queries', () => {
    expect(
      hasMeaningfulIndexedMatch({
        query: 'random',
        title: 'Orders Service',
        content: 'Order Metadata in api service server logs',
        excerpt: 'Order Metadata in api db L -- <mark>R</mark> server',
      })
    ).toBe(false);
  });

  it('keeps short but meaningful marked terms', () => {
    expect(
      hasMeaningfulIndexedMatch({
        query: 'db',
        title: 'Orders Service',
        content: 'Order Metadata in api service server logs',
        excerpt: 'Order Metadata in api <mark>db</mark>',
      })
    ).toBe(true);
  });

  it('keeps exact title or content matches even without marked excerpts', () => {
    expect(
      hasMeaningfulIndexedMatch({
        query: 'payments',
        title: 'Payments Database',
        content: '',
        excerpt: '',
      })
    ).toBe(true);

    expect(
      hasMeaningfulIndexedMatch({
        query: 'idempotency',
        title: 'Payments Database',
        content: 'Always include an idempotency key in payment creation.',
        excerpt: '',
      })
    ).toBe(true);
  });

  it('normalizes Pagefind URLs to root-relative paths', () => {
    expect(normalizeResultUrl('docs/containers/payments-db/0.0.1')).toBe('/docs/containers/payments-db/0.0.1');
    expect(normalizeResultUrl('/docs/containers/payments-db/0.0.1')).toBe('/docs/containers/payments-db/0.0.1');
    expect(normalizeResultUrl('https://example.com/docs')).toBe('https://example.com/docs');
  });

  it('highlights title matches while escaping unsafe title text', () => {
    expect(highlightQuery('Payment <Service>', 'payment')).toBe('<mark>Payment</mark> &lt;Service&gt;');
  });

  it('ranks title matches above id/url matches and content matches', () => {
    const query = 'payment';
    const contentRank = getIndexedResultRank({
      query,
      title: 'Orders Service',
      url: '/docs/services/OrdersService/1.0.0',
      content: 'Handles payment retries',
    });
    const urlRank = getIndexedResultRank({
      query,
      title: 'Orders Service',
      url: '/docs/services/PaymentService/1.0.0',
      content: 'Handles orders',
    });
    const titleRank = getIndexedResultRank({
      query,
      title: 'Payment Service',
      url: '/docs/services/PaymentService/1.0.0',
      content: 'Handles orders',
    });

    expect(titleRank).toBeGreaterThan(urlRank);
    expect(urlRank).toBeGreaterThan(contentRank);
  });

  it('ranks exact titles and ids, then titles ending with the query, above other title matches', () => {
    const query = 'outgoing-sms';
    const rank = (title: string, id?: string) => getIndexedResultRank({ query, title, id, url: '/docs/channels/x/1.0.0' });

    const containsRank = rank('urn:protobuf:ns:outgoing-sms:publish');
    const lastSegmentRank = rank('persistent://tenant/ns/outgoing-sms');
    const exactIdRank = rank('Outgoing SMS topic', 'outgoing-sms');

    expect(rank('outgoing-sms')).toBe(exactIdRank);
    expect(exactIdRank).toBeGreaterThan(lastSegmentRank);
    expect(lastSegmentRank).toBeGreaterThan(containsRank);
  });

  it('applies grouped search filters', () => {
    const items = [{ type: 'Event' }, { type: 'Command' }, { type: 'Team' }, { type: 'User' }, { type: 'Service' }];

    expect(applyActiveFilter(items, 'Message')).toEqual([{ type: 'Event' }, { type: 'Command' }]);
    expect(applyActiveFilter(items, 'Team')).toEqual([{ type: 'Team' }, { type: 'User' }]);
    expect(applyActiveFilter(items, 'Service')).toEqual([{ type: 'Service' }]);
  });

  it('builds filter metadata without encoding behavior in labels', () => {
    expect(getSearchFilters({ items: [], query: 'missing' })).toEqual([{ id: 'all', name: 'All (0)', count: 0 }]);
    expect(getSearchFilters({ items: [{ type: 'Event' }, { type: 'Service' }], query: 'order' })).toEqual([
      { id: 'all', name: 'All (2)', count: 2 },
      { id: 'Service', name: 'Services (1)', count: 1 },
      { id: 'Message', name: 'Messages (1)', count: 1 },
    ]);
  });

  it('gives systems and decision records their own tabs', () => {
    expect(
      getSearchFilters({ items: [{ type: 'System' }, { type: 'System' }, { type: 'Decision record' }], query: 'checkout' })
    ).toEqual([
      { id: 'all', name: 'All (3)', count: 3 },
      { id: 'System', name: 'Systems (2)', count: 2 },
      { id: 'Decision record', name: 'Decision Records (1)', count: 1 },
    ]);
  });

  it('maps Pagefind results into ranked search items', async () => {
    const items = await mapPagefindResultsToSearchItems({
      query: 'payment',
      limit: 10,
      results: [
        {
          id: 'content',
          score: 10,
          data: async () => ({
            url: 'docs/services/OrdersService/1.0.0',
            content: 'Handles payment retries',
            excerpt: 'Handles <mark>payment</mark> retries',
            meta: { title: 'Orders Service', type: 'Service', id: 'OrdersService' },
          }),
        },
        {
          id: 'title',
          score: 1,
          data: async () => ({
            url: 'docs/services/PaymentService/1.0.0',
            content: 'Handles orders',
            excerpt: '<mark>Payment</mark> service',
            meta: { title: 'Payment Service', type: 'Service', id: 'PaymentService' },
          }),
        },
      ],
    });

    expect(items.map((item) => item.id)).toEqual(['title', 'content']);
    expect(items[0].url).toBe('/docs/services/PaymentService/1.0.0');
  });
});

describe('resource search ranking', () => {
  const resource = (name: string, key: string, summary?: string) => ({
    id: key,
    name,
    url: `/docs/${key}`,
    type: key.split(':')[0],
    key,
    rawNode: { title: name, summary },
  });

  // In index order: grouped by type, then alphabetical
  const items = [
    resource('Fulfilment', 'domain:fulfilment:1.0.0', 'Gets a confirmed order to the customer'),
    resource('Ordering', 'domain:ordering:1.0.0', 'Takes orders from checkout'),
    resource('Payments', 'domain:payments:1.0.0', 'Takes payment for an order'),
    resource('Checkout Orchestrator', 'service:CheckoutOrchestrator:1.0.0', 'Turns a cart into an order'),
    resource('Inventory', 'service:legacy-order-stock:1.0.0', 'Keeps stock levels'),
    resource('Order Service', 'service:OrderService:1.0.0', 'Owns orders'),
    resource('Order', 'entity:Order:1.0.0'),
    resource('Order Created', 'event:OrderCreated:1.0.0'),
    resource('Shipment Booked', 'event:ShipmentBooked:1.0.0', 'Sent once the warehouse ships a parcel'),
    resource('Reorder Requested', 'event:ReorderRequested:1.0.0'),
  ];

  it('ranks name matches above id matches, and id matches above summary-only matches', () => {
    expect(rankResourceSearchItems(items, 'order').map((item) => item.name)).toEqual([
      // Exact name
      'Order',
      // Name starts with the query, in index order
      'Ordering',
      'Order Service',
      'Order Created',
      // Name contains the query
      'Reorder Requested',
      // Id contains the query
      'Inventory',
      // Summary only, in index order
      'Fulfilment',
      'Payments',
      'Checkout Orchestrator',
    ]);
  });

  it('matches case-insensitively and leaves out resources that do not match', () => {
    const ranked = rankResourceSearchItems(items, 'SHIP');
    expect(ranked.map((item) => item.name)).toEqual(['Shipment Booked']);
    expect(rankResourceSearchItems(items, 'nothing matches this')).toEqual([]);
  });

  it('puts the topic named by its last segment above messages and dead-letter topics that mention it', () => {
    // In index order: messages before channels
    const topics = [
      resource('urn:protobuf:engineering:external-communication:outgoing-sms:publish', 'event:SmsPublish:1.0.0'),
      resource(
        'persistent://engineering/dead-letter/external-communication:outgoing-emails:emails-storage',
        'channel:dlq-outgoing-emails:1.0.0'
      ),
      resource(
        'persistent://engineering/dead-letter/external-communication:outgoing-sms:sms-worker',
        'channel:dlq-outgoing-sms:1.0.0'
      ),
      resource('persistent://engineering/external-communication/outgoing-sms', 'channel:sms-topic:1.0.0'),
    ];

    expect(rankResourceSearchItems(topics, 'outgoing-sms').map((item) => item.key)).toEqual([
      // Last segment of the name is the query
      'channel:sms-topic:1.0.0',
      // Name contains the query as whole words, shorter names first
      'event:SmsPublish:1.0.0',
      'channel:dlq-outgoing-sms:1.0.0',
    ]);
  });

  it('ranks an exact id match first, even when the name is an address', () => {
    const topics = [
      resource('Outgoing SMS publish', 'event:outgoing-sms-publish:1.0.0'),
      resource('persistent://engineering/external-communication/sms', 'channel:outgoing-sms:1.0.0'),
    ];

    expect(rankResourceSearchItems(topics, 'outgoing-sms').map((item) => item.key)).toEqual([
      'channel:outgoing-sms:1.0.0',
      'event:outgoing-sms-publish:1.0.0',
    ]);
  });

  it('ranks whole-word name matches above matches inside a word, shorter names first', () => {
    const ranked = rankResourceSearchItems(
      [
        resource('Reorder Requested', 'event:ReorderRequested:1.0.0'),
        resource('Cancel Customer Order Request', 'command:CancelCustomerOrder:1.0.0'),
        resource('Place Order', 'command:PlaceOrder:1.0.0'),
      ],
      'order'
    );

    expect(ranked.map((item) => item.name)).toEqual(['Place Order', 'Cancel Customer Order Request', 'Reorder Requested']);
  });

  describe('word by word', () => {
    const catalog = [
      resource('Order Created', 'event:OrderCreated:1.0.0', 'Published when a new order is created'),
      resource('Refund Processed', 'event:RefundProcessed:1.0.0', 'Published by Stripe when a refund has been processed'),
      resource('Order Management System', 'system:order-management:1.0.0', 'Takes a checked-out cart and turns it into an order'),
      resource('Payments Platform', 'team:payments-platform'),
    ];

    it('finds a name whatever order its words are typed in', () => {
      expect(rankResourceSearchItems(catalog, 'created order')[0].name).toBe('Order Created');
    });

    it('ignores case, spaces and separators, so camelCase and kebab-case ids find the name', () => {
      expect(rankResourceSearchItems(catalog, 'OrderCreated')[0].name).toBe('Order Created');
      expect(rankResourceSearchItems(catalog, 'order-created')[0].name).toBe('Order Created');
    });

    it('matches words spread across the name and the summary', () => {
      expect(rankResourceSearchItems(catalog, 'stripe refund').map((item) => item.name)).toEqual(['Refund Processed']);
    });

    it('needs every word to appear somewhere', () => {
      expect(rankResourceSearchItems(catalog, 'order kafka')).toEqual([]);
    });

    it('ranks an exact name above resources that only have the words somewhere', () => {
      const withSummaryMatch = [
        resource('Checkout API', 'service:checkout-api:1.0.0', 'Takes payments through the payments platform'),
        ...catalog,
      ];
      expect(rankResourceSearchItems(withSummaryMatch, 'payments platform').map((item) => item.name)).toEqual([
        'Payments Platform',
        'Checkout API',
      ]);
    });

    it('ranks words starting words in the name above words found inside them, and both above other fields', () => {
      const ranked = rankResourceSearchItems(
        [
          resource('Stock Reordered', 'event:stock-reordered:1.0.0'),
          resource('Order Shipped', 'event:order-shipped:1.0.0'),
          resource('Shipping Service', 'service:shipping:1.0.0', 'Ships every order'),
        ],
        'shipped order'
      );
      expect(ranked.map((item) => item.name)).toEqual(['Order Shipped']);
      expect(
        rankResourceSearchItems(
          [resource('Stock Reordered', 'event:x:1.0.0'), resource('Order Stocked', 'event:y:1.0.0')],
          'order stock'
        ).map((item) => item.name)
      ).toEqual(['Order Stocked', 'Stock Reordered']);
    });

    it('does not join words across a gap to match ("ordering" is not "Order Ingested")', () => {
      expect(rankResourceSearchItems([resource('Order Ingested', 'event:order-ingested:1.0.0')], 'ordering')).toEqual([]);
    });

    it('treats an id typed with different separators as exact', () => {
      const items = [
        resource('Placed', 'event:OrderPlaced:1.0.0'),
        resource('Order Placed Twice', 'event:order-placed-twice:1.0.0'),
      ];
      expect(rankResourceSearchItems(items, 'order-placed')[0].key).toBe('event:OrderPlaced:1.0.0');
    });
  });

  describe('normalizeSearchText', () => {
    it.each([
      ['OrderCreated', 'order created'],
      ['order-created', 'order created'],
      ['order_created.v2', 'order created v2'],
      ['HTTPServer', 'http server'],
      ['  Mixed   Spacing  ', 'mixed spacing'],
    ])('reads %s as "%s"', (input, expected) => {
      expect(normalizeSearchText(input)).toBe(expected);
    });
  });
});
