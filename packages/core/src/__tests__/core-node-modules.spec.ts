import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { linkCoreNodeModules, resolveInstalledCoreNodeModules } from '../core-node-modules';

const TMP_DIRECTORY = path.join(__dirname, 'tmp-core-node-modules');

const createAstroDependency = async (nodeModulesDirectory: string) => {
  await fs.mkdir(path.join(nodeModulesDirectory, 'astro'), { recursive: true });
  await fs.writeFile(path.join(nodeModulesDirectory, 'astro', 'package.json'), '{}');
};

const symlinkType = process.platform === 'win32' ? 'junction' : 'dir';

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

  it('keeps an existing core node_modules symlink when it points at the installed core dependencies', async () => {
    const coreNodeModules = path.join(TMP_DIRECTORY, '.eventcatalog-core', 'node_modules');
    const installedCoreNodeModules = path.join(
      TMP_DIRECTORY,
      'node_modules',
      '.pnpm',
      '@eventcatalog+core@3.48.2',
      'node_modules'
    );

    await createAstroDependency(installedCoreNodeModules);
    await fs.mkdir(path.dirname(coreNodeModules), { recursive: true });
    await fs.symlink(installedCoreNodeModules, coreNodeModules, symlinkType);

    linkCoreNodeModules({ coreNodeModules, installedCoreNodeModules });

    expect(fsSync.realpathSync.native(coreNodeModules)).toBe(fsSync.realpathSync.native(installedCoreNodeModules));
  });

  it('replaces an existing core node_modules symlink when it points at stale pnpm dependencies', async () => {
    const coreNodeModules = path.join(TMP_DIRECTORY, '.eventcatalog-core', 'node_modules');
    const oldCoreNodeModules = path.join(TMP_DIRECTORY, 'node_modules', '.pnpm', '@eventcatalog+core@3.48.1', 'node_modules');
    const installedCoreNodeModules = path.join(
      TMP_DIRECTORY,
      'node_modules',
      '.pnpm',
      '@eventcatalog+core@3.48.2',
      'node_modules'
    );

    await createAstroDependency(oldCoreNodeModules);
    await createAstroDependency(installedCoreNodeModules);
    await fs.mkdir(path.dirname(coreNodeModules), { recursive: true });
    await fs.symlink(oldCoreNodeModules, coreNodeModules, symlinkType);

    linkCoreNodeModules({ coreNodeModules, installedCoreNodeModules });

    expect(fsSync.realpathSync.native(coreNodeModules)).toBe(fsSync.realpathSync.native(installedCoreNodeModules));
  });

  it('replaces a dangling core node_modules symlink', async () => {
    const coreNodeModules = path.join(TMP_DIRECTORY, '.eventcatalog-core', 'node_modules');
    const removedCoreNodeModules = path.join(TMP_DIRECTORY, 'node_modules', '.pnpm', '@eventcatalog+core@3.48.1', 'node_modules');
    const installedCoreNodeModules = path.join(
      TMP_DIRECTORY,
      'node_modules',
      '.pnpm',
      '@eventcatalog+core@3.48.2',
      'node_modules'
    );

    await createAstroDependency(installedCoreNodeModules);
    await fs.mkdir(path.dirname(removedCoreNodeModules), { recursive: true });
    await fs.mkdir(path.dirname(coreNodeModules), { recursive: true });
    await fs.symlink(removedCoreNodeModules, coreNodeModules, symlinkType);

    linkCoreNodeModules({ coreNodeModules, installedCoreNodeModules });

    expect(fsSync.realpathSync.native(coreNodeModules)).toBe(fsSync.realpathSync.native(installedCoreNodeModules));
  });
});
