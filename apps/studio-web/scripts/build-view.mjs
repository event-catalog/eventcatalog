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
import { createRequire } from 'node:module';

const root = path.join(import.meta.dirname, '..');
const viewDirectory = path.join(root, 'view');
const outputDirectory = path.join(root, 'dist');

// The favicon: EventCatalog's logo, dark on light tabs and light on dark ones
const logo = fs.readFileSync(path.join(viewDirectory, 'styles/eventcatalog-logo.svg'), 'utf8');
const favicon = logo
  .replace(' aria-hidden="true"', '')
  .replace('fill="currentColor">', 'fill="#0f172a"><style>@media (prefers-color-scheme: dark) { svg { fill: #f8fafc } }</style>');
const faviconHref = `data:image/svg+xml,${encodeURIComponent(favicon)}`;

// The script, also served on its own (beside its source map) for error tracking: frames in the page are mapped to it
// (view/analytics.ts). A new name each build, so an error is only ever read against the build it came from
const scriptName = `view-${Date.now().toString(36)}.js`;
// Its first line notes where it starts in whatever page it's in (ours, or a chat's frame): its frames have that page's lines
const START_MARKER = 'globalThis.__studioViewStart = new Error();';

// ---- </script in the code can't end the page's script tag: it's escaped (<\/script), and the source map's columns
// after each escape are moved along by the character added, so frames there still point at the right place ----

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
/** A source map segment's first value (its column: how far along from the line's previous segment) and the rest */
const readColumn = (segment) => {
  let value = 0;
  let shift = 0;
  let index = 0;
  for (let digit = 32; digit & 32; index++, shift += 5) {
    digit = BASE64.indexOf(segment[index]);
    value += (digit & 31) << shift;
  }
  return { column: value & 1 ? -(value >>> 1) : value >>> 1, rest: segment.slice(index) };
};
const writeColumn = (column) => {
  let value = column < 0 ? (-column << 1) | 1 : column << 1;
  let encoded = '';
  do {
    let digit = value & 31;
    value >>>= 5;
    if (value) digit |= 32;
    encoded += BASE64[digit];
  } while (value);
  return encoded;
};
const ESCAPED = /<\/script/gi;
/** The code with </script escaped, and its mappings (one line's per `;`) with the columns after each escape moved */
const escapeScriptTags = (code, mappings) => {
  const lines = code.split('\n');
  const lineMappings = mappings.split(';');
  lines.forEach((line, number) => {
    // Where each escape's character goes (after the <), in the line as it was
    const added = [...line.matchAll(ESCAPED)].map((match) => match.index);
    if (!added.length || !lineMappings[number]) return;
    let column = 0;
    let moved = 0;
    lineMappings[number] = lineMappings[number]
      .split(',')
      .map((segment) => {
        const read = readColumn(segment);
        column += read.column;
        const before = moved;
        moved = added.filter((index) => index < column).length;
        return writeColumn(read.column + moved - before) + read.rest;
      })
      .join(',');
  });
  return { code: code.replace(ESCAPED, '<\\/script'), mappings: lineMappings.join(';') };
};

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
    <script>${script}</script>
  </body>
