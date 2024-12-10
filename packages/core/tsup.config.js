import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/**', '!src/**/__tests__/**'],
  dts: true,
  outDir: 'dist/',
  format: ['esm', 'cjs'],
  shims: true,
  clean: true,
});
