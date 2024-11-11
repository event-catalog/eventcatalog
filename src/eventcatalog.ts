import { Command } from 'commander';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import fs from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import concurrently from 'concurrently';
import type { Logger } from 'pino';
import { pino } from 'pino';
import pinoPretty from 'pino-pretty';
import whichPm from 'which-pm';
import { VERSION } from './constants';
import { catalogToAstro } from '@/catalog-to-astro-content-directory';
import logBuild from '@/analytics/log-build';
import { watch } from '@/watcher';
import { generate } from '@/generate';

const program = new Command();

program.name('eventcatalog').description('Documentation tool for event-driven architectures').version(VERSION);

const copyAstroTo = async (coreDir: string, opts?: { logger: Logger }) => {
  const logger = opts?.logger;

  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const eventCatalogDir = join(currentDir, '../astro'); // The project itself

  if (coreDir === eventCatalogDir) {
    // This is only needed for development purposes as we can't copy the path to itself.
    return;
  }

  logger?.debug('Copying core...');

  if (!fs.existsSync(coreDir)) {
    logger?.debug("Creating user's .eventcatalog-core...");
    fs.mkdirSync(coreDir); // TODO: mkdir -p
  }

  logger?.debug("Copying required files to user's .eventcatalog-core...");

  // Copy required eventcatlog files into users directory
  fs.cpSync(eventCatalogDir, coreDir, { recursive: true });
};

/**
 * Get the command to execute a package (e.g. `npx`, `yarn dlx`, `pnpm dlx`, etc.)
 * @returns The command to execute a package
 */
async function getExecCommand(): Promise<string> {
  const packageManager = (await whichPm(process.cwd()))?.name ?? 'npm';

  switch (packageManager) {
    case 'yarn':
      return 'yarn dlx';
    case 'pnpm':
      return 'pnpm dlx';
    case 'npm':
    default:
      return 'npx';
  }
}

const clearDir = (dir: string) => {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
};

const pinoPrettyStream = pinoPretty({ colorize: true });

program
  .command('dev')
  .description('Run development server of EventCatalog')
  .option('-d, --debug', 'Output EventCatalog application information into your terminal')
  .option('--force-recreate', 'Recreate the eventcatalog-core directory', false)
  .option('--project-dir <path>', 'Project directory path. Defaults to cwd.', path.resolve(process.cwd()))
  .option(
    '--ec-core-dir <path>',
    'Path to .eventcatalog-core directory. Defaults to cwd + .eventcatalog-core',
    path.resolve(process.cwd(), '.eventcatalog-core')
  )
  .action(async (options) => {
    const logger = pino({ level: options.debug ? 'debug' : 'info' }, pinoPrettyStream);
    const ecCoreDir = path.resolve(options.ecCoreDir);
    const projectDir = path.resolve(options.projectDir);

    // Copy EventCatalog core over
    logger.info('Setting up EventCatalog....');

    logger.debug('Debug mode enabled');
    logger.debug({ PROJECT_DIR: projectDir, CATALOG_DIR: ecCoreDir });

    if (options.forceRecreate) clearDir(ecCoreDir);
    await copyAstroTo(ecCoreDir, { logger });

    logger.info('Hydrating...');
    await catalogToAstro(projectDir, ecCoreDir);

    logger.info('EventCatalog is starting at http://localhost:3000/docs');
    const unsubWatcher = await watch(projectDir, ecCoreDir);

    const execCommand = await getExecCommand();
    const { result } = concurrently([
      {
        command: `${execCommand} astro dev --root ${ecCoreDir}`,
        env: {
          PROJECT_DIR: projectDir,
          CATALOG_DIR: ecCoreDir,
        },
        name: 'astro',
      },
    ]);

    try {
      await result;
    } finally {
      await unsubWatcher();
    }
  });

program
  .command('build')
  .description('Run build of EventCatalog')
  .option('--force-recreate', 'Recreate the eventcatalog-core directory', false)
  .option('--project-dir <path>', 'Project directory path. Defaults to cwd.', path.resolve(process.cwd()))
  .option(
    '--ec-core-dir <path>',
    'Path to .eventcatalog-core directory. Defaults to cwd + .eventcatalog-core',
    path.resolve(process.cwd(), '.eventcatalog-core')
  )
  .action(async (options) => {
    const logger = pino(pinoPrettyStream);
    const ecCoreDir = path.resolve(options.ecCoreDir);
    const projectDir = path.resolve(options.projectDir);

    logger.info('Building EventCatalog...');

    if (options.forceRecreate) clearDir(ecCoreDir);
    await copyAstroTo(ecCoreDir, { logger });

    logger.info('Hydrating...');
    await catalogToAstro(projectDir, ecCoreDir);

    await logBuild(projectDir);

    const execCommand = await getExecCommand();
    execSync(`${execCommand} astro build --root ${ecCoreDir}`, {
      stdio: 'inherit',
      env: {
        ...process.env,
        PROJECT_DIR: projectDir,
        CATALOG_DIR: ecCoreDir,
      },
    });
  });

const previewCatalog = async ({ projectDir, ecCoreDir }: { projectDir: string; ecCoreDir: string }) => {
  // TODO: resolve the --root from the eventcatalog.config.js -> outDir having as rootDir the projectDir `path.resolve(projectDir, config.outDir)`
  // TODO: get the port from eventcatalog.config.js
  const execCommand = await getExecCommand();
  execSync(`${execCommand} astro preview --root ${projectDir} --port 3000`, {
    stdio: 'inherit',
    env: {
      ...process.env,
      PROJECT_DIR: projectDir,
      CATALOG_DIR: ecCoreDir,
    },
  });
};

program
  .command('preview')
  .description('Serves the contents of your eventcatalog build directory')
  .option('--project-dir <path>', 'Project directory path. Defaults to cwd.', path.resolve(process.cwd()))
  .option(
    '--ec-core-dir <path>',
    'Path to .eventcatalog-core directory. Defaults to cwd + .eventcatalog-core',
    path.resolve(process.cwd(), '.eventcatalog-core')
  )
  .action(async (options) => {
    const logger = pino(pinoPrettyStream);
    const ecCoreDir = path.resolve(options.ecCoreDir);
    const projectDir = path.resolve(options.projectDir);

    logger.info('Starting preview of your build...');
    await previewCatalog({ ecCoreDir, projectDir });
  });

program
  .command('start')
  .description('Serves the contents of your eventcatalog build directory')
  .option('--project-dir <path>', 'Project directory path. Defaults to cwd.', path.resolve(process.cwd()))
  .option(
    '--ec-core-dir <path>',
    'Path to .eventcatalog-core directory. Defaults to cwd + .eventcatalog-core',
    path.resolve(process.cwd(), '.eventcatalog-core')
  )
  .action(async (options) => {
    const logger = pino(pinoPrettyStream);
    const ecCoreDir = path.resolve(options.ecCoreDir);
    const projectDir = path.resolve(options.projectDir);

    logger.info('Starting preview of your build...');
    await previewCatalog({ ecCoreDir, projectDir });
  });

program
  .command('generate')
  .description('Start the generator scripts.')
  .option('--project-dir <path>', 'Project directory path. Defaults to cwd.', path.resolve(process.cwd()))
  .action(async (options) => {
    const logger = pino(pinoPrettyStream);
    const projectDir = path.resolve(options.projectDir);
    await generate(projectDir, { logger });
  });

program
  .parseAsync()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
