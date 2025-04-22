import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { glob } from 'glob';

test.describe.serial('Package Managers Tests', () => {
  // @ts-expect-error
  const CORE_PACKAGE_PATH = join(import.meta.dirname, '../');
  let corePackageFilename: string | null = null;

  test.beforeAll(async () => {
    console.debug('Building the `@eventcatalog/core` package...');
    execSync('pnpm build', { cwd: CORE_PACKAGE_PATH });
    console.log('Packing the `@eventcatalog/core` package...');
    const result = execSync('pnpm pack --json --', { cwd: CORE_PACKAGE_PATH, stdio: 'pipe' }).toString();
    corePackageFilename = JSON.parse(result).filename;
    console.debug(`Packed successfully to ${corePackageFilename}!!!`);
  });

  test.afterAll(async () => {
    if (corePackageFilename) {
      console.debug('Cleaning up the `@eventcatalog/core` package...');
      await rm(join(CORE_PACKAGE_PATH, corePackageFilename), { force: true });
      console.debug('Cleaned up the `@eventcatalog/core` package!!!');
    }
  });

  test.describe('NPM', () => {
    // @ts-expect-error
    const PROJECT_PATH = join(import.meta.dirname, './fixtures/npm-project');

    test.beforeAll(() => {
      execSync('npm install', { cwd: PROJECT_PATH });
      execSync(`npm add ${join(CORE_PACKAGE_PATH, corePackageFilename)}`, { cwd: PROJECT_PATH });
    });

    test.afterAll(async () => {
      console.debug('Cleaning up the `npm-project`...');
      execSync('npm remove @eventcatalog/core', { cwd: PROJECT_PATH, stdio: 'inherit' });
      await cleanUpProject(PROJECT_PATH);
      console.debug('Cleaned up the `npm-project`!!!');
    });

    test('should build the catalog', async () => {
      execSync('NODE_ENV=CI npx eventcatalog build', { cwd: PROJECT_PATH, stdio: 'inherit' });
      expect(existsSync(join(PROJECT_PATH, 'dist'))).toBe(true);
    });
  });

  test.describe('NPM - Monorepo', () => {
    // @ts-expect-error
    const PROJECT_PATH = join(import.meta.dirname, './fixtures/npm-project-monorepo/');
    const DOCS_PROJECT_PATH = join(PROJECT_PATH, 'packages/docs/');
    test.beforeAll(() => {
      // packCorePackage(CORE_PACKAGE_PATH, PROJECT_PATH);
      execSync('npm install', { cwd: PROJECT_PATH });
      execSync(`npm add ${join(CORE_PACKAGE_PATH, corePackageFilename)}`, { cwd: DOCS_PROJECT_PATH });
    });

    test.afterAll(async () => {
      console.debug('Cleaning up the `npm-project-monorepo`...');
      execSync('npm remove @eventcatalog/core', { cwd: DOCS_PROJECT_PATH, stdio: 'inherit' });
      await cleanUpProject(PROJECT_PATH);
      console.debug('Cleaned up the `npm-project-monorepo`!!!');
    });

    test('should build the catalog', async () => {
      // NODE_ENV is set to CI to avoid sending analytics data to the EventCatalog
      execSync('NODE_ENV=CI npx eventcatalog build', { cwd: DOCS_PROJECT_PATH, stdio: 'inherit' });
      expect(existsSync(join(DOCS_PROJECT_PATH, 'dist'))).toBe(true);
    });
  });

  test.describe('PNPM', () => {
    // @ts-expect-error
    const PROJECT_PATH = join(import.meta.dirname, './fixtures/pnpm-project');

    test.beforeAll(() => {
      execSync('pnpm install --ignore-workspace', { cwd: PROJECT_PATH });
      execSync(`pnpm add ${join(CORE_PACKAGE_PATH, corePackageFilename)}`, { cwd: PROJECT_PATH });
    });

    test.afterAll(async () => {
      console.debug('Cleaning up the `pnpm-project`...');
      execSync('pnpm remove @eventcatalog/core', { cwd: PROJECT_PATH });
      await cleanUpProject(PROJECT_PATH);
      console.debug('Cleaned up the `pnpm-project`!!!');
    });

    test('should build the catalog', async () => {
      // NODE_ENV is set to CI to avoid sending analytics data to the EventCatalog
      execSync('NODE_ENV=CI pnpm exec eventcatalog build', { cwd: PROJECT_PATH, stdio: 'inherit' });
      expect(existsSync(join(PROJECT_PATH, 'dist'))).toBe(true);
    });
  });

  test.describe('PNPM - Monorepo', () => {
    // @ts-expect-error
    const PROJECT_PATH = join(import.meta.dirname, './fixtures/pnpm-project-monorepo/');
    const DOCS_PROJECT_PATH = join(PROJECT_PATH, 'packages/docs/');

    test.beforeAll(() => {
      execSync('pnpm install', { cwd: PROJECT_PATH });
      execSync(`pnpm add ${join(CORE_PACKAGE_PATH, corePackageFilename)}`, { cwd: DOCS_PROJECT_PATH });
    });

    test.afterAll(async () => {
      console.debug('Cleaning up the `pnpm-project-monorepo`...');
      execSync('pnpm remove @eventcatalog/core', { cwd: DOCS_PROJECT_PATH });
      await cleanUpProject(PROJECT_PATH);
      console.debug('Cleaned up the `pnpm-project-monorepo`!!!');
    });

    test('should build the catalog', async () => {
      // NODE_ENV is set to CI to avoid sending analytics data to the EventCatalog
      execSync('NODE_ENV=CI pnpm exec eventcatalog build', {
        cwd: DOCS_PROJECT_PATH,
        stdio: 'inherit',
      });
      expect(existsSync(join(DOCS_PROJECT_PATH, 'dist'))).toBe(true);
    });
  });
});

async function cleanUpProject(projectPath: string) {
  const [directories, files] = await Promise.all([
    Promise.all([
      glob('**/.eventcatalog-core/', { cwd: projectPath }),
      glob('**/node_modules/', { cwd: projectPath }),
      glob('**/dist/', { cwd: projectPath }),
    ]),
    Promise.all([glob('**/package-lock.json', { cwd: projectPath }), glob('**/pnpm-lock.yaml', { cwd: projectPath })]),
  ]);

  await Promise.allSettled([
    ...directories
      .flat()
      .filter(Boolean)
      .map((directory) => rm(join(projectPath, directory), { recursive: true })),
    ...files
      .flat()
      .filter(Boolean)
      .map((file) => rm(join(projectPath, file))),
  ]);
}
