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
import { catalogToAstro, checkAndConvertMdToMdx } from './catalog-to-astro-content-directory';
import resolveCatalogDependencies from './resolve-catalog-dependencies';
import boxen from 'boxen';
import { isBackstagePluginEnabled, isEventCatalogStarterEnabled, isEventCatalogScaleEnabled, isOutputServer } from './features';
import updateNotifier from 'update-notifier';
import stream from 'stream';
import dotenv from 'dotenv';
import { detect, resolveCommand, type Agent } from 'package-manager-detector';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const program = new Command().version(VERSION);

// The users dierctory
const dir = path.resolve(process.env.PROJECT_DIR || process.cwd());

// The tmp core directory
const core = path.resolve(process.env.CATALOG_DIR || join(dir, '.eventcatalog-core'));

// The project itself
const eventCatalogDir = path.resolve(join(currentDir, '../eventcatalog/'));

const getInstalledEventCatalogVersion = () => {
  try {
    const pkg = fs.readFileSync(join(dir, 'package.json'), 'utf8');
    const json = JSON.parse(pkg);
    return json.dependencies['@eventcatalog/core'];
  } catch (error) {
    return null;
  }
};

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
    // Still need to copy the .env file
    // This is used for development purposes as it's not possible cp a dir to itself.
    // Into development usually core is the root equals to eventCatalogDir.
    return;
  }

  console.debug('Copying core...');
  // Copy required eventcatalog files into users directory
  fs.cpSync(eventCatalogDir, core, {
    recursive: true,
    filter: (src) => {
      return !src.startsWith(join(__dirname, '../node_modules'));
    },
  });
  console.debug('Core copied!');
};

/**
 * EventCatalog has static and server output.
 *
 * Server output is used for things like EventCatalog Chat and using your own LLM through an API
 *
 * If this is the case, we need to copy the server files into the core directory
 * If static, no server files are needed or copied over
 */
const copyServerFiles = async () => {
  const isServerOutput = await isOutputServer();

  // remove any server API if we have any
  if (fs.existsSync(join(core, 'src/pages/api/server'))) {
    fs.rmSync(join(core, 'src/pages/api/server'), { recursive: true });
  }

  if (!isServerOutput) {
    return;
  }

  // copy the server files into the core directory
  fs.cpSync(join(eventCatalogDir, 'src/enterprise/eventcatalog-chat/pages/api'), join(core, 'src/pages/api/server'), {
    recursive: true,
  });
};

const clearCore = () => {
  if (fs.existsSync(core)) fs.rmSync(core, { recursive: true });
};

const getPackageManager = async () => {
  const packageManager = await detect();
  const agent = packageManager?.agent ?? 'npm';
  console.debug(`Using ${agent} as package manager`);
  return agent;
};

/**
 * Resolves a command for the given package manager and operation
 * @param agent The package manager agent (npm, pnpm, yarn, etc.)
 * @param operation The operation to perform (install, execute, etc.)
 * @param args Additional arguments for the command
 * @param options Additional options for command resolution
 * @returns The resolved command string
 */
const resolveCommandString = (
  agent: Agent,
  operation: 'install' | 'execute-local',
  args: string[] = [],
  options: { ignoreWorkspace?: boolean } = {}
): string => {
  let resolvedCommand =
    resolveCommand(agent, operation, args) ||
    // Fallback to 'npm' if no specific command is resolved before
    resolveCommand('npm', operation, args)!;

  const commandArgs = [
    ...resolvedCommand.args,
    options.ignoreWorkspace && resolvedCommand.command === 'pnpm' ? '--ignore-workspace' : null,
  ].filter(Boolean);

  return `${resolvedCommand.command} ${commandArgs.join(' ')}`;
};

const installDepsOnCore = (agent: Agent) => {
  // Skip this step if we are on the package development,
  // In other words, if the core is the same as the eventcatalog package skip this step as we already have installed the dependencies with pnpm install.
  if (eventCatalogDir === core) return;

  const installCommand = resolveCommandString(agent, 'install', [], { ignoreWorkspace: true });

  console.debug(`Installing dependencies on core...`);
  execSync(installCommand, { cwd: core, stdio: 'inherit' });
  console.debug('Dependencies installed!');
};

