import { defineProject } from 'vitest/config';
import { getViteConfig } from 'astro/config';
import { defaultExclude } from 'vitest/config';
import tsConfigPaths from 'vite-tsconfig-paths';

export default defineProject(
  getViteConfig({
    plugins: [tsConfigPaths()],
    test: {
      name: 'astro',
      globals: true,
      exclude: [...defaultExclude, 'e2e/**'],
    },
  })
);
