#!/usr/bin/env node
import { Command } from 'commander';
import { exec, execSync } from 'node:child_process';
import { join } from 'node:path';
import fs from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pkgJson from '../package.json';
import { Logger } from './logger';

const program = new Command();

// The users dierctory
const dir = process.cwd();

// The tmp core directory
const core = join(dir, '.eventcatalog-core');

program.name('eventcatalog').description('Documentation tool for event-driven architectures').version(pkgJson.version);

const getPackageVersion = async (directory: string): Promise<string | undefined> => {
  return import(path.resolve(directory, 'package.json'), { with: { type: 'json' } })
    .then((mod) => mod.default.version)
    .catch(() => undefined);
};

const copyCore = async (opts?: { logger: Logger }) => {
  const logger = opts?.logger;

  logger?.debug('Copying core...');

  if (fs.existsSync(core)) {
    logger?.debug("Checking user's .eventcatalog-core version...");
    // Get verion of user's .evetcatalog-core
    const usersECCoreVersion = await getPackageVersion(core);

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
      fs.rmSync(core, { recursive: true });
    }
  }

  logger?.debug("Creating user's .eventcatalog-core...");
  fs.mkdirSync(core);

  logger?.debug("Copying required files to user's .eventcatalog-core...");

  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  // The project itself
  const eventCatalogDir = join(currentDir, '../../');

  // Copy required eventcatlog files into users directory
  fs.cpSync(eventCatalogDir, core, { recursive: true });
};

const clearCore = () => {
  if (fs.existsSync(core)) fs.rmSync(core, { recursive: true });
};

program
  .command('dev')
  .description('Run development server of EventCatalog')
  .option('-d, --debug', 'Output EventCatalog application information into your terminal')
  .option('--force-recreate', 'Recreate the eventcatalog-core directory', false)
  .action(async (options) => {
    const logger = new Logger({ level: options.debug ? 'debug' : 'info' });

    // // Copy EventCatalog core over
    logger.info('Setting up EventCatalog....');

    logger.debug('Debug mode enabled');
    logger.debug('PROJECT_DIR', dir);
    logger.debug('CATALOG_DIR', core);

    if (options.forceRecreate) clearCore();
    await copyCore({ logger });

    logger.info('EventCatalog is starting at http://localhost:3000/docs');

    execSync(`cross-env PROJECT_DIR='${dir}' CATALOG_DIR='${core}' npm run dev`, {
      cwd: core,
      // @ts-ignore
      stdio: 'inherit',
    });
  });

program
  .command('build')
  .description('Run build of EventCatalog')
  .option('--force-recreate', 'Recreate the eventcatalog-core directory', false)
  .action(async (options) => {
    const logger = new Logger();

    logger.info('Building EventCatalog...');

    if (options.forceRecreate) clearCore();
    await copyCore({ logger });

    execSync(`cross-env PROJECT_DIR='${dir}' CATALOG_DIR='${core}' npm run build`, {
      cwd: core,
      stdio: 'inherit',
    });
  });

const previewCatalog = async () => {
  execSync(`cross-env PROJECT_DIR='${dir}' CATALOG_DIR='${core}' npm run preview -- --root ${dir} --port 3000`, {
    cwd: core,
    stdio: 'inherit',
  });
};

program
  .command('preview')
  .description('Serves the contents of your eventcatalog build directory')
  .action(async (options) => {
    const logger = new Logger();
    logger.info('Starting preview of your build...');
    await previewCatalog();
  });

program
  .command('start')
  .description('Serves the contents of your eventcatalog build directory')
  .action(async (options) => {
    const logger = new Logger();
    logger.info('Starting preview of your build...');
    await previewCatalog();
  });

program
  .command('generate [siteDir]')
  .description('Start the generator scripts.')
  .action(async () => {
    execSync(`cross-env PROJECT_DIR='${dir}' npm run generate`, {
      cwd: core,
      stdio: 'inherit',
    });
  });

program.parseAsync();
