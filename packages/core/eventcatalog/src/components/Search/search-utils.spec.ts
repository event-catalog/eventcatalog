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
  ])('builds a docs URL for %s', (key, expected) => {
    expect(getUrlForSearchItem({}, key)).toBe(expected);
  });

  it('uses the explicit node href when provided', () => {
    expect(getUrlForSearchItem({ href: '/custom/search-result' }, 'data-product:Customer360:1.0.0')).toBe(
      '/custom/search-result'
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
