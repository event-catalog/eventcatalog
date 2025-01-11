import { defaultExclude, defineWorkspace } from 'vitest/config';
import { getViteConfig } from 'astro/config';
import tsConfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineWorkspace([
  {
    plugins: [tsConfigPaths()],
    test: {
      name: '@eventcatalog/core',
      globals: true,
      exclude: [...defaultExclude, 'e2e/**', 'eventcatalog/**'],
    },
  },
  getViteConfig({
    root: 'eventcatalog/',
    plugins: [tsConfigPaths()],
    test: {
      name: '@eventcatalog/astro',
      globals: true,
      root: 'eventcatalog/',
      env: {
        PROJECT_DIR: 'examples/default/',
        CATALOG_DIR: 'eventcatalog/',
      },
    },
  }),
]);
