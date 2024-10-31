import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['bin/eventcatalog.ts', 'bin/eventcatalog.config.ts', 'bin/logger.ts'],
  dts: true,
  outDir: 'bin/dist',
  format: ['esm', 'cjs'],
  shims: true,
  clean: true,
});
