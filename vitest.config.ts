/// <reference types="vitest" />
import { getViteConfig } from 'astro/config';
import tsConfigPaths from 'vite-tsconfig-paths';

export default getViteConfig({
  plugins: [tsConfigPaths()],
});
