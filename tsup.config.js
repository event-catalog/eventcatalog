import { defineConfig } from 'tsup';

export default defineConfig({
  tsconfig: './tsconfig.bin.json',
  entry: ['bin/src/**/*.{j,t}s'],
  dts: true,
  outDir: 'bin/dist',
  format: ['esm', 'cjs'],
  shims: true,
  clean: true,
});
