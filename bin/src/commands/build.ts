import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import { prepareCore } from '../prepare-eventcatalog-core-directory';
import { catalogToAstro } from '../catalog-to-astro-content-directory';
import { main as logBuild } from '../analytics/log-build';

const copyFolder = (from: string, to: string) => {
  if (fs.existsSync(from)) {
    fs.cpSync(from, to, { recursive: true });
  }
};

export const build = (dir: string, core: string) =>
  new Command('build').description('Run build of EventCatalog').action(async (options) => {
    console.log('Building EventCatalog...');

    prepareCore(dir, core);

    // hydrate
    await catalogToAstro(dir, path.join(core, 'src/content'), path.join(core, 'src/catalog-files'));

    // TODO: (fix): log build needs process.env.CATALOG_DIR
    // log-build
    await logBuild(dir);

    // astro build
    execSync(`cross-env PROJECT_DIR='${dir}' CATALOG_DIR='${core}' npm run build`, {
      cwd: core,
      stdio: 'inherit',
    });

    // everything is built make sure its back in the users project directory
    copyFolder(path.join(core, 'dist'), path.join(dir, 'dist'));
  });
