import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/**/*.{j,t}s'],
  config: 'tsconfig.build.json',
  dts: true,
  outDir: 'dist/',
  format: ['esm', 'cjs'],
  shims: true,
  clean: true,
});
