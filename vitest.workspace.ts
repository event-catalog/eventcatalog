import { defaultExclude, defineWorkspace } from 'vitest/config';
import { getViteConfig } from 'astro/config';
import tsConfigPaths from 'vite-tsconfig-paths';

export default defineWorkspace([
  {
    plugins: [tsConfigPaths()],
    test: {
      name: '@eventcatalog/core',
      globals: true,
      root: 'packages/core/',
      exclude: [...defaultExclude, 'e2e/**', 'eventcatalog/**'],
    },
  },
  getViteConfig({
    plugins: [tsConfigPaths()],
    test: {
      name: '@eventcatalog/astro',
      globals: true,
      root: 'packages/core/eventcatalog/',
      env: {
        PROJECT_DIR: 'examples/default/',
        CATALOG_DIR: 'packages/core/eventcatalog/',
      },
    },
  }),
]);
