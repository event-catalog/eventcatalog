import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import eventCatalogRuntime, {
  getPackageRoutes,
  catalogStylesPlugin,
  customSourcesPlugin,
  getRuntimeAliases,
  packageDirectory,
  userConfigPlugin,
} from '../../eventcatalog/integrations/eventcatalog-runtime.mjs';
import runtimeDependencies, { getRuntimeDependencyPath } from '../../eventcatalog/integrations/runtime-dependencies.mjs';
import { createRuntimeDependencyManifest } from '../../eventcatalog/integrations/runtime-dependency-manifest.mjs';

const directories: string[] = [];
afterEach(() => {
  vi.useRealTimers();
  for (const directory of directories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe('package-owned Astro runtime', () => {
  it('keeps SSR dependency imports portable while prerender resolves the installed package directly', () => {
    const specifiers = createRuntimeDependencyManifest([
      '@headlessui/react',
      '@astrojs/react/server.js',
      'astro/assets/services/sharp',
    ]);
    const filename = '@headlessui__react.mjs';
    expect(getRuntimeDependencyPath('@headlessui/react', 'ssr', specifiers)).toBe(
      `@eventcatalog/core/dist/runtime-dependencies/${filename}`
    );
    expect(
      getRuntimeDependencyPath('@headlessui/react', 'prerender', specifiers, new URL('file:///installed/dependencies/'))
    ).toBe(`file:///installed/dependencies/${filename}`);
    expect(getRuntimeDependencyPath('@astrojs/react/server.js', 'ssr', specifiers)).toBe('@astrojs/react/server.js');
    expect(getRuntimeDependencyPath('node:fs', 'ssr', specifiers)).toBe('node:fs');
    expect(getRuntimeDependencyPath('astro/assets/services/sharp', 'ssr', specifiers)).toBe(
      '@eventcatalog/core/dist/runtime-dependencies/astro__assets__services__sharp.mjs'
    );
  });
  it.each([
    ['file:///D:/installed/dependencies/', 'file:///D:/installed/dependencies/react.mjs'],
    ['file:///D:/catalog%20with%20spaces/%23dependencies/', 'file:///D:/catalog%20with%20spaces/%23dependencies/react.mjs'],
  ])('uses an ESM file URL for prerender dependencies in %s', (directory, expected) => {
    const manifest = createRuntimeDependencyManifest(['react']);
    expect(getRuntimeDependencyPath('react', 'prerender', manifest, new URL(directory))).toBe(expected);
  });

  it('uses filesystem paths for external prerender require calls while keeping ESM imports as file URLs', async () => {
    const readManifest = vi.spyOn(fs, 'readFileSync').mockReturnValueOnce(JSON.stringify({ react: 'react.mjs' }));
    const plugin = runtimeDependencies();
    readManifest.mockRestore();
    const context = { environment: { name: 'prerender' }, resolve: vi.fn().mockResolvedValue({ id: 'react', external: true }) };
    const options = { kind: 'require-call' };
    const resolved = await plugin.resolveId.call(context, 'react', '/entry.cjs', options);
    expect(resolved).toEqual({
      id: path.resolve(packageDirectory, '../dist/runtime-dependencies/react.mjs'),
      external: 'absolute',
    });
    expect(context.resolve).toHaveBeenCalledWith('react', '/entry.cjs', { ...options, skipSelf: true });
    const paths = plugin.configEnvironment('prerender').build.rolldownOptions.output.paths;
    expect(paths(resolved.id)).toBe(resolved.id);
    expect(paths('react')).toMatch(/^file:\/\//);
  });

  it('preserves bundled dependencies, ESM resolution, and deployed SSR require calls', async () => {
    const readManifest = vi.spyOn(fs, 'readFileSync').mockReturnValueOnce(JSON.stringify({ react: 'react.mjs' }));
    const plugin = runtimeDependencies();
    readManifest.mockRestore();
    const context = { environment: { name: 'prerender' }, resolve: vi.fn().mockResolvedValue({ id: 'react', external: false }) };
    await expect(plugin.resolveId.call(context, 'react', '/entry.cjs', { kind: 'require-call' })).resolves.toBeUndefined();
    context.resolve.mockClear();
    await expect(plugin.resolveId.call(context, 'react', '/entry.mjs', { kind: 'import-statement' })).resolves.toBeUndefined();
    context.environment.name = 'ssr';
    await expect(plugin.resolveId.call(context, 'react', '/entry.cjs', { kind: 'require-call' })).resolves.toBeUndefined();
    expect(context.resolve).not.toHaveBeenCalled();
  });

  it('injects package routes with Astro index and endpoint conventions, excluding helpers and tests', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eventcatalog-routes-'));
    directories.push(directory);
    for (const file of [
      'index.astro',
      'docs/[type]/[id]/index.astro',
      'docs/[type]/[id]/[version].mdx.ts',
      'llms.txt.ts',
      '.well-known/api-catalog.ts',
      '.well-known/_helper.ts',
      '.hidden/endpoint.ts',
      '_index.data.ts',
      '_private/index.astro',
      'api/.hidden.ts',
      'api/search.json.ts',
      'api/search.test.ts',
      'api/search.spec.ts',
      'api/types.d.ts',
    ]) {
      fs.mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
      fs.writeFileSync(path.join(directory, file), '');
    }
    expect(getPackageRoutes(directory)).toEqual([
      { pattern: '/.well-known/api-catalog', entrypoint: path.join(directory, '.well-known/api-catalog.ts') },
      { pattern: '/api/search.json', entrypoint: path.join(directory, 'api/search.json.ts') },
      { pattern: '/docs/[type]/[id]/[version].mdx', entrypoint: path.join(directory, 'docs/[type]/[id]/[version].mdx.ts') },
      { pattern: '/docs/[type]/[id]', entrypoint: path.join(directory, 'docs/[type]/[id]/index.astro') },
      { pattern: '/', entrypoint: path.join(directory, 'index.astro') },
      { pattern: '/llms.txt', entrypoint: path.join(directory, 'llms.txt.ts') },
    ]);
  });

  it('resolves core modules from the package and snippets from their original project directory', () => {
    const aliases = getRuntimeAliases({ projectDirectory: '/catalog', runtimeDirectory: '/runtime', coreDirectory: '/core' });
    const resolve = (id: string) => {
      const alias = aliases.find(({ find }) =>
        typeof find === 'string' ? id === find || id.startsWith(`${find}/`) : find.test(id)
      );
      return alias ? id.replace(alias.find, alias.replacement) : id;
    };
    expect(resolve('@config')).toBe('/catalog/eventcatalog.config.js');
    expect(resolve('@components/Header.astro')).toBe('/core/src/components/Header.astro');
    expect(resolve('@catalog/snippets/example.mdx')).toBe('/catalog/snippets/example.mdx');
    expect(resolve('@catalog/utils')).toBe('/core/src/toolkit/utils/index.ts');
    expect(resolve('auth:config')).toBe('/core/auth.config.ts');
    expect(resolve('@eventcatalog/sdk')).toBe('@eventcatalog/sdk');
  });

  it('bundles user configuration statically instead of importing the source project in deployed SSR', () => {
    const plugin = userConfigPlugin('/catalog', '/core');
    expect(plugin.load('/core/src/utils/eventcatalog-config/source.ts')).toBe(
      'export { default } from "/catalog/eventcatalog.config.js";'
    );
    expect(plugin.load('/core/src/utils/feature.ts')).toBeUndefined();
  });

  it('includes custom component and user content classes in Tailwind scans outside the package', () => {
    const plugin = catalogStylesPlugin('/catalog', '/runtime');
    const stylesheet = plugin.load(path.join(packageDirectory, 'src/styles/tailwind.css'));
    expect(stylesheet).toContain('@source "/catalog";');
    expect(plugin.load(path.join(packageDirectory, 'src/styles/theme.css'))).toBeUndefined();
  });

  it('resolves local and federated components in place, including relative imports with local overrides', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eventcatalog-components-'));
    directories.push(directory);
    for (const file of [
      'components/Card.astro',
      'components/Title.astro',
      'federated/components/Card.astro',
      'federated/components/Wrapper.astro',
    ]) {
      fs.mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
      fs.writeFileSync(path.join(directory, file), '');
    }
    const plugin = customSourcesPlugin(directory);
    expect(plugin.resolveId('@catalog/components/Card.astro')).toBe(path.join(directory, 'components/Card.astro'));
    expect(plugin.resolveId('@catalog/components/Wrapper.astro')).toBe(
      path.join(directory, 'federated/components/Wrapper.astro')
    );
    expect(plugin.resolveId('./Title.astro', path.join(directory, 'federated/components/Wrapper.astro'))).toBe(
      path.join(directory, 'components/Title.astro')
    );
    expect(plugin.resolveId('@catalog/components/../../eventcatalog.config.js')).toBeUndefined();
    expect(plugin.resolveId('/components/Card.astro?astro&type=style&index=0')).toBe(
      path.join(directory, 'components/Card.astro') + '?astro&type=style&index=0'
    );
    const styles = plugin.resolveId('@catalog/styles');
    expect(plugin.load(styles)).toBe('');
    fs.writeFileSync(path.join(directory, 'eventcatalog.styles.css'), '.custom {}');
    expect(plugin.resolveId('@catalog/styles')).toBe(path.join(directory, 'eventcatalog.styles.css'));
  });

  it('refreshes component resolution when overrides are added or removed without restarting on the initial scan or edits', async () => {
    vi.useFakeTimers();
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eventcatalog-component-watch-'));
    directories.push(directory);
    const federated = path.join(directory, 'federated/components/Card.astro');
    const local = path.join(directory, 'components/Card.astro');
    fs.mkdirSync(path.dirname(federated), { recursive: true });
    fs.writeFileSync(federated, '');
    const watcher = Object.assign(new EventEmitter(), { add: vi.fn() });
    const httpServer = new EventEmitter();
    const restart = vi.fn().mockResolvedValue(undefined);
    const plugin = customSourcesPlugin(directory);
    plugin.configureServer({ watcher, httpServer, restart, config: { logger: { error: vi.fn() } } });

    watcher.emit('add', federated);
    watcher.emit('change', federated);
    watcher.emit('add', path.join(directory, 'events/OrderPlaced/index.mdx'));
    await vi.advanceTimersByTimeAsync(50);
    expect(restart).not.toHaveBeenCalled();
    expect(plugin.resolveId('@catalog/components/Card.astro')).toBe(federated);

    fs.mkdirSync(path.dirname(local), { recursive: true });
    fs.writeFileSync(local, '');
    watcher.emit('add', local);
    watcher.emit('add', local);
    await vi.advanceTimersByTimeAsync(50);
    expect(restart).toHaveBeenCalledTimes(1);
    expect(plugin.resolveId('@catalog/components/Card.astro')).toBe(local);

    fs.unlinkSync(local);
    watcher.emit('unlink', local);
    await vi.advanceTimersByTimeAsync(50);
    expect(restart).toHaveBeenCalledTimes(2);
    expect(plugin.resolveId('@catalog/components/Card.astro')).toBe(federated);

    watcher.emit('add', local);
    httpServer.emit('close');
    await vi.advanceTimersByTimeAsync(50);
    expect(restart).toHaveBeenCalledTimes(2);
    expect(watcher.listenerCount('add')).toBe(0);
    expect(watcher.listenerCount('unlink')).toBe(0);
  });

  it('registers all routes from the installed package and watches the original user configuration', () => {
    const injectRoute = vi.fn();
    const updateConfig = vi.fn();
    const addWatchFile = vi.fn();
    eventCatalogRuntime({ projectDirectory: '/catalog', runtimeDirectory: '/runtime' }).hooks['astro:config:setup']({
      injectRoute,
      updateConfig,
      addWatchFile,
    });
    expect(injectRoute).toHaveBeenCalledWith({
      pattern: '/docs/[type]/[id]/[version]',
      entrypoint: path.join(packageDirectory, 'src/pages/docs/[type]/[id]/[version]/index.astro'),
    });
    expect(injectRoute.mock.calls.every(([route]) => route.entrypoint.startsWith(packageDirectory))).toBe(true);
    expect(addWatchFile).toHaveBeenCalledWith('/catalog/eventcatalog.config.js');
    expect(updateConfig).toHaveBeenCalledOnce();
  });
});
