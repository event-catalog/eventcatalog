import { defineWorkspace } from 'vitest/config';
import { getViteConfig } from 'astro/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineWorkspace([
  {
    test: {
      name: '@eventcatalog/core',
      include: ['bin/__tests__/*.spec.ts'],
      globals: true,
    },
  },
  getViteConfig({
    plugins: [tsconfigPaths()],
    test: {
      globals: true,
      name: '@eventcatalog/astro',
      root: 'astro/',
    },
  }),
]);
