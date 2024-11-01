import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'bin/eventcatalog.ts',
    'bin/eventcatalog.config.ts',
    'bin/logger.ts',
    'scripts/catalog-to-astro-content-directory.js', // Hydrate
    'scripts/map-catalog-to-astro.js', // Hydrate depends on
    'scripts/eventcatalog-config-file-utils.js', // Hydrate depends on
  ],
  dts: true,
  outDir: 'dist/',
  format: ['esm', 'cjs'],
  shims: true,
  clean: true,
});
