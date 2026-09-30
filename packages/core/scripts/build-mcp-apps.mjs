#!/usr/bin/env node
/**
 * Builds the MCP App views (interactive UIs shown by MCP hosts that support MCP Apps)
 * into single, self-contained HTML files. The MCP server serves them as ui:// resources,
 * so everything (JavaScript and CSS) is inlined: hosts render them in a sandboxed iframe.
 */
import { build } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';

const appsDirectory = path.join(import.meta.dirname, '../eventcatalog/src/features/mcp/apps');
// Not "dist": eventcatalog/.gitignore ignores every dist/ folder, which would keep the views out of the npm package
const outputDirectory = path.join(appsDirectory, 'generated');

const apps = [
  // One view for the architecture diagram and the schema, so hosts keep one panel open and update it.
  // The schema viewers are styled with Tailwind classes, so the view builds its own Tailwind stylesheet
  { name: 'viewer', entry: 'viewer/view.tsx', title: 'EventCatalog', plugins: [tailwindcss()] },
];

const toHtml = (title, script) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin: 0">
    <div id="root"></div>
    <script>${script.replace(/<\/script/gi, '<\\/script')}</script>
  </body>
</html>
`;

// Start clean, so views that were renamed or removed aren't left behind
fs.rmSync(outputDirectory, { recursive: true, force: true });
fs.mkdirSync(outputDirectory, { recursive: true });

for (const app of apps) {
  const output = await build({
    configFile: false,
    root: appsDirectory,
    logLevel: 'warn',
    plugins: app.plugins ?? [],
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    resolve: {
      alias: {
        '@utils': path.join(appsDirectory, '../../../utils'),
        mermaid: path.join(appsDirectory, 'mermaid-stub.ts'),
      },
    },
    build: {
      write: false,
      minify: true,
      lib: {
        entry: path.join(appsDirectory, app.entry),
        formats: ['iife'],
        name: 'EventCatalogMcpApp',
        fileName: () => `${app.name}.js`,
      },
    },
  });

  const chunks = (Array.isArray(output) ? output : [output]).flatMap((result) => result.output);
  const script = chunks.find((chunk) => chunk.type === 'chunk');
  const html = toHtml(app.title, script.code);
  fs.writeFileSync(path.join(outputDirectory, `${app.name}.html`), html);
  console.log(`Built MCP App ${app.name} (${Math.round(html.length / 1024)} KB)`);
}
