import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';
import { fileURLToPath } from 'url';
import { userConfigPlugin } from './eventcatalog/integrations/eventcatalog-runtime.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = process.env.PROJECT_DIR || path.resolve(__dirname, '../../examples/default');

export default defineConfig({
  root: __dirname,
  define: {
    __EC_TRAILING_SLASH__: false,
  },
  plugins: [
    // Match the application build so config-time imports share @config mocks,
    // including imports that omit the source module's .ts extension.
    userConfigPlugin(projectDirectory),
    tsconfigPaths({
      projects: [path.resolve(__dirname, 'eventcatalog/tsconfig.json')],
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 5000,
    exclude: ['**/node_modules/**', '**/dist/**', '**/fields-db.test.*'],
    env: {
      PROJECT_DIR: projectDirectory,
    },
  },
  resolve: {
    conditions: ['import', 'module', 'node', 'default'],
    // Keep package aliases aligned with eventcatalog/tsconfig.json,
    // eventcatalog/integrations/eventcatalog-runtime.mjs and examples/default/tsconfig.json.
    alias: {
      'astro:content': path.resolve(__dirname, './src/__mocks__/astro-content.ts'),
      '@config': path.join(projectDirectory, 'eventcatalog.config.js'),
      '@eventcatalog/connectors': path.resolve(__dirname, 'node_modules/@eventcatalog/connectors/dist/index.mjs'),
      '@eventcatalog/license': path.resolve(__dirname, 'node_modules/@eventcatalog/license/dist/index.js'),
      '@eventcatalog/sdk': path.resolve(__dirname, 'node_modules/@eventcatalog/sdk/dist/index.mjs'),
      '@eventcatalog': path.resolve(__dirname, 'eventcatalog/src/utils/eventcatalog-config/catalog.ts'),
      '@icons': path.resolve(__dirname, 'eventcatalog/src/icons'),
      '@components': path.resolve(__dirname, 'eventcatalog/src/components'),
      '@catalog/components': path.join(projectDirectory, 'components'),
      '@catalog/snippets': path.join(projectDirectory, 'snippets'),
      '@types': path.resolve(__dirname, 'eventcatalog/src/types/index.ts'),
      '@utils': path.resolve(__dirname, 'eventcatalog/src/utils'),
      '@layouts': path.resolve(__dirname, 'eventcatalog/src/layouts'),
      '@enterprise': path.resolve(__dirname, 'eventcatalog/src/enterprise'),
      'auth:config': path.resolve(__dirname, 'eventcatalog/auth.config.ts'),
    },
  },
});
