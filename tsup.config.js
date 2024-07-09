import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['bin/eventcatalog.ts', 'bin/eventcatalog.config.ts'],
  dts: true,
  outDir: 'bin/dist',
  format: ['esm', 'cjs'],
  shims: true,
});
