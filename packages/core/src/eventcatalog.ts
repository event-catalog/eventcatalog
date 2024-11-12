import { Command } from 'commander';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import fs from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import concurrently from 'concurrently';
import type { Logger } from 'pino';
import { pino } from 'pino';
import whichPmRuns from 'which-pm-runs';
import pinoPretty from 'pino-pretty';
import { catalogToAstro } from '@/catalog-to-astro-content-directory';
import logBuild from '@/analytics/log-build';
import { watch } from '@/watcher';
import { generate } from '@/generate';
import { VERSION } from '@/constants';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
// The project itself
const EVENTCATALOG_DIR = join(currentDir, '../astro');

const program = new Command();

program.name('eventcatalog').description('Documentation tool for event-driven architectures').version(VERSION);

const copyAstroTo = async (coreDir: string, opts?: { logger: Logger }) => {
  const logger = opts?.logger;

  if (coreDir === EVENTCATALOG_DIR) {
    // This is needed for development purposes as we can't copy the dir to itself.
    return;
  }

  logger?.debug('Copying core...');

  if (!fs.existsSync(coreDir)) {
    logger?.debug("Creating user's .eventcatalog-core...");
    fs.mkdirSync(coreDir); // TODO: mkdir -p
  }

  logger?.debug("Copying required files to user's .eventcatalog-core...");

  // Copy required eventcatlog files into users directory
  fs.cpSync(EVENTCATALOG_DIR, coreDir, { recursive: true });
};

const installDeps = async (coreDir: string, ctx?: { logger?: Logger }) => {
  if (coreDir === EVENTCATALOG_DIR) {
    // On package development we don't need install the deps as we are working with workspace.
    return;
  }

  const hasNodeModules = fs.existsSync(path.resolve(coreDir, 'node_modules'));
  if (hasNodeModules) return;

  const logger = ctx.logger;
  logger?.debug('Installing dependencies...');
  const pkgManger = whichPmRuns()?.name || 'npm';
  execSync(`${pkgManger} install`, {
    cwd: coreDir,
    stdio: 'inherit',
  });
};

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

    await installDeps(ecCoreDir, { logger });

    logger.info('Hydrating...');
    await catalogToAstro(projectDir, ecCoreDir);

    logger.info('EventCatalog is starting at http://localhost:3000/docs');
    const unsubWatcher = await watch(projectDir, ecCoreDir);

    const { result } = concurrently([
      {
        command: 'npm run dev',
        env: {
          PROJECT_DIR: projectDir,
          CATALOG_DIR: ecCoreDir,
        },
        cwd: ecCoreDir,
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

    await installDeps(ecCoreDir, { logger });

    logger.info('Hydrating...');
    await catalogToAstro(projectDir, ecCoreDir);

    await logBuild(projectDir);

    execSync(`npm run build`, {
      cwd: ecCoreDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        PROJECT_DIR: projectDir,
        CATALOG_DIR: ecCoreDir,
      },
    });
  });

const previewCatalog = async ({ projectDir, ecCoreDir }: { projectDir: string; ecCoreDir: string }) => {
  execSync(`npm run preview -- --root ${projectDir} --port 3000`, {
    cwd: ecCoreDir,
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
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
