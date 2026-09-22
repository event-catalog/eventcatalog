import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isFileServingAllowed, normalizePath, resolveConfig } from 'vite';
import { getDevServerFileSystem } from '../../eventcatalog/integrations/eventcatalog-runtime.mjs';

describe('development server filesystem boundaries', () => {
  let directory: string;
  let projectDirectory: string;

  const write = (file: string, content = '') => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };
  const permits = (allow: string[], file: string) =>
    allow.some((root) => {
      const relative = path.relative(root, file);
      return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
    });

  beforeEach(() => {
    directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'eventcatalog-dev-fs-')));
    projectDirectory = path.join(directory, 'my catalog');
    write(path.join(projectDirectory, 'package.json'), '{}');
  });

  afterEach(() => fs.rmSync(directory, { recursive: true, force: true }));

  it('permits an ordinary npm installation without allowing unrelated sibling projects', () => {
    const coreRoot = path.join(projectDirectory, 'node_modules/@eventcatalog/core');
    const coreDirectory = path.join(coreRoot, 'eventcatalog');
    write(path.join(coreRoot, 'package.json'), '{}');
    fs.mkdirSync(coreDirectory);

    const config = getDevServerFileSystem({ projectDirectory, coreDirectory });
    expect(config.strict).toBe(true);
    expect(permits(config.allow, path.join(projectDirectory, 'node_modules/@fontsource/inter/files/font.woff2'))).toBe(true);
    expect(permits(config.allow, path.join(directory, 'other-project/private.txt'))).toBe(false);
    expect(new Set(config.allow).size).toBe(config.allow.length);
  });

  it('permits pnpm virtual-store dependencies for an installed catalog in a workspace', () => {
    write(path.join(directory, 'pnpm-workspace.yaml'), 'packages:\n  - "my catalog"\n');
    const coreRoot = path.join(directory, 'node_modules/.pnpm/core/node_modules/@eventcatalog/core');
    const coreDirectory = path.join(coreRoot, 'eventcatalog');
    write(path.join(coreRoot, 'package.json'), '{}');
    fs.mkdirSync(coreDirectory);

    const config = getDevServerFileSystem({ projectDirectory, coreDirectory });
    expect(config.allow).toContain(directory);
    expect(
      permits(config.allow, path.join(directory, 'node_modules/.pnpm/react/node_modules/@astrojs/react/dist/client.js'))
    ).toBe(true);
    expect(permits(config.allow, path.join(directory, '../unrelated/private.txt'))).toBe(false);
  });

  it('discovers the real workspace of linked Core and serves its fonts and React runtime', () => {
    const coreWorkspace = path.join(directory, 'core workspace');
    const coreRoot = path.join(coreWorkspace, 'packages/core');
    const realCoreDirectory = path.join(coreRoot, 'eventcatalog');
    write(path.join(coreWorkspace, 'pnpm-workspace.yaml'), 'packages:\n  - "packages/*"\n');
    write(path.join(coreRoot, 'package.json'), '{}');
    fs.mkdirSync(realCoreDirectory);
    const link = path.join(projectDirectory, 'node_modules/@eventcatalog/core');
    fs.mkdirSync(path.dirname(link), { recursive: true });
    fs.symlinkSync(coreRoot, link, 'junction');

    const config = getDevServerFileSystem({ projectDirectory, coreDirectory: path.join(link, 'eventcatalog') });
    expect(config.strict).toBe(true);
    expect(config.allow).toContain(coreWorkspace);
    expect(config.allow).toContain(realCoreDirectory);
    for (const asset of [
      'node_modules/.pnpm/inter/node_modules/@fontsource/inter/files/font.woff2',
      'node_modules/.pnpm/react/node_modules/@astrojs/react/dist/client.js',
    ]) {
      expect(permits(config.allow, path.join(coreWorkspace, asset))).toBe(true);
    }
    expect(permits(config.allow, path.join(directory, 'unrelated/private.txt'))).toBe(false);
    expect(config.allow).not.toContain(directory);
    expect(config.allow).not.toContain(path.parse(directory).root);
  });

  it('allows both the logical and real paths when the catalog directory is itself a symlink', () => {
    const link = path.join(directory, 'linked catalog');
    fs.symlinkSync(projectDirectory, link, 'junction');
    const coreDirectory = path.join(projectDirectory, 'node_modules/@eventcatalog/core/eventcatalog');
    fs.mkdirSync(coreDirectory, { recursive: true });

    const config = getDevServerFileSystem({ projectDirectory: link, coreDirectory });
    expect(config.allow).toContain(link);
    expect(config.allow).toContain(projectDirectory);
  });

  it('passes Vite security checks for the real Core dependencies while still denying secrets and unrelated files', async () => {
    const require = createRequire(import.meta.url);
    const config = await resolveConfig(
      {
        configFile: false,
        envDir: false,
        root: projectDirectory,
        server: { fs: getDevServerFileSystem({ projectDirectory }) },
      },
      'serve'
    );
    const font = path.join(path.dirname(require.resolve('@fontsource/inter/400.css')), 'files/inter-latin-400-normal.woff2');
    const react = require.resolve('@astrojs/react/client.js');
    const allowed = (file: string) => isFileServingAllowed(config, `/@fs/${normalizePath(file)}`);
    expect(allowed(font)).toBe(true);
    expect(allowed(react)).toBe(true);
    expect(allowed(path.join(projectDirectory, '.env'))).toBe(false);
    expect(allowed(path.join(projectDirectory, '.env.local'))).toBe(false);
    expect(allowed(path.join(directory, 'unrelated/private.txt'))).toBe(false);
    expect(config.server.fs.strict).toBe(true);
  });
});
