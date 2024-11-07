import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['scripts/**/*.{j,t}s', '!scripts/**/__tests__/**'],
  dts: true,
  outDir: 'dist/',
  format: ['esm', 'cjs'],
  shims: true,
  clean: true,
});