const checkForUpdate = () => {
  const installedVersion = getInstalledEventCatalogVersion();

  if (!installedVersion) return;

  const pkg = { name: '@eventcatalog/core', version: installedVersion };
  const notifier = updateNotifier({ pkg, updateCheckInterval: 0 });

  if (notifier.update) {
    const message = `EventCatalog update available ${notifier.update.current} → ${notifier.update.latest}
Run npm i @eventcatalog/core to update`;

    console.log(
      boxen(message, {
        padding: 1,
        margin: 1,
        align: 'center',
        borderColor: 'yellow',
        borderStyle: {
          topLeft: ' ',
          topRight: ' ',
          bottomLeft: ' ',
          bottomRight: ' ',
          right: ' ',
          top: '-',
          bottom: '-',
          left: ' ',
        },
      })
    );
  }
};

program
  .command('dev')
  .description('Run development server of EventCatalog')
  .option('-d, --debug', 'Output EventCatalog application information into your terminal')
  .option('--force-recreate', 'Recreate the eventcatalog-core directory', false)
  .action(async (options, command: Command) => {
    // // Copy EventCatalog core over
    console.log('Setting up EventCatalog....');

    // Load any .env file in the project directory
    if (fs.existsSync(path.join(dir, '.env'))) {
      dotenv.config({ path: path.join(dir, '.env') });
    }

    if (options.debug) {
      console.log('Debug mode enabled');
      console.log('PROJECT_DIR', dir);
      console.log('CATALOG_DIR', core);
    }

    const agent = await getPackageManager();

    if (options.forceRecreate) clearCore();
    copyCore();

    await resolveCatalogDependencies(dir, core);

    // We need to convert all the md files to mdx to use Astro Glob Loaders
    await checkAndConvertMdToMdx(dir, core);

    // Move files like public directory to the root of the eventcatalog-core directory
    await catalogToAstro(dir, core);

    // Copy the server files into the core directory if we have server output
    await copyServerFiles();

    // Check if backstage is enabled
    const canEmbedPages = await isBackstagePluginEnabled();
    const isEventCatalogStarter = await isEventCatalogStarterEnabled();
    const isEventCatalogScale = await isEventCatalogScaleEnabled();

    // is there an eventcatalog update to install?
    checkForUpdate();

    // Install dependencies on core
    installDepsOnCore(agent);

    let watchUnsub;
    try {
      watchUnsub = await watch(dir, core);

      const devCommand = resolveCommandString(agent, 'execute-local', ['astro', 'dev', ...command.args]);

      const { result } = concurrently(
        [
          {
            name: 'astro',
            // Ignore any "Empty collection" messages
            command:
              process.platform === 'win32'
                ? `${devCommand} | findstr /V "The collection"`
                : `${devCommand} 2>&1 | grep -v "The collection.*does not exist"`,
            cwd: core,
            env: {
              PROJECT_DIR: dir,
              CATALOG_DIR: core,
              ENABLE_EMBED: canEmbedPages,
              EVENTCATALOG_STARTER: isEventCatalogStarter,
              EVENTCATALOG_SCALE: isEventCatalogScale,
            },
          },
        ],
        {
          raw: true,
          outputStream: new stream.Writable({
            write(chunk, encoding, callback) {
              const text = chunk.toString();
              if (!(text.includes('The collection') && text.includes('does not exist'))) {
                process.stdout.write(chunk);
              }
              callback();
            },
          }),
        }
      );

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
  .option('--force-recreate', 'Recreate the eventcatalog-core directory', false)
  .action(async (options, command: Command) => {
    console.log('Building EventCatalog...');

    // Load any .env file in the project directory
    if (fs.existsSync(path.join(dir, '.env'))) {
      dotenv.config({ path: path.join(dir, '.env') });
    }

    const agent = await getPackageManager();

    if (options.forceRecreate) clearCore();
    copyCore();
    // Copy the server files into the core directory if we have server output
    await copyServerFiles();

    // Check if backstage is enabled
    const canEmbedPages = await isBackstagePluginEnabled();
    const isEventCatalogStarter = await isEventCatalogStarterEnabled();
    const isEventCatalogScale = await isEventCatalogScaleEnabled();

    await logBuild(dir, {
      isEventCatalogStarterEnabled: isEventCatalogStarter,
      isEventCatalogScaleEnabled: isEventCatalogScale,
      isBackstagePluginEnabled: canEmbedPages,
    });

    await resolveCatalogDependencies(dir, core);

    // We need to convert all the md files to mdx to use Astro Glob Loaders
    await checkAndConvertMdToMdx(dir, core);

    await catalogToAstro(dir, core);

    checkForUpdate();

    // Install dependencies on core
    installDepsOnCore(agent);

    let cliCommand = resolveCommandString(agent, 'execute-local', ['astro', 'build', ...command.args]);

    // Ignore any "Empty collection" messages, it's OK to have them
    const windowsCommand = `${cliCommand} | findstr /V "The collection"`;
    const unixCommand = `bash -c "set -o pipefail; ${cliCommand} 2>&1 | grep -v \\"The collection.*does not exist\\""`;

    const buildCommand = process.platform === 'win32' ? windowsCommand : unixCommand;

    execSync(
      `cross-env PROJECT_DIR='${dir}' CATALOG_DIR='${core}' ENABLE_EMBED=${canEmbedPages} EVENTCATALOG_STARTER=${isEventCatalogStarter} EVENTCATALOG_SCALE=${isEventCatalogScale} ${buildCommand}`,
      {
        cwd: core,
        stdio: 'inherit',
      }
    );
  });

const previewCatalog = async ({
  command,
  canEmbedPages = false,
  isEventCatalogStarter = false,
  isEventCatalogScale = false,
}: {
  command: Command;
  canEmbedPages: boolean;
  isEventCatalogStarter: boolean;
  isEventCatalogScale: boolean;
}) => {
  const agent = await getPackageManager();

  const previewCommand = resolveCommandString(agent, 'execute-local', ['astro', 'preview', ...command.args]);

  execSync(
    `cross-env PROJECT_DIR='${dir}' CATALOG_DIR='${core}' ENABLE_EMBED=${canEmbedPages} EVENTCATALOG_STARTER=${isEventCatalogStarter} EVENTCATALOG_SCALE=${isEventCatalogScale} ${previewCommand}`,
    {
      cwd: core,
      stdio: 'inherit',
    }
  );
};

const startServerCatalog = ({
  command,
  canEmbedPages = false,
  isEventCatalogStarter = false,
  isEventCatalogScale = false,
}: {
  command: Command;
  canEmbedPages: boolean;
  isEventCatalogStarter: boolean;
  isEventCatalogScale: boolean;
}) => {
  execSync(
    `cross-env PROJECT_DIR='${dir}' CATALOG_DIR='${core}' ENABLE_EMBED=${canEmbedPages} EVENTCATALOG_STARTER=${isEventCatalogStarter} EVENTCATALOG_SCALE=${isEventCatalogScale} node ./dist/server/entry.mjs`,
    {
      cwd: dir,
      stdio: 'inherit',
    }
  );
};

program
  .command('preview')
  .description('Serves the contents of your eventcatalog build directory')
  .action(async (options, command: Command) => {
    console.log('Starting preview of your build...');

    // Load any .env file in the project directory
    if (fs.existsSync(path.join(dir, '.env'))) {
      dotenv.config({ path: path.join(dir, '.env') });
    }

    const canEmbedPages = await isBackstagePluginEnabled();
    const isEventCatalogStarter = await isEventCatalogStarterEnabled();
    const isEventCatalogScale = await isEventCatalogScaleEnabled();

    await copyServerFiles();

    await previewCatalog({ command, canEmbedPages, isEventCatalogStarter, isEventCatalogScale });
  });

program
  .command('start')
  .description('Serves the contents of your eventcatalog build directory')
  .action(async (options, command: Command) => {
    console.log('Starting preview of your build...');

    // Load any .env file in the project directory
    if (fs.existsSync(path.join(dir, '.env'))) {
      dotenv.config({ path: path.join(dir, '.env') });
    }

    const canEmbedPages = await isBackstagePluginEnabled();
    const isEventCatalogStarter = await isEventCatalogStarterEnabled();
    const isEventCatalogScale = await isEventCatalogScaleEnabled();

    const isServerOutput = await isOutputServer();

    if (isServerOutput) {
      startServerCatalog({ command, canEmbedPages, isEventCatalogStarter, isEventCatalogScale });
    } else {
      await previewCatalog({ command, canEmbedPages, isEventCatalogStarter, isEventCatalogScale });
    }
  });

program
  .command('generate [siteDir]')
  .description('Start the generator scripts.')
  .action(async () => {
    // Load any .env file in the project directory
    if (fs.existsSync(path.join(dir, '.env'))) {
      dotenv.config({ path: path.join(dir, '.env') });
    }
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
