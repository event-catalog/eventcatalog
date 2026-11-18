import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { getMarkdownPathForPage, getMarkdownRewritePath, prefersMarkdown } from '../markdown-pages';

describe('getMarkdownPathForPage', () => {
  it.each([
    ['/docs/events/OrderCreated/1.0.0', '/docs/events/OrderCreated/1.0.0.mdx'],
    ['/docs/events/OrderCreated/1.0.0/', '/docs/events/OrderCreated/1.0.0.mdx'],
    ['/docs/events/OrderCreated/1.0.0.html', '/docs/events/OrderCreated/1.0.0.mdx'],
    ['/docs/services/OrdersService/1.0.0/adrs/01-decision', '/docs/services/OrdersService/1.0.0/adrs/01-decision.mdx'],
    ['/docs/teams/full-stack', '/docs/teams/full-stack.mdx'],
    ['/docs/users/dboyne', '/docs/users/dboyne.mdx'],
    ['/docs/custom/guides/getting-started', '/docs/custom/guides/getting-started.mdx'],
  ])('maps %s to %s', (page, markdown) => {
    expect(getMarkdownPathForPage(page)).toBe(markdown);
  });

  it.each([
    '/',
    '/discover/events',
    '/docs/custom',
    '/docs/events/OrderCreated',
    '/docs/events/OrderCreated/1.0.0.mdx',
    '/docs/events/OrderCreated/1.0.0.md',
    '/docs/events/OrderCreated/1.0.0/changelog',
    '/docs/services/OrdersService/changelog',
    '/docs/services/OrdersService/1.0.0/spec/openapi',
    '/docs/services/OrdersService/1.0.0/asyncapi/asyncapi',
    '/docs/domains/Orders/language',
    '/docs/domains/Orders/language/Order',
    '/docs/teams/full-stack/resources',
    '/docs/systems/Payments/1.0.0/adrs/01-decision',
    '/docs/unknown/Thing/1.0.0',
  ])('has no Markdown for %s', (page) => {
    expect(getMarkdownPathForPage(page)).toBeNull();
  });

  it('keeps the base path', () => {
    expect(getMarkdownPathForPage('/catalog/docs/events/OrderCreated/1.0.0', '/catalog/')).toBe(
      '/catalog/docs/events/OrderCreated/1.0.0.mdx'
    );
    expect(getMarkdownPathForPage('/catalog/docs/teams/full-stack/', '/catalog')).toBe('/catalog/docs/teams/full-stack.mdx');
  });
});

describe('prefersMarkdown', () => {
  it.each([
    ['text/markdown', true],
    ['text/markdown, text/html', true],
    ['text/markdown;q=0.9, text/html;q=0.9', true],
    ['text/html;q=0.5, text/markdown', true],
    ['text/plain, TEXT/MARKDOWN', true],
    ['text/markdown, */*;q=0.1', true],
    ['text/markdown;q=0.8, text/*;q=0.5', true],
    // The exact text/html range wins over text/*, so HTML ranks 0.4 here
    ['text/markdown;q=0.5, text/html;q=0.4, text/*;q=0.9', true],
  ])('wants Markdown for "%s"', (accept, expected) => {
    expect(prefersMarkdown(accept)).toBe(expected);
  });

  it.each([
    [null],
    [''],
    ['*/*'],
    ['text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'],
    ['text/html, text/markdown;q=0.5'],
    ['text/markdown;q=0'],
    ['text/markdown;q=0.5, text/*;q=0.9'],
    ['text/markdown;q=0.5, */*'],
    ['text/markdown;q=0.5, text/html;q=0.6, text/*;q=0.1'],
  ])('wants HTML for "%s"', (accept) => {
    expect(prefersMarkdown(accept)).toBe(false);
  });
});

describe('getMarkdownRewritePath', () => {
  it('keeps the path when there is no base path', () => {
    expect(getMarkdownRewritePath('/docs/events/OrderCreated/1.0.0.mdx')).toBe('/docs/events/OrderCreated/1.0.0.mdx');
  });

  it('drops the base path', () => {
    expect(getMarkdownRewritePath('/catalog/docs/events/OrderCreated/1.0.0.mdx', '/catalog/')).toBe(
      '/docs/events/OrderCreated/1.0.0.mdx'
    );
  });

  it('has none when the path without the base still starts with the base', () => {
    expect(getMarkdownRewritePath('/docs/docs/events/OrderCreated/1.0.0.mdx', '/docs/')).toBeNull();
  });

  it('has none for a path outside the base', () => {
    expect(getMarkdownRewritePath('/docs/events/OrderCreated/1.0.0.mdx', '/catalog/')).toBeNull();
  });

  // Pins the Astro behaviour the rewrite path works around: under a base path, Astro adds a trailing slash to a
  // rewrite that includes the base, and an endpoint with an extension (`[version].mdx.ts`) never matches one.
  describe('against Astro routing', async () => {
    const astroRoot = dirname(createRequire(import.meta.url).resolve('astro/package.json'));
    const { normalizeRewritePathname } = await import(pathToFileURL(join(astroRoot, 'dist/core/routing/rewrite.js')).href);
    const { getPattern } = await import(pathToFileURL(join(astroRoot, 'dist/core/routing/pattern.js')).href);
    const dynamic = (content: string) => ({ content, dynamic: true, spread: false });
    const endpointPattern = getPattern(
      [
        [{ content: 'docs', dynamic: false, spread: false }],
        [dynamic('type')],
        [dynamic('id')],
        [dynamic('version'), { content: '.mdx', dynamic: false, spread: false }],
      ],
      '/catalog',
      'never'
    );
    const markdownPath = '/catalog/docs/events/OrderCreated/1.0.0.mdx';

    it.each([
      ['ignore', 'directory'],
      ['always', 'directory'],
      ['ignore', 'file'],
    ])('routes the rewrite path (trailingSlash %s, build.format %s)', (trailingSlash, buildFormat) => {
      const rewritePath = getMarkdownRewritePath(markdownPath, '/catalog/')!;
      const { pathname, resolvedUrlPathname } = normalizeRewritePathname(rewritePath, '/catalog/', trailingSlash, buildFormat);
      expect(endpointPattern.test(pathname)).toBe(true);
      expect(resolvedUrlPathname).toBe(markdownPath);
    });

    it('misses the route when the rewrite keeps the base path', () => {
      const { pathname } = normalizeRewritePathname(markdownPath, '/catalog/', 'ignore', 'directory');
      expect(endpointPattern.test(pathname)).toBe(false);
    });
  });
});
