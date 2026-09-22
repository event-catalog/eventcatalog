import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { searchForWorkspaceRoot } from 'vite';

export const packageDirectory = fileURLToPath(new URL('../', import.meta.url));

export function getDevServerFileSystem({ projectDirectory, coreDirectory = packageDirectory }) {
  // A linked Core can belong to a different workspace than the catalog. pnpm
  // resolves its dependencies into that workspace's node_modules, outside Core
  // itself. Preserve Vite's workspace boundary for both roots, including their
  // real paths, instead of assuming dependencies are relative to process.cwd().
  const allow = [projectDirectory, coreDirectory].flatMap((directory) => {
    const absolute = path.resolve(directory);
    const real = fs.realpathSync(absolute);
    return [absolute, real, searchForWorkspaceRoot(real)];
  });
  return { strict: true, allow: [...new Set(allow)] };
}

// Match Astro's file-based routing conventions, including endpoint suffixes
// (e.g. llms.txt.ts) and underscore-prefixed helpers beside page entrypoints.
export function getPackageRoutes(pagesDirectory = path.join(packageDirectory, 'src/pages')) {
  const routes = [];
  const visit = (directory, segments = []) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith('_') || (entry.name.startsWith('.') && !(entry.isDirectory() && entry.name === '.well-known')))
        continue;
      const entrypoint = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(entrypoint, [...segments, entry.name]);
        continue;
      }
      if (!entry.isFile() || !/\.(astro|md|mdx|js|ts)$/.test(entry.name)) continue;
      if (/\.(test|spec|d)\.ts$/.test(entry.name)) continue;
      const name = entry.name.replace(/\.(astro|md|mdx|js|ts)$/, '');
      const parts = name === 'index' ? segments : [...segments, name];
      routes.push({ pattern: `/${parts.join('/')}`, entrypoint });
    }
  };
  visit(pagesDirectory);
  return routes;
}

export function getRuntimeAliases({ projectDirectory, runtimeDirectory, coreDirectory = packageDirectory }) {
  // Keep package aliases aligned with ../tsconfig.json, ../../vitest.config.js
  // and ../../../../examples/default/tsconfig.json. src/catalog-runtime.ts derives
  // type-check paths from that tsconfig and overrides catalog-owned entries.
  const source = (relative) => path.join(coreDirectory, 'src', relative);
  return [
    { find: /^@config$/, replacement: path.join(projectDirectory, 'eventcatalog.config.js') },
    { find: /^@eventcatalog$/, replacement: source('utils/eventcatalog-config/catalog.ts') },
    { find: '@icons', replacement: source('icons') },
    { find: '@components', replacement: source('components') },
    { find: '@catalog/layouts', replacement: source('toolkit/layouts') },
    { find: /^@catalog\/utils$/, replacement: source('toolkit/utils/index.ts') },
    { find: '@catalog/utils', replacement: source('toolkit/utils') },
    { find: '@catalog/snippets', replacement: path.join(projectDirectory, 'snippets') },
    { find: /^@types$/, replacement: source('types/index.ts') },
    { find: '@utils', replacement: source('utils') },
    { find: '@layouts', replacement: source('layouts') },
    { find: '@enterprise', replacement: source('enterprise') },
    { find: /^auth:config$/, replacement: path.join(coreDirectory, 'auth.config.ts') },
    { find: '@stores', replacement: source('stores') },
  ];
}

export function packageDependenciesPlugin(coreDirectory = packageDirectory) {
  const packageFile = path.join(coreDirectory, '../package.json');
  const { dependencies = {} } = JSON.parse(fs.readFileSync(packageFile, 'utf-8'));
  return {
    name: 'eventcatalog:package-dependencies',
    enforce: 'post',
    async resolveId(source, importer, options) {
      const dependency = source.startsWith('@') ? source.split('/').slice(0, 2).join('/') : source.split('/')[0];
      if (!(dependency in dependencies)) return;
      // pnpm does not hoist Core's dependencies into the catalog's node_modules.
      // Resolve through Vite to preserve package exports and browser conditions.
      return this.resolve(source, packageFile, { ...options, skipSelf: true });
    },
  };
}

export function userConfigPlugin(projectDirectory, coreDirectory = packageDirectory) {
  const sourceModule = path.join(coreDirectory, 'src/utils/eventcatalog-config/source.ts');
  return {
    name: 'eventcatalog:user-config',
    enforce: 'pre',
    load(id) {
      if (path.normalize(id.split('?')[0]) !== path.normalize(sourceModule)) return;
      // Bundle the user's configuration into the application. The config-time
      // loader uses a dynamic import, which must not survive into deployed SSR.
      return `export { default } from ${JSON.stringify(path.join(projectDirectory, 'eventcatalog.config.js'))};`;
    },
  };
}

export function catalogStylesPlugin(projectDirectory, runtimeDirectory, coreDirectory = packageDirectory) {
  const stylesheet = path.join(coreDirectory, 'src/styles/tailwind.css');
  return {
    name: 'eventcatalog:catalog-styles',
    enforce: 'pre',
    load(id) {
      if (path.normalize(id.split('?')[0]) !== path.normalize(stylesheet)) return;
      // Tailwind skips ignored folders and node_modules by default. Explicitly
      // include user components and Markdown/MDX classes at their source.
      const sources = [projectDirectory];
      return `${fs.readFileSync(stylesheet, 'utf-8')}\n${sources
        .map((source) => `@source ${JSON.stringify(source.replace(/\\/g, '/'))};`)
        .join('\n')}\n`;
    },
  };
}

const isWithin = (file, directory) => file === directory || file.startsWith(`${directory}${path.sep}`);
const toModuleId = (file) => file.replace(/\\/g, '/');

