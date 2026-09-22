import fs from 'node:fs';
import path from 'node:path';
import { getRuntimeAliases, packageDirectory } from './eventcatalog-runtime.mjs';

// In an installed catalog Core's browser components live in node_modules, and
// Vite never discovers dependencies imported from there. Anything it serves
// unoptimized reaches the browser raw, so a CommonJS package anywhere in the
// tree (e.g. react-markdown > hast-util-to-jsx-runtime > style-to-js) breaks
// hydration. Astro's own crawl (vitefu) only covers Core's direct CommonJS
// dependencies. Collect every dependency Core's browser code imports instead,
// so Vite pre-bundles each one together with its nested dependencies.
//
// Entrypoints are React components and processed <script> blocks in .astro
// files. Local and aliased JavaScript/TypeScript imports are followed. Like the
// server dependency scan this matches literal imports rather than parsing, so
// commented-out imports can over-include; computed specifiers are not found.

// Always needed by React islands, even before a component imports them directly.
const baseDependencies = ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'];

const scriptExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];
const typeOnlyImport = /\b(?:import|export)\s+type\s+[^'";]*?\bfrom\s*['"][^'"]+['"]/g;
const importSpecifier = /\b(?:from\s*|import\s*(?:\(\s*)?)['"]([^'"]+)['"]/g;
const astroScript = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;

const packageName = (specifier) =>
  specifier
    .split('/')
    .slice(0, specifier.startsWith('@') ? 2 : 1)
    .join('/');

const isTestFile = (file) => /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file) || file.split(path.sep).includes('__tests__');

function resolveFile(file) {
  const candidates = [
    file,
    ...scriptExtensions.map((extension) => file + extension),
    ...scriptExtensions.map((extension) => path.join(file, `index${extension}`)),
  ];
  return candidates.find(
    (candidate) =>
      scriptExtensions.includes(path.extname(candidate)) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()
  );
}

function findPackageJson(name, fromDirectory) {
  for (let directory = fromDirectory; ; directory = path.dirname(directory)) {
    const file = path.join(directory, 'node_modules', name, 'package.json');
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8'));
    if (path.dirname(directory) === directory) return;
  }
}

// Astro excludes its framework packages (those built on astro) from
// pre-bundling because they ship raw .astro files. Match its detection.
function isAstroPackage(name, coreDirectory) {
  const pkg = findPackageJson(name, coreDirectory);
  return name === 'astro' || Boolean(pkg?.dependencies?.astro || pkg?.peerDependencies?.astro);
}

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') return [];
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(file) : [file];
  });
}

export function collectClientDependencies(coreDirectory = packageDirectory) {
  const { dependencies = {} } = JSON.parse(fs.readFileSync(path.join(coreDirectory, '../package.json'), 'utf-8'));
  // Only Core's own source aliases matter here; catalog-owned aliases point at
  // the user's project, which Vite already scans normally.
  const aliases = getRuntimeAliases({ projectDirectory: coreDirectory, runtimeDirectory: coreDirectory, coreDirectory }).filter(
    ({ replacement }) => replacement.startsWith(path.join(coreDirectory, 'src'))
  );
  const resolveAlias = (specifier) => {
    for (const { find, replacement } of aliases) {
      if (find instanceof RegExp) {
        if (find.test(specifier)) return specifier.replace(find, replacement);
      } else if (specifier === find || specifier.startsWith(`${find}/`)) {
        return replacement + specifier.slice(find.length);
      }
    }
  };

  const found = new Set(baseDependencies);
  const visited = new Set();
  const queue = [];

  const scan = (code, importer) => {
    for (const [, specifier] of code.replace(typeOnlyImport, '').matchAll(importSpecifier)) {
      // Vite owns query imports (for example ?raw assets) and stylesheets.
      if (/[?#]/.test(specifier) || /\.(?:css|scss|sass|less)$/.test(specifier)) continue;
      const local = specifier.startsWith('.') ? path.resolve(path.dirname(importer), specifier) : resolveAlias(specifier);
      if (local !== undefined) {
        const file = resolveFile(local);
        if (file && !visited.has(file)) queue.push(file);
      } else if (Object.hasOwn(dependencies, packageName(specifier))) {
        found.add(specifier);
      }
    }
  };

  for (const file of listFiles(path.join(coreDirectory, 'src'))) {
    if (isTestFile(file)) continue;
    if (/\.[jt]sx$/.test(file)) {
      queue.push(file);
    } else if (file.endsWith('.astro')) {
      for (const [, attributes, code] of fs.readFileSync(file, 'utf-8').matchAll(astroScript)) {
        // Inline, external and data scripts are not processed by Vite.
        if (/\bis:inline\b|\bsrc\s*=|\btype\s*=\s*['"]?(?!module)/.test(attributes)) continue;
        scan(code, file);
      }
    }
  }

  while (queue.length > 0) {
    const file = queue.pop();
    if (visited.has(file) || isTestFile(file)) continue;
    visited.add(file);
    scan(fs.readFileSync(file, 'utf-8'), file);
  }

  const astroPackages = new Set([...found].map(packageName).filter((name) => isAstroPackage(name, coreDirectory)));
  return [...found].filter((specifier) => !astroPackages.has(packageName(specifier))).sort();
}
