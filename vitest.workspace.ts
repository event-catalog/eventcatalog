import { defineWorkspace } from 'vitest/config';
import { getViteConfig } from 'astro/config';
import tsConfigPaths from 'vite-tsconfig-paths';

export default defineWorkspace([
  {
    plugins: [tsConfigPaths()],
    test: {
      name: '@eventcatalog/core',
      globals: true,
      dir: 'src/',
    },
  },
  getViteConfig({
    plugins: [tsConfigPaths()],
    test: {
      name: '@eventcatalog/astro',
      globals: true,
      root: 'astro/',
      env: {
        PROJECT_DIR: 'examples/default/',
        CATALOG_DIR: 'astro/',
      },
    },
  }),
]);
