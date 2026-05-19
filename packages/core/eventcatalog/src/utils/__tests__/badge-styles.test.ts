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

  it('keeps safe absolute badge urls unchanged', () => {
    expect(getBadgeHref({ url: 'https://example.com/docs' })).toBe('https://example.com/docs');
    expect(getBadgeHref({ url: 'http://example.com/docs' })).toBe('http://example.com/docs');
    expect(getBadgeHref({ url: 'mailto:hello@example.com' })).toBe('mailto:hello@example.com');
    expect(getBadgeHref({ url: 'tel:+441234567890' })).toBe('tel:+441234567890');
  });

  it('rejects unsafe absolute badge url schemes', () => {
    expect(getBadgeHref({ url: 'javascript:alert(1)' })).toBeUndefined();
    expect(getBadgeHref({ url: 'data:text/html,<script>alert(1)</script>' })).toBeUndefined();
    expect(getBadgeHref({ url: 'vbscript:msgbox(1)' })).toBeUndefined();
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
