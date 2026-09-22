import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRuntimeDependencyManifest } from '../eventcatalog/integrations/runtime-dependency-manifest.mjs';

const packageDirectory = fileURLToPath(new URL('../', import.meta.url));
const packageJson = JSON.parse(fs.readFileSync(path.join(packageDirectory, 'package.json'), 'utf8'));
const dependencies = new Set(Object.keys(packageJson.dependencies));
const specifiers = new Set([
  ...dependencies,
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'react-dom/client',
  'react-dom/server',
  'astro/assets/services/sharp',
  'zod/v4',
  'react-syntax-highlighter/dist/cjs/styles/prism/index.js',
  'rehype-expressive-code/hast',
]);
const packageName = (specifier) =>
  specifier
    .split('/')
    .slice(0, specifier.startsWith('@') ? 2 : 1)
    .join('/');

// This scan only discovers literal imports; it is not a JavaScript parser.
// Computed specifiers and subpaths emitted by integrations must be listed above.
// Comments can over-include unused facades, while missed specifiers can resolve
// locally but fail in a deployed SSR app with isolated dependencies. Verification
// must include an installed-package SSR build and a relocated entry import.
function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || ['node_modules', 'dist', 'public', '__tests__'].includes(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      visit(file);
    } else if (/\.(?:[cm]?[jt]sx?|astro)$/.test(entry.name)) {
      const source = fs.readFileSync(file, 'utf8');
      for (const match of source.matchAll(/\b(?:from\s*|import\s*(?:\(\s*)?|require\s*\(\s*)['"]([^'"]+)['"]/g)) {
        // Vite owns query imports (for example ?url assets); they are not
        // external Node imports and cannot be re-exported by a server facade.
        if (!/[?#]/.test(match[1]) && dependencies.has(packageName(match[1]))) specifiers.add(match[1]);
      }
    }
  }
}
visit(path.join(packageDirectory, 'eventcatalog'));

// Server output imports these small, published facades through Core's public
// package. Node then resolves each dependency relative to Core, including pnpm's
// isolated dependencies, without embedding machine-specific installation paths.
const outputDirectory = path.join(packageDirectory, 'dist/runtime-dependencies');
// Validate the entire mapping before writing any files (including case-insensitive
// collisions on Windows/macOS). The manifest is also used by the Vite integration.
const manifest = createRuntimeDependencyManifest(specifiers);
fs.mkdirSync(outputDirectory, { recursive: true });
for (const [specifier, file] of Object.entries(manifest)) {
  const quoted = JSON.stringify(specifier);
  fs.writeFileSync(
    path.join(outputDirectory, file),
    `export * from ${quoted};\nimport * as dependency from ${quoted};\nexport default dependency.default;\n`
  );
}
fs.writeFileSync(path.join(outputDirectory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Built ${specifiers.size} server dependency facades`);
