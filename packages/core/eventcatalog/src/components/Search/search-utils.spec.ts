import { describe, expect, it, beforeEach } from 'vitest';
import { getUrlForSearchItem } from './search-utils';

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
