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
  });

  describe('development output', () => {
    it('continues to filter all router messages', () => {
      const shouldFilterLine = createAstroDevLineFilter();

      expect(shouldFilterLine('11:09:22 [WARN] [router] A different routing warning')).toBe(true);
    });
  });
});