export function customSourcesPlugin(projectDirectory) {
  const localDirectory = path.join(projectDirectory, 'components');
  const federatedDirectory = path.join(projectDirectory, 'federated/components');
  const stylePath = path.join(projectDirectory, 'eventcatalog.styles.css');
  const emptyStyles = '\0eventcatalog:empty-styles.css';
  const homepageModule = '\0virtual:eventcatalog/homepage';
  const homepage = path.join(projectDirectory, 'pages/homepage.astro');
  const resolveFile = (file) => {
    const candidates = [
      file,
      ...['.astro', '.tsx', '.ts', '.jsx', '.js', '.mjs', '.mdx', '.md'].map((extension) => file + extension),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      return resolveFile(path.join(file, 'index'));
    }
  };
  return {
    name: 'eventcatalog:custom-sources',
    enforce: 'pre',
    configureServer(server) {
      const componentDirectories = [localDirectory, federatedDirectory];
      const knownFiles = new Set();
      const scan = (directory) => {
        if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) return;
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
          const file = path.join(directory, entry.name);
          if (entry.isDirectory()) scan(file);
          else knownFiles.add(file);
        }
      };
      for (const directory of componentDirectories) scan(directory);

      let restartTimer;
      const scheduleRestart = () => {
        clearTimeout(restartTimer);
        // A newly added local override changes the resolution of an existing
        // federated import. Restart Vite after coalescing filesystem events so
        // its module graph is rebuilt against the current overlay.
        restartTimer = setTimeout(() => {
          server.restart().catch((error) => server.config.logger.error(`[EventCatalog] ${error.message}`));
        }, 50);
      };
      const onAdd = (file) => {
        file = path.resolve(file);
        if (!componentDirectories.some((directory) => isWithin(file, directory)) || knownFiles.has(file)) return;
        knownFiles.add(file);
        scheduleRestart();
      };
      const onUnlink = (file) => {
        if (!knownFiles.delete(path.resolve(file))) return;
        scheduleRestart();
      };
      const cleanup = () => {
        clearTimeout(restartTimer);
        server.watcher.off('add', onAdd);
        server.watcher.off('unlink', onUnlink);
        server.watcher.off('close', cleanup);
        server.httpServer?.off('close', cleanup);
      };
      server.watcher.on('add', onAdd);
      server.watcher.on('unlink', onUnlink);
      server.watcher.once('close', cleanup);
      server.httpServer?.once('close', cleanup);
      server.watcher.add(componentDirectories);
    },
    resolveId(id, importer) {
      if (id === 'virtual:eventcatalog/homepage') return homepageModule;
      if (id === '@catalog/styles') return fs.existsSync(stylePath) ? toModuleId(stylePath) : emptyStyles;
      // Astro can turn an import from an original user component into a
      // root-relative URL (e.g. /components/Card.astro?astro&type=style). Vite's
      // root is Core, so retry those URL paths against the catalog. This is not
      // a filesystem-drive-path rewrite; URL paths use '/' on Windows too.
      if (id.startsWith('/') && !id.startsWith('/@') && !fs.existsSync(id.split('?')[0])) {
        const [source, query] = id.split('?');
        const projectFile = path.resolve(projectDirectory, `.${source}`);
        if (fs.existsSync(projectFile) && fs.statSync(projectFile).isFile()) {
          // Astro normalizes compiler filenames to forward slashes. Keep Vite's
          // module IDs identical so its client-script manifest uses the same keys.
          return toModuleId(projectFile) + (query === undefined ? '' : `?${query}`);
        }
      }
      const [source, query] = id.split('?');
      let relative;
      if (source.startsWith('@catalog/components/')) {
        relative = source.slice('@catalog/components/'.length);
      } else if (source.startsWith('.') && importer) {
        const parent = path.normalize(importer.split('?')[0]);
        const directory = [localDirectory, federatedDirectory].find((directory) => isWithin(parent, directory));
        if (directory) relative = path.relative(directory, path.resolve(path.dirname(parent), source));
      }
      if (relative === undefined) return;
      const local = path.resolve(localDirectory, relative);
      const federated = path.resolve(federatedDirectory, relative);
      if (!isWithin(local, localDirectory) || !isWithin(federated, federatedDirectory)) return;
      const resolved = resolveFile(local) || resolveFile(federated);
      return resolved ? toModuleId(resolved) + (query === undefined ? '' : `?${query}`) : undefined;
    },
    load(id) {
      if (id === emptyStyles) return '';
      if (id === homepageModule) {
        return fs.existsSync(homepage)
          ? `export { default } from ${JSON.stringify(toModuleId(homepage))};`
          : 'export default null;';
      }
    },
  };
}

export default function eventCatalogRuntime({ projectDirectory, runtimeDirectory }) {
  return {
    name: 'eventcatalog:runtime',
    hooks: {
      'astro:config:setup': ({ injectRoute, updateConfig, addWatchFile }) => {
        for (const route of getPackageRoutes()) injectRoute(route);
        addWatchFile(path.join(projectDirectory, 'eventcatalog.config.js'));
        addWatchFile(path.join(projectDirectory, 'eventcatalog.styles.css'));
        // The virtual homepage imports the user's Astro file, so Vite handles
        // edits through HMR. Registering it as config restarts Astro on every
        // save and can disconnect in-flight module loads. Adding/removing it
        // is already covered by the custom-pages manifest watcher.
        updateConfig({
          vite: {
            resolve: { alias: getRuntimeAliases({ projectDirectory, runtimeDirectory }) },
            plugins: [
              userConfigPlugin(projectDirectory),
              catalogStylesPlugin(projectDirectory, runtimeDirectory),
              customSourcesPlugin(projectDirectory),
              packageDependenciesPlugin(),
            ],
          },
        });
      },
    },
  };
}
