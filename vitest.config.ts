/// <reference types="vitest" />
import { getViteConfig } from 'astro/config';
import { defaultExclude } from 'vitest/config';
import tsConfigPaths from 'vite-tsconfig-paths';

export default getViteConfig({
  plugins: [tsConfigPaths()],
  test: {
    globals: true,
    exclude: [...defaultExclude, 'e2e/**'],
  },
});
