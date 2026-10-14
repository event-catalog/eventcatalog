#!/usr/bin/env node
/**
 * Builds the view into one self-contained HTML file (dist/view.html): the MCP App served as a ui:// resource
 * (hosts render it in a sandboxed iframe, so everything is inlined) and the browser page served at /view.
 * Adapted from event-catalog/eventcatalog@v5-beta:packages/core/scripts/build-mcp-apps.mjs
 */
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..');
const viewDirectory = path.join(root, 'view');
const outputDirectory = path.join(root, 'dist');

// The favicon: EventCatalog's logo, dark on light tabs and light on dark ones
const logo = fs.readFileSync(path.join(viewDirectory, 'styles/eventcatalog-logo.svg'), 'utf8');
const favicon = logo
  .replace(' aria-hidden="true"', '')
  .replace('fill="currentColor">', 'fill="#0f172a"><style>@media (prefers-color-scheme: dark) { svg { fill: #f8fafc } }</style>');
const faviconHref = `data:image/svg+xml,${encodeURIComponent(favicon)}`;

const toHtml = (title, script) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link rel="icon" type="image/svg+xml" href="${faviconHref}" />
  </head>
  <body style="margin: 0">
    <div id="root"></div>
    <script>${script.replace(/<\/script/gi, '<\\/script')}</script>
  </body>
</html>
`;

fs.mkdirSync(outputDirectory, { recursive: true });

const output = await build({
  configFile: false,
  root: viewDirectory,
  logLevel: 'warn',
  plugins: [react(), tailwindcss()],
  // __STUDIO_BUILD__: when it was built, on analytics events (which version people are on)
  define: { 'process.env.NODE_ENV': JSON.stringify('production'), __STUDIO_BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16)) },
  resolve: {
    // One copy of each, shared with the visualiser (a workspace package, with its own node_modules): two React Flows
    // don't share a canvas, and pnpm installs another copy for each set of peer versions (e.g. React's types)
    dedupe: ['react', 'react-dom', '@xyflow/react', '@radix-ui/react-dropdown-menu', 'yjs'],
    alias: {
      // The visualiser's optional Mermaid view: hosts already get Mermaid as text, and it would double the size
      mermaid: path.join(viewDirectory, 'ported/mermaid-stub.ts'),
    },
  },
  build: {
    write: false,
    // VIEW_MINIFY=0 keeps component names (for profiling renders: scripts/perf)
    minify: process.env.VIEW_MINIFY !== '0',
    lib: {
      entry: path.join(viewDirectory, 'main.tsx'),
      formats: ['iife'],
      name: 'EventCatalogView',
      fileName: () => 'view.js',
    },
  },
});
const chunks = (Array.isArray(output) ? output : [output]).flatMap((result) => result.output);
const script = chunks.find((chunk) => chunk.type === 'chunk');
const html = toHtml('EventCatalog Studio', script.code);
fs.writeFileSync(path.join(outputDirectory, 'view.html'), html);
// The social preview image (view/og/og.html, rendered), served at /og.png
fs.copyFileSync(path.join(viewDirectory, 'og/og.png'), path.join(outputDirectory, 'og.png'));
// Readable by whoever runs the server (a screenshot can be saved owner-only, and the container runs as another user)
fs.chmodSync(path.join(outputDirectory, 'og.png'), 0o644);
console.log(`Built view (${Math.round(html.length / 1024)} KB)`);
