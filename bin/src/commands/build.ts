import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import concurrently from 'concurrently';
import { ExitCode, prepareCore } from '../prepare-eventcatalog-core-directory';
import { catalogToAstro } from '../catalog-to-astro-content-directory';
import { main as logBuild } from '../analytics/log-build';
import { getPkgManager } from '../get-pkg-manager';

const copyFolder = (from: string, to: string) => {
  if (fs.existsSync(from)) {
    fs.cpSync(from, to, { recursive: true });
  }
};

export const build = (dir: string, core: string) =>
  new Command('build')
    .description('Run build of EventCatalog')
    .option('--no-auto-install', 'Disable automatic installation of dependencies')
    .action(async (options) => {
      console.log('Building EventCatalog...');

      const res = await prepareCore(core, options);
      if (res == ExitCode.Aborted) return;

      // hydrate
      await catalogToAstro(dir, path.join(core, 'src/content'), path.join(core, 'src/catalog-files'));

      // TODO: (fix): log build needs process.env.CATALOG_DIR
      await logBuild(dir);

      // astro build
      const pkgMan = getPkgManager();
      const { result } = concurrently([
        {
          name: 'astro',
          command: `${pkgMan} run build`,
          cwd: core,
          env: {
            PROJECT_DIR: dir,
            CATALOG_DIR: core,
          },
        },
      ]);
      await result;

      // everything is built make sure its back in the users project directory
      copyFolder(path.join(core, 'dist'), path.join(dir, 'dist'));
    });
