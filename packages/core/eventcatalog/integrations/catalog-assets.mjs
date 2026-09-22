import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultCoreDirectory = fileURLToPath(new URL('../', import.meta.url));
// This is the legacy public-asset URL contract, not the content collection list.
// entities, containers, data-products, teams and users were never mirrored here.
// Adding them would publish new files/URLs and needs a separate compatibility
// review; do not substitute the full content-collection registry.
const collectionDirectories = new Set([
  'agents',
  'events',
  'commands',
  'services',
  'domains',
  'flows',
  'pages',
  'changelogs',
  'queries',
  'channels',
  'ubiquitousLanguages',
  'dependencies',
]);
const sourceExtensions = /\.(?:md|mdx|astro|[cm]?js|[cm]?ts|jsx|tsx|c4|likec4)$/i;
const contentTypes = {
  '.json': 'application/json',
  '.yaml': 'application/yaml',
  '.yml': 'application/yaml',
  '.xml': 'application/xml',
  '.xsl': 'application/xml',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.html': 'text/html',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.pdf': 'application/pdf',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function listFiles(directory, excludedDirectories = new Set()) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  const visit = (current, segments = []) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith('.')) continue;
      const relative = [...segments, entry.name];
      if (entry.isDirectory() && !excludedDirectories.has(entry.name)) visit(path.join(current, entry.name), relative);
      // Never follow symlinks out of the selected source directories.
      if (entry.isFile()) files.push(relative.join('/'));
    }
  };
  visit(directory);
  return files;
}

// Keep the existing generated URL convention: nested resources are rooted at
// their nearest collection directory (domains/.../events/Foo -> events/Foo).
export function getResourceAssetPath(relativePath) {
  const parts = relativePath.split(/[\\/]/);
  if (!collectionDirectories.has(parts[0]) || parts.some((part) => part.startsWith('.'))) return;
  if (sourceExtensions.test(relativePath) || ['package.json', 'Dockerfile'].includes(parts.at(-1))) return;
  if (parts[0] === 'pages') return `/generated/${parts.join('/')}`;
  let collectionIndex = 0;
  for (let index = 1; index < parts.length - 1; index++) {
    if (collectionDirectories.has(parts[index])) collectionIndex = index;
  }
  return `/generated/${parts.slice(collectionIndex).join('/')}`;
}

export function createAssetManifest({ projectDirectory, coreDirectory = defaultCoreDirectory, generatedDirectory }) {
  const assets = new Map();
  const publicDirectory = path.join(coreDirectory, 'public');
  for (const file of listFiles(publicDirectory, new Set(['generated', 'pagefind']))) {
    assets.set(`/${file}`, path.join(publicDirectory, file));
  }
  for (const collection of collectionDirectories) {
    const directory = path.join(projectDirectory, collection);
    for (const file of listFiles(directory, new Set(['node_modules', 'dist']))) {
      const resourcePath = `${collection}/${file}`;
      const url = getResourceAssetPath(resourcePath);
      if (url) assets.set(url, path.join(projectDirectory, resourcePath));
    }
  }
  if (generatedDirectory) {
    for (const file of listFiles(generatedDirectory)) assets.set(`/${file}`, path.join(generatedDirectory, file));
  }
  return assets;
}

function decodeAssetUrl(requestUrl, base) {
  let pathname;
  try {
    pathname = decodeURIComponent((requestUrl || '').split('?')[0]);
  } catch {
    return;
  }
  if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some((part) => part === '..' || part === '.'))
    return;
  const prefix = `/${base.split('/').filter(Boolean).join('/')}`;
  if (prefix !== '/') {
    if (!pathname.startsWith(`${prefix}/`)) return;
    pathname = pathname.slice(prefix.length);
  }
  return pathname;
}

export function createAssetMiddleware({ getAssets, projectDirectory, base = '/' }) {
  return (request, response, next) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') return next();
    // Astro strips the configured base before integration middleware runs.
    // Connect preserves the incoming URL so matching also works under /docs/.
    const pathname = decodeAssetUrl(request.originalUrl || request.url, base);
    if (!pathname) return next();
    // Astro owns the user's public directory, including deliberate overrides.
    const publicFile = path.join(projectDirectory, 'public', pathname.slice(1));
    if (fs.existsSync(publicFile) && fs.statSync(publicFile).isFile()) return next();
    const file = getAssets().get(pathname);
    if (!file) return next();
    let stats;
    try {
      stats = fs.statSync(file);
      if (!stats.isFile()) return next();
    } catch (error) {
      if (error.code === 'ENOENT') return next();
      return next(error);
    }
    response.statusCode = 200;
    response.setHeader('Content-Type', contentTypes[path.extname(file).toLowerCase()] || 'application/octet-stream');
    response.setHeader('Content-Length', stats.size);
    response.setHeader('Cache-Control', 'no-cache');
    if (request.method === 'HEAD') return response.end();
    const stream = fs.createReadStream(file);
    stream.on('error', (error) => response.destroy(error));
    stream.pipe(response);
  };
}

export function emitCatalogAssets(assets, outputDirectory, projectDirectory) {
  for (const [url, source] of assets) {
    const relative = url.slice(1);
    if (fs.existsSync(path.join(projectDirectory, 'public', relative))) continue;
    const target = path.join(outputDirectory, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
}

export default function catalogAssets(options) {
  let base = '/';
  return {
    name: 'eventcatalog:assets',
    hooks: {
      'astro:config:done': ({ config }) => {
        base = config.base;
      },
      'astro:server:setup': ({ server }) => {
        let assets = createAssetManifest(options);
        let dirty = false;
        const roots = [...collectionDirectories].map((collection) => path.join(options.projectDirectory, collection));
        if (options.generatedDirectory) roots.push(options.generatedDirectory);
        server.watcher.add(roots);
        const refresh = (file) => {
          if (!roots.some((root) => file === root || file.startsWith(`${root}${path.sep}`))) return;
          dirty = true;
        };
        server.watcher.on('add', refresh);
        server.watcher.on('unlink', refresh);
        server.watcher.on('unlinkDir', refresh);
        server.httpServer?.once('close', () => {
          server.watcher.off('add', refresh);
          server.watcher.off('unlink', refresh);
          server.watcher.off('unlinkDir', refresh);
        });
        server.middlewares.use(
          createAssetMiddleware({
            getAssets: () => {
              if (dirty) {
                assets = createAssetManifest(options);
                dirty = false;
              }
              return assets;
            },
            projectDirectory: options.projectDirectory,
            base,
          })
        );
      },
      'astro:build:done': ({ dir }) => {
        emitCatalogAssets(createAssetManifest(options), fileURLToPath(dir), options.projectDirectory);
      },
    },
  };
}
