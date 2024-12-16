import { Command } from 'commander';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import fs from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import concurrently from 'concurrently';
import { generate } from './generate';
import logBuild from './analytics/log-build';
import { VERSION } from './constants';
import { watch } from './watcher';
import { catalogToAstro } from './catalog-to-astro-content-directory';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const program = new Command().version(VERSION);

// The users dierctory
const dir = path.resolve(process.env.PROJECT_DIR || process.cwd());

// The tmp core directory
const core = path.resolve(process.env.CATALOG_DIR || join(dir, '.eventcatalog-core'));

// The project itself
const eventCatalogDir = path.resolve(join(currentDir, '../eventcatalog/'));

program.name('eventcatalog').description('Documentation tool for event-driven architectures');

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
};

const copyCore = () => {
  // make sure the core folder exists
  ensureDir(core);

  if (eventCatalogDir === core) {
    // This is used for development purposes as it's not possible cp a dir to itself.
    // Into development usually core is the root equals to eventCatalogDir.
    return;
  }

  // Copy required eventcatlog files into users directory
  fs.cpSync(eventCatalogDir, core, {
    recursive: true,
    filter: (src) => {
      // if(src.includes('node_modules')) {
      //   return false;
      // }
      return true;
    },
  });
};

const clearCore = () => {
  if (fs.existsSync(core)) fs.rmSync(core, { recursive: true });
};

program
  .command('dev')
  .description('Run development server of EventCatalog')
  .option('-d, --debug', 'Output EventCatalog application information into your terminal')
  .option('--force-recreate', 'Recreate the eventcatalog-core directory', false)
  .action(async (options, command: Command) => {
    // // Copy EventCatalog core over
    console.log('Setting up EventCatalog....');

    if (options.debug) {
      console.log('Debug mode enabled');
      console.log('PROJECT_DIR', dir);
      console.log('CATALOG_DIR', core);
    }

    if (options.forceRecreate) clearCore();
    copyCore();

    console.log('EventCatalog is starting at http://localhost:3000/docs');

    await catalogToAstro(dir, core);

    let watchUnsub;
    try {
      watchUnsub = await watch(dir, core);

      const { result } = concurrently([
        {
          name: 'astro',
          command: `npx astro dev ${command.args.join(' ').trim()}`,
          cwd: core,
          env: {
            PROJECT_DIR: dir,
            CATALOG_DIR: core,
          },
        },
      ]);

      await result;
    } catch (err) {
      console.error(err);
    } finally {
      await watchUnsub?.();
    }
  });

program
  .command('build')
  .description('Run build of EventCatalog')
  .action(async (options, command: Command) => {
    console.log('Building EventCatalog...');

    copyCore();

    await logBuild(dir);

    await catalogToAstro(dir, core);

    execSync(`cross-env PROJECT_DIR='${dir}' CATALOG_DIR='${core}' npx astro build ${command.args.join(' ').trim()}`, {
      cwd: core,
      stdio: 'inherit',
    });
  });

const previewCatalog = ({ command }: { command: Command }) => {
  execSync(`cross-env PROJECT_DIR='${dir}' CATALOG_DIR='${core}' npx astro preview ${command.args.join(' ').trim()}`, {
    cwd: core,
    stdio: 'inherit',
  });
};

program
  .command('preview')
  .description('Serves the contents of your eventcatalog build directory')
  .action((options, command: Command) => {
    console.log('Starting preview of your build...');
    previewCatalog({ command });
  });

program
  .command('start')
  .description('Serves the contents of your eventcatalog build directory')
  .action((options, command: Command) => {
    console.log('Starting preview of your build...');
    previewCatalog({ command });
  });

program
  .command('generate [siteDir]')
  .description('Start the generator scripts.')
  .action(async () => {
    await generate(dir);
  });

program.addHelpText(
  'after',
  `
  Passing Extra Arguments:
    Use the -- delimiter to forward arguments to the underlying process.
    Example: npx eventcatalog dev --debug -- --env=production --port=3000
  `
);

program
  .parseAsync()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
