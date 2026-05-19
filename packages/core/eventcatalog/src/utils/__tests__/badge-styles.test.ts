import { afterEach, describe, expect, it, vi } from 'vitest';
import { getBadgeHref } from '../badge-styles';

describe('getBadgeHref', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns undefined when a badge has no url', () => {
    expect(getBadgeHref({})).toBeUndefined();
  });

  it('builds root-relative badge urls through the catalog url builder', () => {
    expect(getBadgeHref({ url: '/domains/Payments' })).toBe('/domains/Payments');
  });

  it('keeps absolute badge urls unchanged', () => {
    expect(getBadgeHref({ url: 'https://example.com/docs' })).toBe('https://example.com/docs');
  });

  it('does not rebuild badge urls that already include the catalog base url', () => {
    vi.stubEnv('BASE_URL', '/catalog/');

    expect(getBadgeHref({ url: '/catalog/docs/services/InventoryService/0.0.2/spec/openapi' })).toBe(
      '/catalog/docs/services/InventoryService/0.0.2/spec/openapi'
    );
  });

  it('still base-prefixes root-relative badge urls without the catalog base url', () => {
    vi.stubEnv('BASE_URL', '/catalog/');

    expect(getBadgeHref({ url: '/docs/services/InventoryService/0.0.2' })).toBe('/catalog/docs/services/InventoryService/0.0.2');
  });
});
