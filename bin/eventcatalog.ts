#!/usr/bin/env node
import { Command } from 'commander';
import { exec, execSync } from 'node:child_process';
import { join } from 'node:path';
import fs from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import concurrently from 'concurrently';
import pkgJson from '../package.json';
import { Logger } from './logger';
import { catalogToAstro } from 'scripts/catalog-to-astro-content-directory';
import logBuild from 'scripts/analytics/log-build';
import { watch } from 'scripts/watcher';
import { generate } from 'scripts/generate';

const program = new Command();

program.name('eventcatalog').description('Documentation tool for event-driven architectures').version(pkgJson.version);

const getPackageVersion = async (directory: string): Promise<string | undefined> => {
  return import(path.resolve(directory, 'package.json'), { with: { type: 'json' } })
    .then((mod) => mod.default.version)
    .catch(() => undefined);
};

const copyAstroTo = async (coreDir: string, opts?: { logger: Logger }) => {
  const logger = opts?.logger;

  logger?.debug('Copying core...');

  if (fs.existsSync(coreDir)) {
    logger?.debug("Checking user's .eventcatalog-core version...");
    // Get verion of user's .evetcatalog-core
    const usersECCoreVersion = await getPackageVersion(coreDir);

    logger?.debug("User's .eventcatalog-core: ", usersECCoreVersion);

    // Check user's .eventcatalog-core version is same as the current version
    if (usersECCoreVersion === pkgJson.version) {
      logger?.debug("User's .eventcatalog-core has the same version as the current version.\nSkipping copying files...");
      // Do nothing
      return;
    } else {
      logger?.debug(
        "User's .eventcatalog-core has different version than the current version.\nCleaning up user's .eventcatalog-core..."
      );
      // Remove user's .eventcatalog-core
      fs.rmSync(coreDir, { recursive: true });
    }
  }

  logger?.debug("Creating user's .eventcatalog-core...");
  fs.mkdirSync(coreDir); // TODO: mkdir -p

  logger?.debug("Copying required files to user's .eventcatalog-core...");

  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  // The project itself
  const eventCatalogDir = join(currentDir, '../../'); // TODO: group astro files and change this

  // Copy required eventcatlog files into users directory
  fs.cpSync(eventCatalogDir, coreDir, { recursive: true });
};

const clearDir = (dir: string) => {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
};

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
    const logger = new Logger({ level: options.debug ? 'debug' : 'info' });
    const ecCoreDir = path.resolve(options.ecCoreDir);
    const projectDir = path.resolve(options.projectDir);

    // Copy EventCatalog core over
    logger.info('Setting up EventCatalog....');

    logger.debug('Debug mode enabled');
    logger.debug('PROJECT_DIR', projectDir);
    logger.debug('CATALOG_DIR', ecCoreDir);

    if (options.forceRecreate) clearDir(ecCoreDir);
    await copyAstroTo(ecCoreDir, { logger });

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
    const logger = new Logger();
    const ecCoreDir = path.resolve(options.ecCoreDir);
    const projectDir = path.resolve(options.projectDir);

    logger.info('Building EventCatalog...');

    if (options.forceRecreate) clearDir(ecCoreDir);
    await copyAstroTo(ecCoreDir, { logger });

    logger.info('Hydrating...');
    await catalogToAstro(projectDir, ecCoreDir);

    await logBuild(projectDir);

    execSync(`cross-env PROJECT_DIR='${projectDir}' CATALOG_DIR='${ecCoreDir}' npm run build`, {
      cwd: ecCoreDir,
      stdio: 'inherit',
    });
  });

const previewCatalog = async ({ projectDir, ecCoreDir }: { projectDir: string; ecCoreDir: string }) => {
  execSync(
    `cross-env PROJECT_DIR='${projectDir}' CATALOG_DIR='${ecCoreDir}' npm run preview -- --root ${projectDir} --port 3000`,
    {
      cwd: ecCoreDir,
      stdio: 'inherit',
    }
  );
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
    const logger = new Logger();
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
    const logger = new Logger();
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
    const projectDir = path.resolve(options.projectDir);
    await generate(projectDir);
  });

program.parseAsync();
