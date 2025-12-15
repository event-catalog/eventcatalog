import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
  plugins: [
    tsconfigPaths({
      projects: [path.resolve(__dirname, 'eventcatalog/tsconfig.json')],
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 5000,
    env: {
      PROJECT_DIR: path.resolve(__dirname, 'examples/default'),
    },
  },
  resolve: {
    conditions: ['import', 'module', 'node', 'default'],
    alias: {
      'astro:content': path.resolve(__dirname, './src/__mocks__/astro-content.ts'),
      '@config': path.resolve(__dirname, 'eventcatalog/eventcatalog.config.js'),
      '@eventcatalog/sdk': path.resolve(__dirname, 'node_modules/@eventcatalog/sdk/dist/index.mjs'),
      '@eventcatalog': path.resolve(__dirname, 'eventcatalog/src/utils/eventcatalog-config/catalog.ts'),
      '@icons': path.resolve(__dirname, 'eventcatalog/src/icons'),
      '@components': path.resolve(__dirname, 'eventcatalog/src/components'),
      '@catalog/components': path.resolve(__dirname, 'eventcatalog/src/custom-defined-components'),
      '@catalog/snippets': path.resolve(__dirname, 'eventcatalog/src/snippets'),
      '@types': path.resolve(__dirname, 'eventcatalog/src/types/index.ts'),
      '@utils': path.resolve(__dirname, 'eventcatalog/src/utils'),
      '@layouts': path.resolve(__dirname, 'eventcatalog/src/layouts'),
      '@enterprise': path.resolve(__dirname, 'eventcatalog/src/enterprise'),
      '@ai': path.resolve(__dirname, 'eventcatalog/src/generated-ai'),
      'auth:config': path.resolve(__dirname, 'eventcatalog/auth.config.ts'),
    },
  },
});
