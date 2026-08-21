import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/**', '!src/**/__tests__/**', '!src/**/LICENSE'],
  dts: true,
  outDir: 'dist/',
  format: ['esm', 'cjs'],
  shims: true,
  clean: true,
});
