import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getHeaderNavigationCurrent, resolveHeaderNavigation, resolveNavigationHref } from '../header-navigation';

const setTrailingSlash = (enabled: boolean) => {
  // @ts-ignore
  global.__EC_TRAILING_SLASH__ = enabled;
};

describe('header navigation', () => {
  beforeEach(() => setTrailingSlash(false));
  afterEach(() => vi.unstubAllEnvs());

  describe('resolveHeaderNavigation', () => {
    it('returns no links when navigation.header is not set', () => {
      expect(resolveHeaderNavigation(undefined)).toEqual([]);
    });

    it('resolves a catalog link, marking it current under its own path by default', () => {
      expect(resolveHeaderNavigation([{ label: 'Docs', href: '/docs/custom' }])).toEqual([
        {
          type: 'link',
          label: 'Docs',
          href: '/docs/custom',
          external: false,
          icon: undefined,
          description: undefined,
          match: [{ path: '/docs/custom' }],
        },
      ]);
    });

    it('marks a link current under the paths in its match option instead of its own path', () => {
      const [docs] = resolveHeaderNavigation([
        { label: 'Docs', href: '/docs/custom/platform/overview', match: ['/docs/custom/', '/schemas?tab=all'] },
      ]);

      expect(docs.match).toEqual([{ path: '/docs/custom' }, { path: '/schemas' }]);
    });

    it("falls back to the link's own path when none of its match paths are catalog paths", () => {
      const [docs] = resolveHeaderNavigation([{ label: 'Docs', href: '/docs/custom', match: ['', 'https://example.com'] }]);

      expect(docs.match).toEqual([{ path: '/docs/custom' }]);
    });

    it('treats a link to another site as external and never current', () => {
      const [status] = resolveHeaderNavigation([{ label: 'Status', href: 'https://status.example.com' }]);

      expect(status).toMatchObject({ href: 'https://status.example.com', external: true, match: [] });
    });

    it('resolves a dropdown, gathering its loose links into one unlabelled section alongside labelled sections', () => {
      const [resources] = resolveHeaderNavigation([
        {
          label: 'Resources',
          items: [
            { label: 'Teams', href: '/directory/teams', icon: 'Users', description: 'Who owns what' },
            { label: 'Learn', items: [{ label: 'Schemas', href: '/schemas/explorer' }] },
            { label: 'Blog', href: 'https://example.com/blog' },
          ],
        },
      ]);

      expect(resources.type).toBe('dropdown');
      if (resources.type !== 'dropdown') return;
      expect(resources.sections.map((section) => [section.label, section.items.map((link) => link.label)])).toEqual([
        [undefined, ['Teams', 'Blog']],
        ['Learn', ['Schemas']],
      ]);
      expect(resources.sections[0].items[0]).toMatchObject({ icon: 'Users', description: 'Who owns what' });
      // The dropdown is current wherever one of its links is
      expect(resources.match).toEqual([{ path: '/directory/teams' }, { path: '/schemas/explorer' }]);
    });

    it('leaves out entries without a label or a usable href, and dropdowns left with no links', () => {
      const items = resolveHeaderNavigation([
        { label: 'Docs', href: '/docs/custom' },
        { label: '', href: '/discover' },
        { label: 'No href' },
        { label: 'Script', href: 'javascript:alert(1)' },
        { label: 'Empty', items: [{ label: 'Broken' }] },
        'not-a-link',
      ]);

      expect(items.map((item) => item.label)).toEqual(['Docs']);
    });

    it("only marks a link to the catalog's root current on the root itself, when the catalog has a base URL", () => {
      vi.stubEnv('BASE_URL', '/catalog');
      const [home] = resolveHeaderNavigation([{ label: 'Home', href: '/' }]);

      expect(home.match).toEqual([{ path: '/catalog', exact: true }]);
      expect(getHeaderNavigationCurrent(home.match, '/catalog/')).toBe('page');
      expect(getHeaderNavigationCurrent(home.match, '/catalog/discover/events')).toBe(false);
    });
  });

  describe('resolveNavigationHref', () => {
    it('adds the base URL to catalog paths and keeps other sites, mailto: and tel: links and anchors as they are', () => {
      vi.stubEnv('BASE_URL', '/catalog');

      expect(resolveNavigationHref('/docs/custom')).toBe('/catalog/docs/custom');
      expect(resolveNavigationHref('https://example.com')).toBe('https://example.com');
      expect(resolveNavigationHref('//example.com')).toBe('//example.com');
      expect(resolveNavigationHref('mailto:team@example.com')).toBe('mailto:team@example.com');
      expect(resolveNavigationHref('tel:+441234567890')).toBe('tel:+441234567890');
      expect(resolveNavigationHref('#intro')).toBe('#intro');
    });

    it('adds the trailing slash before a query or hash, not after it', () => {
      setTrailingSlash(true);

      expect(resolveNavigationHref('/docs/custom')).toBe('/docs/custom/');
      expect(resolveNavigationHref('/docs/custom#intro')).toBe('/docs/custom/#intro');
      expect(resolveNavigationHref('/schemas/explorer?type=events')).toBe('/schemas/explorer/?type=events');
    });

    it('drops links with any other scheme, such as javascript:', () => {
      expect(resolveNavigationHref('javascript:alert(1)')).toBeNull();
    });
  });

  describe('getHeaderNavigationCurrent', () => {
    it("is the current page on the link's own path", () => {
      expect(getHeaderNavigationCurrent([{ path: '/docs/custom' }], '/docs/custom/')).toBe('page');
    });

    it('is the current section on pages under the matched path', () => {
      expect(getHeaderNavigationCurrent([{ path: '/docs/custom' }], '/docs/custom/platform/overview')).toBe('section');
    });

    it('is not current on a path that only starts with the same characters', () => {
      expect(getHeaderNavigationCurrent([{ path: '/docs/custom' }], '/docs/customers')).toBe(false);
    });

    it('is current for a link to the homepage only on the homepage', () => {
      const [home] = resolveHeaderNavigation([{ label: 'Home', href: '/' }]);

      expect(getHeaderNavigationCurrent(home.match, '/')).toBe('page');
      expect(getHeaderNavigationCurrent(home.match, '/discover/events')).toBe(false);
    });
  });
});