</html>
`;

// ---- Icons: only the ones the view shows. The visualiser looks icons up by name (getIcon, and custom nodes'), which
// keeps every one of them (~300, 480 KB of the page): the names it looks up here are its defaults (the catalog's
// icon names never reach the view), so the icon sets are swapped for ones with just these. An import of one not
// listed fails the build (rather than an icon going missing)
const ICONS = {
  '@heroicons/react/24/outline': [
    // Named: the view's resource types, the visualiser's menus
    'ArrowsRightLeftIcon', 'BoltIcon', 'ChatBubbleLeftIcon', 'ComputerDesktopIcon', 'CubeIcon', 'CpuChipIcon', 'GlobeAltIcon',
    'UserIcon', 'MagnifyingGlassIcon', 'RectangleGroupIcon', 'ServerIcon', 'UserGroupIcon', 'DocumentArrowDownIcon',
    'PresentationChartLineIcon',
    // Looked up by name: domains', entities' and flows' defaults
    'QueueListIcon',
  ],
  // Custom nodes' icons, by name (their default: custom nodes come from catalogs, not the view)
  '@heroicons/react/24/solid': ['CubeIcon'],
};
const heroicons = path.dirname(createRequire(import.meta.resolve('@eventcatalog/visualiser')).resolve('@heroicons/react/package.json'));
const onlyUsedIcons = {
  name: 'only-used-icons',
  enforce: 'pre',
  resolveId: (id) => (ICONS[id] ? `\0icons:${id}` : undefined),
  load: (id) => {
    if (!id.startsWith('\0icons:')) return undefined;
    const set = id.slice('\0icons:'.length);
    const folder = path.join(heroicons, set.replace('@heroicons/react/', ''), 'esm');
    return ICONS[set].map((name) => `export { default as ${name} } from ${JSON.stringify(path.join(folder, `${name}.js`))};`).join('\n');
  },
};

fs.mkdirSync(outputDirectory, { recursive: true });
// Earlier builds' scripts
for (const file of fs.readdirSync(outputDirectory)) if (/^view-[a-z0-9]+\.js(\.map)?$/.test(file)) fs.rmSync(path.join(outputDirectory, file));

const output = await build({
  configFile: false,
  root: viewDirectory,
  logLevel: 'warn',
  plugins: [onlyUsedIcons, react(), tailwindcss()],
  // __STUDIO_BUILD__: when it was built, on analytics events (which version people are on)
  // __STUDIO_SCRIPT__: the script's name, for errors' frames
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    __STUDIO_BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16)),
    __STUDIO_SCRIPT__: JSON.stringify(scriptName),
  },
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
    // Kept beside the script (not linked from the page): error tracking reads it
    sourcemap: 'hidden',
    rollupOptions: {
      // Tailwind's styles (inlined as text) have no map of their own: nothing an error's frames point into
      onwarn: (warning, warn) => warning.code !== 'SOURCEMAP_BROKEN' && warn(warning),
    },
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
const escaped = escapeScriptTags(script.code, script.map.mappings);
const code = `${START_MARKER}\n${escaped.code}`;
const html = toHtml('EventCatalog Studio', code);
fs.writeFileSync(path.join(outputDirectory, 'view.html'), html);
// The script on its own, and its source map moved down a line (for the marker): served at /<scriptName>
fs.writeFileSync(path.join(outputDirectory, scriptName), `${code}\n//# sourceMappingURL=${scriptName}.map\n`);
// (its sources named from the repo's root, e.g. apps/studio-web/view/Diagram.tsx: they're relative to view/dist)
const sources = script.map.sources.map((source) => path.relative(path.join(root, '../..'), path.resolve(viewDirectory, 'dist', source)));
fs.writeFileSync(path.join(outputDirectory, `${scriptName}.map`), JSON.stringify({ ...script.map, file: scriptName, sources, mappings: `;${escaped.mappings}` }));
// The social preview image (view/og/og.html, rendered), served at /og.png
fs.copyFileSync(path.join(viewDirectory, 'og/og.png'), path.join(outputDirectory, 'og.png'));
// The server's icon, served at /icon.svg: MCP clients show it beside the server (serverInfo.icons)
fs.writeFileSync(path.join(outputDirectory, 'icon.svg'), favicon);
// Readable by whoever runs the server (a screenshot can be saved owner-only, and the container runs as another user)
fs.chmodSync(path.join(outputDirectory, 'og.png'), 0o644);
fs.chmodSync(path.join(outputDirectory, 'icon.svg'), 0o644);
fs.chmodSync(path.join(outputDirectory, scriptName), 0o644);
fs.chmodSync(path.join(outputDirectory, `${scriptName}.map`), 0o644);
console.log(`Built view (${Math.round(html.length / 1024)} KB)`);
