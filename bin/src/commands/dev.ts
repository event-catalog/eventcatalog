import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import concurrently from 'concurrently';
import { catalogToAstro } from '../catalog-to-astro-content-directory';
import { ExitCode, prepareCore } from '../prepare-eventcatalog-core-directory';
import { watch } from '../watcher';

const clearDir = (dir: string) => {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
};

// TODO: enable dir and core as options
export const dev = (dir: string, core: string) =>
  new Command('dev')
    .description('Run development server of EventCatalog')
    .option('-d, --debug', 'Output EventCatalog application information into your terminal')
    .option('--force-recreate', 'Recreate the eventcatalog-core directory', false)
    .option('--no-auto-install', 'Disable automatic installation of dependencies')
    .action(async (options) => {
      console.log('Setting up EventCatalog....');

      if (options.debug) {
        console.log('Debug mode enabled');
        console.log('PROJECT_DIR', dir);
        console.log('CATALOG_DIR', core);
      }

      if (options.forceRecreate) clearDir(core);

      const res = await prepareCore(core, options);
      if (res == ExitCode.Aborted) return;

      console.log('EventCatalog is starting at http://localhost:3000/docs');

      // hydrate astro
      await catalogToAstro(dir, path.join(core, 'src/content'), path.join(core, 'src/catalog-files'));

      // watch user's project directory
      const subscription = await watch(dir, core);

      const { result } = concurrently([
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

      try {
        await result;
      } finally {
        await subscription.unsubscribe();
      }
    });
