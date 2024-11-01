import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'bin/eventcatalog.ts',
    'bin/eventcatalog.config.ts',
    'bin/logger.ts',
    // Hydrate and dependencies
    'scripts/catalog-to-astro-content-directory.js',
    'scripts/map-catalog-to-astro.js',
    'scripts/eventcatalog-config-file-utils.js',
    // LogBuild and dependencies
    'scripts/analytics/log-build.ts',
    'scripts/analytics/analytics.js',
  ],
  dts: true,
  outDir: 'dist/',
  format: ['esm', 'cjs'],
  shims: true,
  clean: true,
});
