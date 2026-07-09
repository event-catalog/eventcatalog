/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/eventcatalog/src/enterprise/LICENSE
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, describe, it, beforeEach, afterEach } from 'vitest';
import { deriveRoutePattern, getCustomPageRoutes, isApiRoute, listCustomPageFiles, resolveCustomPagesPrefix } from '../routes';

describe('custom-pages routes', () => {
  describe('resolveCustomPagesPrefix', () => {
    it('defaults to "custom" when no prefix is configured', () => {
      expect(resolveCustomPagesPrefix(undefined)).toBe('custom');
    });

    it('normalizes leading and trailing slashes', () => {
      expect(resolveCustomPagesPrefix('/internal/')).toBe('internal');
    });

    it('allows nested prefixes', () => {
      expect(resolveCustomPagesPrefix('internal/tools')).toBe('internal/tools');
    });

    it('throws when the prefix is empty', () => {
      expect(() => resolveCustomPagesPrefix('/')).toThrow('cannot be empty');
    });

    it('throws when the prefix contains unsafe characters', () => {
      expect(() => resolveCustomPagesPrefix('my pages')).toThrow('invalid');
    });

    it('throws when the prefix shadows a core route', () => {
      expect(() => resolveCustomPagesPrefix('docs')).toThrow('reserved');
      expect(() => resolveCustomPagesPrefix('api/things')).toThrow('reserved');
      expect(() => resolveCustomPagesPrefix('Visualiser')).toThrow('reserved');
    });
  });

  describe('deriveRoutePattern', () => {
    it('derives patterns under the prefix', () => {
      expect(deriveRoutePattern('reports.astro', 'custom')).toBe('/custom/reports');
      expect(deriveRoutePattern(path.join('team', 'oncall.astro'), 'custom')).toBe('/custom/team/oncall');
    });

    it('maps index files to their directory', () => {
      expect(deriveRoutePattern('index.astro', 'custom')).toBe('/custom');
      expect(deriveRoutePattern(path.join('reports', 'index.astro'), 'custom')).toBe('/custom/reports');
    });

    it('keeps dynamic segments untouched', () => {
      expect(deriveRoutePattern(path.join('reports', '[id].astro'), 'custom')).toBe('/custom/reports/[id]');
      expect(deriveRoutePattern(path.join('docs', '[...slug].astro'), 'custom')).toBe('/custom/docs/[...slug]');
    });

    it('keeps compound extensions for endpoints', () => {
      expect(deriveRoutePattern('data.json.ts', 'custom')).toBe('/custom/data.json');
    });
  });

  describe('getCustomPageRoutes', () => {
    let customPagesDir: string;

    beforeEach(() => {
      customPagesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ec-custom-pages-'));
    });

    afterEach(() => {
      fs.rmSync(customPagesDir, { recursive: true, force: true });
    });

    const write = (relativePath: string, content = '') => {
      const fullPath = path.join(customPagesDir, relativePath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
    };

    it('returns no routes when the directory does not exist', () => {
      expect(getCustomPageRoutes(path.join(customPagesDir, 'missing'), 'custom')).toEqual([]);
    });

    it('returns routes for pages and endpoints', () => {
      write('reports.astro');
      write('api/teams.ts');

      const routes = getCustomPageRoutes(customPagesDir, 'custom');

      expect(routes).toEqual(
        expect.arrayContaining([
          { pattern: '/custom/reports', file: 'reports.astro', type: 'page' },
          { pattern: '/custom/api/teams', file: path.join('api', 'teams.ts'), type: 'endpoint' },
        ])
      );
      expect(routes).toHaveLength(2);
    });

    it('skips the custom landing page', () => {
      write('homepage.astro');
      expect(getCustomPageRoutes(customPagesDir, 'custom')).toEqual([]);
    });

    it('skips underscore-prefixed files and directories', () => {
      write('_partial.astro');
      write('_components/Card.astro');
      write('team/_helpers.ts');
      write('team/index.astro');

      const routes = getCustomPageRoutes(customPagesDir, 'custom');
      expect(routes).toEqual([{ pattern: '/custom/team', file: path.join('team', 'index.astro'), type: 'page' }]);
    });

    it('ignores non-code files', () => {
      write('notes.md');
      write('diagram.png');
      expect(getCustomPageRoutes(customPagesDir, 'custom')).toEqual([]);
    });

    it('lists routable files sorted, excluding partials and non-code files (used for the dev restart manifest)', () => {
      write('zebra.astro');
      write('api/teams.ts');
      write('_partial.astro');
      write('notes.md');

      expect(listCustomPageFiles(customPagesDir)).toEqual([path.join('api', 'teams.ts'), 'zebra.astro']);
    });
  });

  describe('isApiRoute', () => {
    it('detects routes in the api directory', () => {
      expect(isApiRoute({ pattern: '/custom/api/teams', file: path.join('api', 'teams.ts'), type: 'endpoint' })).toBe(true);
      expect(isApiRoute({ pattern: '/custom/reports', file: 'reports.astro', type: 'page' })).toBe(false);
    });
  });
});
