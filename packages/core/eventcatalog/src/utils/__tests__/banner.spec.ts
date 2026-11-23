import { afterEach, describe, expect, it } from 'vitest';
import { getBanner } from '@utils/banner';

describe('getBanner', () => {
  const baseUrl = import.meta.env.BASE_URL;

  afterEach(() => {
    import.meta.env.BASE_URL = baseUrl;
    delete (globalThis as { __EC_TRAILING_SLASH__?: boolean }).__EC_TRAILING_SLASH__;
  });

  it('is null when the catalog has no banner, or no message for it', () => {
    expect(getBanner({})).toBeNull();
    expect(getBanner(undefined)).toBeNull();
    expect(getBanner({ banner: { message: '   ' } })).toBeNull();
  });

  it('is an info banner visitors can dismiss by default', () => {
    expect(getBanner({ banner: { message: 'Orders moves to Kafka on 1 March.' } })).toEqual({
      id: expect.any(String),
      message: 'Orders moves to Kafka on 1 March.',
      link: undefined,
      type: 'info',
      dismissible: true,
    });
  });

  it("uses the catalog's type and dismissible settings", () => {
    const banner = getBanner({ banner: { message: 'Kafka is down', type: 'danger', dismissible: false } });
    expect(banner?.type).toBe('danger');
    expect(banner?.dismissible).toBe(false);
  });

  it('falls back to info for a type it does not know', () => {
    expect(getBanner({ banner: { message: 'Hello', type: 'purple' } })?.type).toBe('info');
  });

  it("puts the catalog's base path on links to its own pages, and leaves other links as they are", () => {
    import.meta.env.BASE_URL = '/catalog/';
    const href = (link: string) => getBanner({ banner: { message: 'Hello', link: { label: 'Read', href: link } } })?.link?.href;

    expect(href('/docs/custom/kafka')).toBe('/catalog/docs/custom/kafka');
    expect(href('https://example.com/plan')).toBe('https://example.com/plan');
    expect(href('mailto:platform@example.com')).toBe('mailto:platform@example.com');
    expect(href('//example.com/plan')).toBe('//example.com/plan');
  });

  it('keeps a query string and fragment after the path, with a trailing slash on the path', () => {
    import.meta.env.BASE_URL = '/catalog/';
    (globalThis as { __EC_TRAILING_SLASH__?: boolean }).__EC_TRAILING_SLASH__ = true;
    const href = (link: string) => getBanner({ banner: { message: 'Hello', link: { label: 'Read', href: link } } })?.link?.href;

    expect(href('/docs/custom/kafka#timeline')).toBe('/catalog/docs/custom/kafka/#timeline');
    expect(href('/discover/events?level=1')).toBe('/catalog/discover/events/?level=1');
    expect(href('/docs/custom/kafka')).toBe('/catalog/docs/custom/kafka/');
  });

  it('has no link for a script URL, or without both a label and an href', () => {
    expect(
      getBanner({ banner: { message: 'Hello', link: { label: 'Read', href: 'javascript:alert(1)' } } })?.link
    ).toBeUndefined();
    expect(getBanner({ banner: { message: 'Hello', link: { label: 'Read' } } })?.link).toBeUndefined();
    expect(getBanner({ banner: { message: 'Hello', link: { href: '/docs' } } })?.link).toBeUndefined();
  });

  it('gives a new message a new id, so visitors who dismissed the old one see it', () => {
    const first = getBanner({ banner: { message: 'Orders moves to Kafka on 1 March.' } });
    const same = getBanner({ banner: { message: 'Orders moves to Kafka on 1 March.' } });
    const changed = getBanner({ banner: { message: 'Orders moves to Kafka on 8 March.' } });

    expect(first?.id).toBe(same?.id);
    expect(changed?.id).not.toBe(first?.id);
  });

  it("uses the catalog's id when it sets one", () => {
    expect(getBanner({ banner: { message: 'Reworded', id: 'kafka-migration' } })?.id).toBe('kafka-migration');
  });
});
