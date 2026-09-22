import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DevEnvironment, normalizePath, resolveConfig } from 'vite';
import { clientDependencies } from '../../eventcatalog/integrations/client-dependencies.mjs';
import { packageDirectory, packageDependenciesPlugin } from '../../eventcatalog/integrations/eventcatalog-runtime.mjs';

describe('installed catalog browser dependencies', () => {
  let directory: string;
  let environment: DevEnvironment;

  beforeAll(async () => {
    directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'eventcatalog-client-deps-')));
    const config = await resolveConfig(
      {
        configFile: false,
        envDir: false,
        root: packageDirectory,
        cacheDir: path.join(directory, 'vite'),
        logLevel: 'error',
        resolve: { dedupe: ['react', 'react-dom'] },
        plugins: [packageDependenciesPlugin()],
        // No page scan or late discovery: these imports must work on the first
        // request even when Core's components are inside node_modules.
        optimizeDeps: { noDiscovery: true, include: clientDependencies },
      },
      'serve'
    );
    // Exercise the real development optimizer without starting an HTTP server.
    environment = new DevEnvironment('client', config, { hot: false });
    await environment.init();
    await environment.depsOptimizer!.init();
  }, 60_000);

  afterAll(async () => {
    await environment?.close();
    if (directory) fs.rmSync(directory, { recursive: true, force: true });
  });

  it.each(['@eventcatalog/visualiser', '@xyflow/react', '@ai-sdk/react', 'ai'])(
    'serves %s as a prebundled module when imported by an installed Core component',
    async (dependency) => {
      const importer = path.join(directory, 'node_modules/@eventcatalog/core/eventcatalog/src/component.tsx');
      const resolved = await environment.pluginContainer.resolveId(dependency, importer);
      const optimized = environment.depsOptimizer!.metadata.optimized[dependency];
      expect(optimized).toBeDefined();
      expect(resolved?.id.split('?')[0]).toBe(normalizePath(optimized.file));
      expect(fs.existsSync(optimized.file)).toBe(true);
    }
  );

  it('converts the graph and chat CommonJS dependencies instead of leaving raw browser imports', () => {
    const metadata = environment.depsOptimizer!.metadata;
    const files = [...Object.values(metadata.optimized), ...Object.values(metadata.chunks)];
    const sources = files.flatMap(({ file }) => {
      // Vite may emit re-export-only entrypoints without a source map.
      if (!fs.existsSync(`${file}.map`)) return [];
      const map = JSON.parse(fs.readFileSync(`${file}.map`, 'utf8'));
      return map.sources as string[];
    });
    // These are the two modules that previously reached the browser as raw
    // CommonJS and failed to provide their default/getContext ESM exports.
    expect(sources.some((source) => source.endsWith('/use-sync-external-store/shim/with-selector.js'))).toBe(true);
    expect(sources.some((source) => source.endsWith('/@vercel/oidc/dist/index-browser.js'))).toBe(true);
    for (const { file } of files) {
      const code = fs.readFileSync(file, 'utf8');
      expect(code).not.toMatch(/from\s*['"][^'"]*use-sync-external-store/);
      expect(code).not.toMatch(/from\s*['"][^'"]*@vercel\/oidc/);
    }
  });
});
