import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Plugin } from 'vite';
import { eventCatalogLikeC4 } from '../likec4';

const testProjectDirectory = path.join(__dirname, 'tmp-likec4');
const likeC4PackageDirectory = path.join(testProjectDirectory, 'node_modules', 'likec4');

describe('eventCatalogLikeC4', () => {
  beforeEach(async () => {
    await fs.mkdir(likeC4PackageDirectory, { recursive: true });
    await fs.writeFile(path.join(testProjectDirectory, 'package.json'), '{}');
    await fs.writeFile(path.join(testProjectDirectory, 'model.c4'), 'model {}');
    await fs.writeFile(
      path.join(likeC4PackageDirectory, 'package.json'),
      JSON.stringify({
        name: 'likec4',
        type: 'module',
        exports: {
          './vite-plugin': './vite-plugin.js',
          './vite-plugin/internal': './vite-plugin-internal.js',
          './react': './react.js',
        },
      })
    );
    await fs.writeFile(
      path.join(likeC4PackageDirectory, 'vite-plugin.js'),
      `export const LikeC4VitePlugin = () => ({ name: 'fake-likec4' });`
    );
    await fs.writeFile(path.join(likeC4PackageDirectory, 'vite-plugin-internal.js'), 'export const LikeC4Model = {};');
    await fs.writeFile(path.join(likeC4PackageDirectory, 'react.js'), 'export const LikeC4View = () => null;');
  });

  afterEach(async () => {
    await fs.rm(testProjectDirectory, { recursive: true, force: true });
  });

  it('resolves LikeC4 package subpaths from the EventCatalog project', async () => {
    const plugins = await eventCatalogLikeC4(testProjectDirectory);
    const resolver = plugins.find((plugin) => plugin.name === 'eventcatalog-likec4-dependency-resolver');
    const resolveId = resolver?.resolveId as ((id: string) => string | undefined) | undefined;

    expect(resolveId?.('likec4/react')).toBe(path.join(likeC4PackageDirectory, 'react.js'));
    expect(resolveId?.('likec4/vite-plugin/internal')).toBe(path.join(likeC4PackageDirectory, 'vite-plugin-internal.js'));
    expect(resolveId?.('likec4/not-exported')).toBeUndefined();
    expect(resolveId?.('react')).toBeUndefined();
    expect(plugins.map((plugin: Plugin) => plugin.name)).toEqual([
      'eventcatalog-likec4-dependency-resolver',
      'fake-likec4',
      'eventcatalog-likec4',
    ]);
  });

  it('returns likec4:plugin virtual module ids without a null-byte prefix', async () => {
    const plugins = await eventCatalogLikeC4(testProjectDirectory);
    const resolver = plugins.find((plugin) => plugin.name === 'eventcatalog-likec4-dependency-resolver');
    const resolveId = resolver?.resolveId as ((id: string) => string | undefined) | undefined;

    expect(resolveId?.('likec4:plugin/react.js')).toBe('likec4:plugin/react.js');
    expect(resolveId?.('likec4:plugin/react/payments.js')).toBe('likec4:plugin/react/payments.js');
  });
});
