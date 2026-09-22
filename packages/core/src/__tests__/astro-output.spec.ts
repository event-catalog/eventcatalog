import { describe, expect, it } from 'vitest';
import { createAstroDevLineFilter, createAstroLineFilter } from '../astro-output';

describe('Astro output filters', () => {
  describe('build output', () => {
    const shouldFilterLine = createAstroLineFilter();

    it('filters getStaticPaths warnings for dynamic pages', () => {
      expect(
        shouldFilterLine(
          '11:09:22 [WARN] [router] getStaticPaths() ignored in dynamic page /src/pages/docs/[type]/[id]/index.astro. Add `export const prerender = true;` to prerender the page as static HTML during the build process.'
        )
      ).toBe(true);
    });

    it('does not filter other router warnings', () => {
      expect(shouldFilterLine('11:09:22 [WARN] [router] A different routing warning')).toBe(false);
    });

    it('does not filter matching text from a different logger', () => {
      expect(shouldFilterLine('11:09:22 [WARN] [build] getStaticPaths() ignored in dynamic page example.astro')).toBe(false);
    });

    it('continues to filter expected content loader noise', () => {
      expect(shouldFilterLine('11:09:22 [WARN] [glob-loader] No files found')).toBe(true);
      expect(
        shouldFilterLine('The collection "events" does not exist or is empty. Please check your content config file for errors.')
      ).toBe(true);
    });

    it('filters Astro empty-collection warnings for unused EventCatalog collections', () => {
      const message = 'The collection "queries" does not exist or is empty. Please check your content config file for errors.';
      const colored = `\u001b[33m\u001b[1m11:09:22\u001b[22m [WARN] [content]\u001b[39m ${message}`;

      expect(shouldFilterLine(`11:09:22 [WARN] [content] ${message}`)).toBe(true);
      expect(shouldFilterLine(colored)).toBe(true);
      expect(shouldFilterLine(`11:09:22 [WARN] [content] ${message.replace('queries', 'containers')}`)).toBe(true);
    });

    it('keeps real content-config errors and warnings for unknown collections', () => {
      expect(shouldFilterLine('11:09:22 [WARN] [content] Content config not loaded')).toBe(false);
      expect(shouldFilterLine('11:09:22 [ERROR] [content] events → OrderCreated data does not match collection schema.')).toBe(
        false
      );
      expect(
        shouldFilterLine(
          '11:09:22 [ERROR] [content] The collection "events" does not exist or is empty. Please check your content config file for errors.'
        )
      ).toBe(false);
      expect(
        shouldFilterLine(
          '11:09:22 [WARN] [content] The collection "blog" does not exist or is empty. Please check your content config file for errors.'
        )
      ).toBe(false);
    });
  });

  describe('development output', () => {
    it('continues to filter all router messages', () => {
      const shouldFilterLine = createAstroDevLineFilter();

      expect(shouldFilterLine('11:09:22 [WARN] [router] A different routing warning')).toBe(true);
    });
  });
});
