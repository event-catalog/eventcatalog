import { defineConfig } from 'tsup';
import { copyFileSync } from 'node:fs';

export default defineConfig({
  target: 'es2020',
  format: ['cjs', 'esm'],
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true,
  entry: {
    'cli/index': 'src/cli/index.ts',
    'cli-docs': 'src/cli-docs.ts',
  },
  outDir: 'dist',
  shims: true,
  async onSuccess() {
    copyFileSync('src/cli/logo.png', 'dist/cli/logo.png');
  },
});
