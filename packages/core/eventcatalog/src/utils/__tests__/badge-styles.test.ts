import { describe, expect, it } from 'vitest';
import { getBadgeHref } from '../badge-styles';

describe('getBadgeHref', () => {
  it('returns undefined when a badge has no url', () => {
    expect(getBadgeHref({})).toBeUndefined();
  });

  it('builds root-relative badge urls through the catalog url builder', () => {
    expect(getBadgeHref({ url: '/domains/Payments' })).toBe('/domains/Payments');
  });

  it('keeps absolute badge urls unchanged', () => {
    expect(getBadgeHref({ url: 'https://example.com/docs' })).toBe('https://example.com/docs');
  });
});
