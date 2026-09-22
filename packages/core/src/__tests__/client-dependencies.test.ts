import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DevEnvironment, normalizePath, resolveConfig } from 'vite';
import { collectClientDependencies } from '../../eventcatalog/integrations/client-dependencies.mjs';
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
        optimizeDeps: { noDiscovery: true, include: collectClientDependencies() },
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

  it.each(['@eventcatalog/visualiser', '@xyflow/react', '@ai-sdk/react', 'ai', 'react-markdown'])(
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
    // These modules previously reached the browser as raw CommonJS and failed
    // to provide their default/getContext ESM exports. style-to-js is nested
    // beneath ESM packages (react-markdown > hast-util-to-jsx-runtime).
    expect(sources.some((source) => source.endsWith('/use-sync-external-store/shim/with-selector.js'))).toBe(true);
    expect(sources.some((source) => source.endsWith('/@vercel/oidc/dist/index-browser.js'))).toBe(true);
    expect(sources.some((source) => source.endsWith('/style-to-js/cjs/index.js'))).toBe(true);
    for (const { file } of files) {
      const code = fs.readFileSync(file, 'utf8');
      expect(code).not.toMatch(/from\s*['"][^'"]*use-sync-external-store/);
      expect(code).not.toMatch(/from\s*['"][^'"]*@vercel\/oidc/);
      expect(code).not.toMatch(/from\s*['"][^'"]*style-to-js/);
    }
  });
});

describe('collectClientDependencies', () => {
  let directory: string;

  const write = (file: string, contents: string) => {
    fs.mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
    fs.writeFileSync(path.join(directory, file), contents);
  };

  beforeAll(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eventcatalog-client-collect-'));
    const dependencies = [
      'browser-dep',
      'nested-dep',
      'aliased-dep',
      'script-dep',
      'server-only',
      'types-only',
      'astro-integration',
    ];
    write('package.json', JSON.stringify({ dependencies: Object.fromEntries(dependencies.map((name) => [name, '1.0.0'])) }));
    write('node_modules/astro-integration/package.json', JSON.stringify({ peerDependencies: { astro: '*' } }));
    write(
      'eventcatalog/src/components/Island.tsx',
      [
        "import type { Thing } from 'types-only';",
        "import Browser from 'browser-dep';",
        "import 'browser-dep/styles.css';",
        "import { helper } from './helper';",
        "import { store } from '@stores/store';",
        "import { client } from 'astro-integration/client';",
        "import unknown from 'not-a-core-dependency';",
      ].join('\n')
    );
    write('eventcatalog/src/components/helper.ts', "export { nested } from 'nested-dep/sub/path';");
    write('eventcatalog/src/stores/store.ts', "import { atom } from 'aliased-dep';");
    write(
      'eventcatalog/src/pages/page.astro',
      [
        '---',
        "import server from 'server-only';",
        '---',
        "<script>import 'script-dep';</script>",
        "<script is:inline>import 'server-only';</script>",
      ].join('\n')
    );
    write('eventcatalog/src/components/__tests__/Island.test.tsx', "import 'server-only';");
  });

  afterAll(() => {
    if (directory) fs.rmSync(directory, { recursive: true, force: true });
  });

  it('collects Core dependencies reachable from browser entrypoints', () => {
    const dependencies = collectClientDependencies(path.join(directory, 'eventcatalog'));
    expect(dependencies).toEqual(
      expect.arrayContaining(['browser-dep', 'nested-dep/sub/path', 'aliased-dep', 'script-dep', 'react', 'react-dom'])
    );
    expect(dependencies).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/^(server-only|types-only|astro-integration|not-a-core-dependency)/)])
    );
    expect(dependencies).not.toContain('browser-dep/styles.css');
  });
});
