import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // The CLI tests run the linter as a separate process (some several times), which can take more than the
    // default 5s on a busy CI machine running every package's tests at once. Same as @eventcatalog/cli.
    testTimeout: 15_000,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/'],
    },
  },
});
