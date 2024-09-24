import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import concurrently from 'concurrently';
import { catalogToAstro } from '../catalog-to-astro-content-directory';
import { prepareCore } from '../prepare-eventcatalog-core-directory';

const clearDir = (dir: string) => {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
};

// TODO: enable dir and core as options
export const dev = (dir: string, core: string) =>
  new Command('dev')
    .description('Run development server of EventCatalog')
    .option('-d, --debug', 'Output EventCatalog application information into your terminal')
    .option('--force-recreate', 'Recreate the eventcatalog-core directory', false)
    .action(async (options) => {
      console.log('Setting up EventCatalog....');

      if (options.debug) {
        console.log('Debug mode enabled');
        console.log('PROJECT_DIR', dir);
        console.log('CATALOG_DIR', core);
      }

      if (options.forceRecreate) clearDir(core);

      prepareCore(dir, core);

      console.log('EventCatalog is starting at http://localhost:3000/docs');

      // hydrate astro
      await catalogToAstro(dir, path.join(core, 'src/content'), path.join(core, 'src/catalog-files'));

      const { result } = concurrently([
        {
          name: 'watcher',
          command: 'node bin/dist/watcher.js',
          env: {
            PROJECT_DIR: dir,
            CATALOG_DIR: core,
          },
        },
        {
          name: 'astro',
          command: 'npm run dev',
          cwd: core,
          env: {
            PROJECT_DIR: dir,
            CATALOG_DIR: core,
          },
        },
      ]);

      await result;
    });
