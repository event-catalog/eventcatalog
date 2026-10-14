#!/usr/bin/env node
/**
 * Builds the server into one ES module (build/server.js), so production runs it with node directly: no TypeScript
 * compiled at startup (tsx), so it starts in well under a second and uses less memory. Packages stay in node_modules.
 */
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..');

await build({
  entryPoints: [path.join(root, 'src/server.ts')],
  outfile: path.join(root, 'build/server.js'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  // Its dependencies stay in node_modules; the visualiser's model (a workspace package it builds with, not one
  // installed in production) goes in the bundle
  external: Object.keys(JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).dependencies).flatMap((name) => [name, `${name}/*`]),
  sourcemap: true,
  logLevel: 'warning',
});
console.log('Built server (build/server.js)');
