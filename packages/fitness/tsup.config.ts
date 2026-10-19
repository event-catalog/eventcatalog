import { defineConfig } from 'tsup';

export default defineConfig({
  target: 'es2020',
  format: ['cjs', 'esm'],
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true,
  entry: {
    // The runner is bundled into this entry, and loads it again for fitness functions that import the package
    index: 'src/index.ts',
  },
  outDir: 'dist',
  shims: true,
});
