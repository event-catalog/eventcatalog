import { defineConfig, type Options } from 'tsup';
import fs from 'node:fs';
import path from 'node:path';

const shared = {
  dts: true,
  sourcemap: true,
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
    'yjs',
    'zod',
    // Loaded when first needed (see utils/elk-layout.ts), so kept out of the bundle
    'elkjs',
    'elkjs/lib/elk.bundled.js',
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
} satisfies Options;

export default defineConfig([
  // ES modules: the visualiser, `layout` (graph layout without React, for laying graphs out on the server) and
  // `studio` (Studio's canvas), sharing their code (split into chunks): `studio` uses the visualiser's nodes and
  // contexts, and two copies of them wouldn't share a canvas
  {
    ...shared,
    entry: { index: 'src/index.ts', layout: 'src/layout.ts', studio: 'src/studio/index.ts', model: 'src/model/index.ts' },
    format: ['esm'],
    splitting: true,
  },
  // CommonJS: the visualiser and `layout` (Studio's canvas is ES modules only)
  {
    ...shared,
    entry: { index: 'src/index.ts', layout: 'src/layout.ts' },
    format: ['cjs'],
    splitting: false,
  },
]);
