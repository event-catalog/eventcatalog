import { getViteConfig } from 'astro/config';
import tsConfigPaths from 'vite-tsconfig-paths';

export default getViteConfig({
  plugins: [tsConfigPaths()],
  test: {
    globals: true,
    env: {
      PROJECT_DIR: '../../../examples/default/',
      CATALOG_DIR: './',
    },
  },
});
