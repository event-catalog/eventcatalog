import { Command } from 'commander';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import fs from 'fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import concurrently from 'concurrently';
import whichPmRuns from 'which-pm-runs';
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

const isDepInstalled = (moduleName: string) => {
  try {
    /**
     * `createRequire` expects a filename to be used to construct the require function.
     * For this reason, we resolve to the `package.json` file and use `pathToFileURL`
     * to ensure we get an absolute path.
     */
    const require = createRequire(pathToFileURL(path.resolve(core, 'package.json')));
    const resolvedPath = require.resolve(moduleName);
    console.debug(`Module '${moduleName}' resolved to: ${resolvedPath}`);
    return true;
  } catch (e) {
    console.debug(`Module '${moduleName}' not found!`);
    return false;
  }
};

const installDeps = ({ packageManager }: { packageManager: string }) => {
  if (isDepInstalled('astro')) {
    console.debug('Skipping dependencies installation...');
    return;
  }

  execSync(`${packageManager} install`, { cwd: core, stdio: 'inherit' });
};

const getPackageManager = () => {
  return whichPmRuns()?.name || 'npm';
};

program
  .command('dev')
  .description('Run development server of EventCatalog')
  .option('-d, --debug', 'Output EventCatalog application information into your terminal')
  .option('--force-recreate', 'Recreate the eventcatalog-core directory', false)
  .action(async (options) => {
    // // Copy EventCatalog core over
    console.log('Setting up EventCatalog....');

    if (options.debug) {
      console.log('Debug mode enabled');
      console.log('PROJECT_DIR', dir);
      console.log('CATALOG_DIR', core);
    }

    if (options.forceRecreate) clearCore();
    copyCore();

    const packageManager = getPackageManager();
    installDeps({ packageManager });

    console.log('EventCatalog is starting at http://localhost:3000/docs');

    await catalogToAstro(dir, core);

    let watchUnsub;
    try {
      watchUnsub = await watch(dir, core);

      const { result } = concurrently([
        {
          name: 'astro',
          command: `${packageManager} run dev`,
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
  .action(async (options) => {
    console.log('Building EventCatalog...');

    copyCore();

    const packageManager = getPackageManager();
    installDeps({ packageManager });

    await logBuild(dir);

    await catalogToAstro(dir, core);

    execSync(`${packageManager} run build`, {
      cwd: core,
      stdio: 'inherit',
      env: {
        ...process.env,
        PROJECT_DIR: dir,
        CATALOG_DIR: core,
      },
    });
  });

const previewCatalog = () => {
  const packageManager = getPackageManager();

  /**
   * TODO: get the port and outDir from the eventcatalog.config.js.
   */
  execSync(`${packageManager} run preview -- --root ${dir} --port 3000`, {
    cwd: core,
    stdio: 'inherit',
    env: {
      ...process.env,
      PROJECT_DIR: dir,
      CATALOG_DIR: core,
    },
  });
};

program
  .command('preview')
  .description('Serves the contents of your eventcatalog build directory')
  .action((options) => {
    console.log('Starting preview of your build...');
    previewCatalog();
  });

program
  .command('start')
  .description('Serves the contents of your eventcatalog build directory')
  .action((options) => {
    console.log('Starting preview of your build...');
    previewCatalog();
  });

program
  .command('generate [siteDir]')
  .description('Start the generator scripts.')
  .action(async () => {
    await generate(dir);
  });

program
  .parseAsync()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
