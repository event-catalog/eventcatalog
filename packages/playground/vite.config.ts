import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Resolve .js imports to .ts files in the language source directory
function resolveJsToTs() {
  const srcDirs = [
    path.resolve(__dirname, '../language-server/src'),
  ];
  return {
    name: 'resolve-js-to-ts',
    resolveId(source: string, importer: string | undefined) {
      if (!importer || !source.endsWith('.js')) return null;
      const importerDir = path.dirname(importer);
      if (!srcDirs.some(d => importerDir.startsWith(d))) return null;
      const tsPath = path.resolve(importerDir, source.replace(/\.js$/, '.ts'));
      if (fs.existsSync(tsPath)) return tsPath;
      return null;
    },
  };
}

export default defineConfig({
  plugins: [resolveJsToTs(), react()],
  resolve: {
    alias: {
      '@eventcatalog/language-server': path.resolve(__dirname, '../language-server/src/index.ts'),
      '@eventcatalog/visualiser/styles.css': path.resolve(__dirname, '../visualiser/dist/styles.css'),
      '@eventcatalog/visualiser': path.resolve(__dirname, '../visualiser/src/index.ts'),
    },
  },
});
