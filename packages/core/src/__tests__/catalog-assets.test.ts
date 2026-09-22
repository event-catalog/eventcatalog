import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { PassThrough } from 'node:stream';
import { EventEmitter } from 'node:events';
import { pathToFileURL } from 'node:url';
import catalogAssets, {
  createAssetManifest,
  createAssetMiddleware,
  getResourceAssetPath,
} from '../../eventcatalog/integrations/catalog-assets.mjs';
import { mapCatalogToAstro } from './fixtures/legacy-map-catalog-to-astro';

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

const fixture = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eventcatalog-assets-'));
  directories.push(root);
  const projectDirectory = path.join(root, 'catalog');
  const coreDirectory = path.join(root, 'core');
  const write = (relative: string, contents = relative) => {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents);
    return file;
  };
  return { root, projectDirectory, coreDirectory, write };
};

const request = (middleware: any, url: string, method = 'GET', originalUrl?: string) => {
  const response = new PassThrough() as PassThrough & { setHeader: ReturnType<typeof vi.fn>; statusCode?: number };
  response.setHeader = vi.fn();
  const chunks: Buffer[] = [];
  response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
  return new Promise<{ body: string; response: typeof response; next: boolean }>((resolve, reject) => {
    response.on('error', reject);
    response.on('end', () => resolve({ body: Buffer.concat(chunks).toString(), response, next: false }));
    middleware({ url, method, originalUrl }, response, (error?: Error) => {
      if (error) reject(error);
      else resolve({ body: '', response, next: true });
    });
  });
};

describe('catalog assets without a copied application', () => {
  it('retains existing generated URLs for nested schemas, resource images, and custom page assets', () => {
    for (const relative of [
      'domains/Orders/services/OrderService/events/Placed/schema.json',
      'domains/Orders/services/OrderService/openapi.yml',
      'events/Placed/versioned/1.0.0/schema.avsc',
      'domains/Orders/images/overview.png',
      'pages/examples/image.svg',
      'dependencies/services/External/schema.proto',
    ]) {
      const [mapped] = mapCatalogToAstro({
        filePath: path.join('/project', relative),
        projectDir: '/project',
        astroDir: '/runtime',
      });
      expect(getResourceAssetPath(relative)).toBe(mapped.slice('/runtime/public'.length));
    }
  });

  it('reads package defaults and original resources without creating staging files or exposing source code', () => {
    const { projectDirectory, coreDirectory, write, root } = fixture();
    write('core/public/favicon.svg');
    write('core/public/generated/stale.json');
    write('core/public/pagefind/stale.js');
    write('catalog/events/Placed/schema.json');
    for (const file of ['index.mdx', 'handler.ts', 'script.js', '.env', 'package.json', 'view.astro', 'diagram.c4']) {
      write(`catalog/events/Placed/${file}`);
    }
    write('catalog/pages/homepage.astro');
    write('catalog/pages/api/private.ts');
    write('catalog/components/Secret.astro');
    write('catalog/events/Placed/node_modules/private.json');
    const assets = createAssetManifest({ projectDirectory, coreDirectory });
    expect([...assets.keys()]).toEqual(['/favicon.svg', '/generated/events/Placed/schema.json']);
    expect(assets.get('/generated/events/Placed/schema.json')).toBe(path.join(projectDirectory, 'events/Placed/schema.json'));
    expect(fs.readdirSync(root).sort()).toEqual(['catalog', 'core']);
  });

  it('serves current file contents with base URLs, query strings, encoded filenames, and HEAD requests', async () => {
    const { projectDirectory, coreDirectory, write } = fixture();
    const file = write('catalog/events/Placed/order schema.json', '{"version":1}');
    const assets = createAssetManifest({ projectDirectory, coreDirectory });
    const middleware = createAssetMiddleware({ getAssets: () => assets, projectDirectory, base: '/catalog/' });
    fs.writeFileSync(file, '{"version":2}');
    const result = await request(middleware, '/catalog/generated/events/Placed/order%20schema.json?v=2');
    expect(result.body).toBe('{"version":2}');
    expect(result.response.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    const head = await request(middleware, '/catalog/generated/events/Placed/order%20schema.json', 'HEAD');
    expect(head.body).toBe('');
    expect(head.response.setHeader).toHaveBeenCalledWith('Content-Length', fs.statSync(file).size);
    const rewritten = await request(
      middleware,
      '/generated/events/Placed/order%20schema.json',
      'GET',
      '/catalog/generated/events/Placed/order%20schema.json'
    );
    expect(rewritten.body).toBe('{"version":2}');
  });

  it('lets Astro serve user public overrides and rejects traversal, malformed URLs, and non-read methods', async () => {
    const { projectDirectory, coreDirectory, write } = fixture();
    write('core/public/logo.svg', 'default');
    write('catalog/public/logo.svg', 'custom');
    const assets = createAssetManifest({ projectDirectory, coreDirectory });
    const middleware = createAssetMiddleware({ getAssets: () => assets, projectDirectory });
    for (const url of [
      '/logo.svg',
      '/%2e%2e/logo.svg',
      '/generated/%2e%2e/logo.svg',
      '/%00/logo.svg',
      '/%ZZ',
      '/%5c../logo.svg',
    ]) {
      expect((await request(middleware, url)).next).toBe(true);
    }
    expect((await request(middleware, '/logo.svg', 'POST')).next).toBe(true);
  });

  it('refreshes asset routes after adding and deleting source files without copying them', async () => {
    const { projectDirectory, coreDirectory, write } = fixture();
    write('catalog/events/Placed/schema.json');
    const watcher = new EventEmitter() as EventEmitter & { add: ReturnType<typeof vi.fn> };
    watcher.add = vi.fn();
    const middlewares = { use: vi.fn() };
    const httpServer = new EventEmitter();
    const integration = catalogAssets({ projectDirectory, coreDirectory });
    integration.hooks['astro:server:setup']({ server: { watcher, middlewares, httpServer } });
    const middleware = middlewares.use.mock.calls[0][0];
    const file = write('catalog/events/Placed/new.json', 'added');
    watcher.emit('add', file);
    expect((await request(middleware, '/generated/events/Placed/new.json')).body).toBe('added');
    fs.unlinkSync(file);
    watcher.emit('unlink', file);
    expect((await request(middleware, '/generated/events/Placed/new.json')).next).toBe(true);
    httpServer.emit('close');
    expect(watcher.listenerCount('add')).toBe(0);
  });

  it('emits assets only into final production output and preserves user overrides', () => {
    const { root, projectDirectory, coreDirectory, write } = fixture();
    write('core/public/favicon.svg', 'default icon');
    write('core/public/logo.svg', 'default logo');
    write('catalog/public/logo.svg', 'custom logo');
    write('catalog/domains/Orders/events/Placed/schema.json', 'schema');
    write('output/client/logo.svg', 'custom logo');
    const integration = catalogAssets({ projectDirectory, coreDirectory });
    integration.hooks['astro:build:done']({ dir: pathToFileURL(path.join(root, 'output/client/')) });
    expect(fs.readFileSync(path.join(root, 'output/client/favicon.svg'), 'utf8')).toBe('default icon');
    expect(fs.readFileSync(path.join(root, 'output/client/logo.svg'), 'utf8')).toBe('custom logo');
    expect(fs.readFileSync(path.join(root, 'output/client/generated/events/Placed/schema.json'), 'utf8')).toBe('schema');
    expect(fs.existsSync(path.join(projectDirectory, '.eventcatalog-core'))).toBe(false);
  });
});
