/// <reference types="vitest" />
import { getViteConfig } from 'astro/config';
import tsConfigPaths from 'vite-tsconfig-paths';

export default getViteConfig({
  plugins: [tsConfigPaths()],
  test: {
    globals: true,
    include: ['**/__tests__/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  },
});
