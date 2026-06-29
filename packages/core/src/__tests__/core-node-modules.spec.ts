import fs from 'fs/promises';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveInstalledCoreNodeModules } from '../core-node-modules';

const TMP_DIRECTORY = path.join(__dirname, 'tmp-core-node-modules');

const createAstroDependency = async (nodeModulesDirectory: string) => {
  await fs.mkdir(path.join(nodeModulesDirectory, 'astro'), { recursive: true });
  await fs.writeFile(path.join(nodeModulesDirectory, 'astro', 'package.json'), '{}');
};

describe('resolveInstalledCoreNodeModules', () => {
  afterEach(async () => {
    await fs.rm(TMP_DIRECTORY, { recursive: true, force: true });
  });

  it('uses the package local node_modules directory when it contains Astro', async () => {
    const currentDir = path.join(TMP_DIRECTORY, 'node_modules', '@eventcatalog', 'core', 'dist');
    const packageNodeModules = path.join(TMP_DIRECTORY, 'node_modules', '@eventcatalog', 'core', 'node_modules');

    await fs.mkdir(currentDir, { recursive: true });
    await createAstroDependency(packageNodeModules);

    expect(resolveInstalledCoreNodeModules(currentDir)).toBe(packageNodeModules);
  });

  it('resolves the pnpm virtual-store node_modules directory when package local node_modules is absent', async () => {
    const virtualStoreNodeModules = path.join(
      TMP_DIRECTORY,
      'node_modules',
      '.pnpm',
      '@eventcatalog+core@3.48.2',
      'node_modules'
    );
    const currentDir = path.join(virtualStoreNodeModules, '@eventcatalog', 'core', 'dist');

    await fs.mkdir(currentDir, { recursive: true });
    await createAstroDependency(virtualStoreNodeModules);

    expect(resolveInstalledCoreNodeModules(currentDir)).toBe(virtualStoreNodeModules);
  });
});
