import path from 'node:path';
import { expect, describe, it } from 'vitest';
import { mapCatalogToAstro } from '../map-catalog-to-astro';

const PROJECT_DIR = path.join(__dirname, 'example-catalog');
const ASTRO_DIR = path.join(__dirname, 'tmp-astro');

const map = (relativeFilePath: string) =>
  mapCatalogToAstro({
    filePath: path.join(PROJECT_DIR, relativeFilePath),
    astroDir: ASTRO_DIR,
    projectDir: PROJECT_DIR,
  });

describe('map-catalog-to-astro', () => {
  describe('custom pages (top-level pages directory)', () => {
    it('maps .astro files to src/custom-pages instead of the public directory', () => {
      expect(map('pages/homepage.astro')).toEqual([path.join(ASTRO_DIR, 'src', 'custom-pages', 'homepage.astro')]);
      expect(map('pages/reports/[id].astro')).toEqual([path.join(ASTRO_DIR, 'src', 'custom-pages', 'reports', '[id].astro')]);
    });

    it('maps API endpoint files to src/custom-pages', () => {
      expect(map('pages/api/teams.ts')).toEqual([path.join(ASTRO_DIR, 'src', 'custom-pages', 'api', 'teams.ts')]);
      expect(map('pages/data.json.js')).toEqual([path.join(ASTRO_DIR, 'src', 'custom-pages', 'data.json.js')]);
    });

    it('maps directories to both custom-pages and public targets so deletes clean up both', () => {
      expect(map('pages/reports')).toEqual([
        path.join(ASTRO_DIR, 'src', 'custom-pages', 'reports'),
        path.join(ASTRO_DIR, 'public', 'generated', 'pages', 'reports'),
      ]);
    });

    it('keeps mapping non-code assets in pages to the public directory', () => {
      expect(map('pages/diagram.png')).toEqual([path.join(ASTRO_DIR, 'public', 'generated', 'pages', 'diagram.png')]);
    });

    it('does not treat nested pages directories inside collections as custom pages', () => {
      expect(map('domains/Orders/pages/overview.astro')).toEqual([
        path.join(ASTRO_DIR, 'public', 'generated', 'pages', 'overview.astro'),
      ]);
    });
  });

  describe('collections', () => {
    it('maps collection asset files to the public directory', () => {
      expect(map('events/OrderAmended/schema.json')).toEqual([
        path.join(ASTRO_DIR, 'public', 'generated', 'events', 'OrderAmended', 'schema.json'),
      ]);
    });

    it('ignores LikeC4 source files', () => {
      expect(map('events/OrderAmended/order-flow.c4')).toEqual([]);
    });
  });

  describe('custom components', () => {
    it('maps components to src/custom-defined-components', () => {
      expect(map('components/MyComponent.astro')).toEqual([
        path.join(ASTRO_DIR, 'src', 'custom-defined-components', 'MyComponent.astro'),
      ]);
    });
  });

  it('ignores files that are not catalog related', () => {
    expect(map('README.txt')).toEqual([]);
  });
});
