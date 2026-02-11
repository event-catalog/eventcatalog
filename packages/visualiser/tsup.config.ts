import { defineConfig } from 'tsup';
import fs from 'node:fs';
import path from 'node:path';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'react-dom',
    '@xyflow/react',
    'lucide-react',
    '@heroicons/react',
    '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-context-menu',
    '@radix-ui/react-dialog',
    '@radix-ui/react-tooltip',
    'html-to-image',
    'mermaid',
  ],
  loader: {
    '.svg': 'text',
  },
  esbuildOptions(options) {
    options.jsx = 'automatic';
    options.loader = {
      ...options.loader,
      '.svg': 'text',
    };
    options.plugins = [
      ...(options.plugins || []),
      {
        name: 'svg-raw-loader',
        setup(build) {
          build.onResolve({ filter: /\.svg\?raw$/ }, (args) => {
            const svgPath = path.resolve(args.resolveDir, args.path.replace('?raw', ''));
            return {
              path: svgPath,
              namespace: 'svg-raw',
            };
          });

          build.onLoad({ filter: /.*/, namespace: 'svg-raw' }, (args) => {
            const svgContent = fs.readFileSync(args.path, 'utf8');
            return {
              contents: `export default ${JSON.stringify(svgContent)};`,
              loader: 'js',
            };
          });
        },
      },
    ];
  },
});
