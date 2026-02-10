import { defineConfig } from 'tsup';

export default defineConfig({
  target: 'es2020',
  format: ['cjs', 'esm'],
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true,
  entry: {
    index: 'src/index.ts',
    'cli/index': 'src/cli/index.ts',
    'cli-docs': 'src/cli-docs.ts',
  },
  outDir: 'dist',
  shims: true,
});
