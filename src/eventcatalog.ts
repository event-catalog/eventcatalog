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
import { isOutputServer, getProjectOutDir, isAuthEnabled } from './features';
import updateNotifier from 'update-notifier';
import dotenv from 'dotenv';
import { runMigrations } from './migrations';
import { logger } from './utils/cli-logger';
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const program = new Command().version(VERSION);

import { isEventCatalogStarterEnabled, isEventCatalogScaleEnabled, isFeatureEnabled } from '@eventcatalog/license';

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
    // remove the chat API if it exists, this is only a SSR feature
    // TODO: Make this more flexible and better in the future when we have more features like this.
    if (fs.existsSync(join(core, 'src/pages/api/chat.ts'))) {
      fs.rmSync(join(core, 'src/pages/api/chat.ts'));
    }

    // Auth requires SSR Mode
    if (fs.existsSync(join(core, 'src/pages/api/[...auth].ts'))) {
      fs.rmSync(join(core, 'src/pages/api/[...auth].ts'));
    }

    return;
  }

  // copy the server files into the core directory
  fs.cpSync(join(eventCatalogDir, 'src/enterprise/eventcatalog-chat/pages/api'), join(core, 'src/pages/api'), {
    recursive: true,
  });
};

const createAuthFileIfNotExists = async (hasRequiredLicense: boolean) => {
  const authEnabled = await isAuthEnabled();
  const isSRR = await isOutputServer();

  // If auth is enabled, then we need to create the auth API file
  try {
    if (authEnabled && hasRequiredLicense && isSRR) {
      logger.info('Creating auth file', 'auth');
      fs.writeFileSync(
        join(core, 'src/pages/api/[...auth].ts'),
        `import { AstroAuth } from 'auth-astro/server';
export const prerender = false;
export const { GET, POST } = AstroAuth();
`
      );
    }
  } catch (error) {
    // silent for now
  }
};

const clearCore = () => {
  if (fs.existsSync(core)) fs.rmSync(core, { recursive: true });
};

const checkForUpdate = () => {
  const installedVersion = getInstalledEventCatalogVersion();

  if (!installedVersion) return;

  // Check if user is on version < 3 and notify about V3
  const majorVersion = parseInt(installedVersion.replace(/[^0-9.]/g, '').split('.')[0], 10);
  if (majorVersion < 3) {
    const v3Message = `🚀 EventCatalog V3 is now available in beta!

You are currently on version ${installedVersion}.
V3 brings exciting new features and improvements.

Upgrade now: npm i @eventcatalog/core@beta`;
    console.log(
      boxen(v3Message, {
        padding: 1,
        margin: 1,
        align: 'center',
        borderColor: 'magenta',
        borderStyle: 'round',
      })
    );
    return;
  }

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
    // // Copy EventCatalog core over
    logger.welcome();
    logger.info('Setting up EventCatalog...', 'eventcatalog');

    const isServer = await isOutputServer();
    logger.info(isServer ? 'EventCatalog is running in Server Mode' : 'EventCatalog is running in Static Mode', 'config');

    // Load any .env file in the project directory
    if (fs.existsSync(path.join(dir, '.env'))) {
      dotenv.config({ path: path.join(dir, '.env') });
    }

    if (options.debug) {
      logger.info('Debug mode enabled', 'debug');
      logger.info(`PROJECT_DIR: ${dir}`, 'debug');
      logger.info(`CATALOG_DIR: ${core}`, 'debug');
    }

    if (options.forceRecreate) clearCore();
    copyCore();

    await resolveCatalogDependencies(dir, core);

    // We need to convert all the md files to mdx to use Astro Glob Loaders
    await checkAndConvertMdToMdx(dir, core);

    // Run any migrations for the catalog
    await runMigrations(dir);

    // Move files like public directory to the root of the eventcatalog-core directory
    await catalogToAstro(dir, core);

    // Copy the server files into the core directory if we have server output
    await copyServerFiles();

    // Check if backstage is enabled
    const canEmbedPages = await isFeatureEnabled(
      '@eventcatalog/backstage-plugin-eventcatalog',
      process.env.EVENTCATALOG_LICENSE_KEY_BACKSTAGE
    );
    const isEventCatalogStarter = await isEventCatalogStarterEnabled();
    const isEventCatalogScale = await isEventCatalogScaleEnabled();

    // Create the auth.config.ts file if it doesn't exist
    await createAuthFileIfNotExists(isEventCatalogScale);

    // is there an eventcatalog update to install?
    checkForUpdate();

    let watchUnsub;
    try {
      watchUnsub = await watch(dir, core);

      const { result } = concurrently(
        [
          {
            name: 'astro',
            command:
              process.platform === 'win32'
                ? `npx astro dev ${command.args.join(' ').trim()} 2>&1 | findstr /V /C:"[glob-loader]" /C:"The collection" /C:"[router]"`
                : `npx astro dev ${command.args.join(' ').trim()} 2>&1 | grep -v -e "\\[glob-loader\\]" -e "The collection.*does not exist" -e "\\[router\\]"`,
            cwd: core,
            env: {
              PROJECT_DIR: dir,
              CATALOG_DIR: core,
              ENABLE_EMBED: canEmbedPages || isEventCatalogScale,
              EVENTCATALOG_STARTER: isEventCatalogStarter,
              EVENTCATALOG_SCALE: isEventCatalogScale,
              NODE_NO_WARNINGS: '1',
            },
          },
        ],
        {
          raw: true,
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
  .action(async (options, command: Command) => {
    logger.welcome();
    logger.info('Building EventCatalog...', 'build');

    const isServer = await isOutputServer();

    logger.info(isServer ? 'EventCatalog is running in Server Mode' : 'EventCatalog is running in Static Mode', 'config');

    // Load any .env file in the project directory
    if (fs.existsSync(path.join(dir, '.env'))) {
      dotenv.config({ path: path.join(dir, '.env') });
    }

    copyCore();
    // Copy the server files into the core directory if we have server output
    await copyServerFiles();

    // Check if backstage is enabled
    const isBackstagePluginEnabled = await isFeatureEnabled(
      '@eventcatalog/backstage-plugin-eventcatalog',
      process.env.EVENTCATALOG_LICENSE_KEY_BACKSTAGE
    );
    const isEventCatalogStarter = await isEventCatalogStarterEnabled();
    const isEventCatalogScale = await isEventCatalogScaleEnabled();

    const canEmbedPages = isBackstagePluginEnabled || isEventCatalogScale;

    // Create the auth.config.ts file if it doesn't exist
    await createAuthFileIfNotExists(isEventCatalogScale);

    await logBuild(dir, {
      isEventCatalogStarterEnabled: isEventCatalogStarter,
      isEventCatalogScaleEnabled: isEventCatalogScale,
      isBackstagePluginEnabled: canEmbedPages || isEventCatalogScale,
    });

    await resolveCatalogDependencies(dir, core);

    // We need to convert all the md files to mdx to use Astro Glob Loaders
    await checkAndConvertMdToMdx(dir, core);

    // Run any migrations for the catalog
    await runMigrations(dir);

    await catalogToAstro(dir, core);

    checkForUpdate();

    // Ignore any "Empty collection" messages, it's OK to have them
    const windowsCommand = `npx astro build ${command.args.join(' ').trim()} | findstr /V "The collection"`;
    // const unixCommand = `bash -c "set -o pipefail; npx astro build ${command.args.join(' ').trim()} 2>&1 | grep -v -e "\\[router\\]" -e "The collection.*does not exist"`;
    const unixCommand = `bash -c "set -o pipefail; npx astro build ${command.args.join(' ').trim()} 2>&1 | grep -v -e \\"\\\\[router\\\\]\\" -e \\"The collection.*does not exist\\""`;

    const buildCommand = process.platform === 'win32' ? windowsCommand : unixCommand;

    execSync(
      `cross-env PROJECT_DIR='${dir}' CATALOG_DIR='${core}' ENABLE_EMBED=${canEmbedPages} EVENTCATALOG_STARTER=${isEventCatalogStarter} EVENTCATALOG_SCALE=${isEventCatalogScale} ${buildCommand}`,
      {
        cwd: core,
        stdio: 'inherit',
      }
    );

    // Turn off Pagefind for v3; todo; remove pagefind code once we know thats what we want.
    // if (!isServerOutput) {
    //   const outDir = await getProjectOutDir();

    //   const windowsCommand = `npx -y pagefind --site ${outDir}`;
    //   const unixCommand = `npx -y pagefind --site ${outDir}`;
    //   const pagefindCommand = process.platform === 'win32' ? windowsCommand : unixCommand;

    //   // Build pagefind into the output directory for the final build version
    //   execSync(
    //     `cross-env PROJECT_DIR='${dir}' CATALOG_DIR='${core}' ENABLE_EMBED=${canEmbedPages} EVENTCATALOG_STARTER=${isEventCatalogStarter} EVENTCATALOG_SCALE=${isEventCatalogScale} ${pagefindCommand}`,
    //     {
    //       cwd: dir,
    //       stdio: 'inherit',
    //     }
    //   );

    //   // Copy the pagefind directory into the public directory for dev mode
    //   if (fs.existsSync(join(dir, outDir, 'pagefind'))) {
    //     fs.cpSync(join(dir, outDir, 'pagefind'), join(dir, 'public', 'pagefind'), { recursive: true });
    //   }
    // }
  });

const previewCatalog = ({
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
    `cross-env PROJECT_DIR='${dir}' CATALOG_DIR='${core}' ENABLE_EMBED=${canEmbedPages} EVENTCATALOG_STARTER=${isEventCatalogStarter} EVENTCATALOG_SCALE=${isEventCatalogScale} npx astro preview ${command.args.join(' ').trim()}`,
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
    logger.welcome();
    logger.info('Starting preview of your build...', 'preview');

    // Load any .env file in the project directory
    if (fs.existsSync(path.join(dir, '.env'))) {
      dotenv.config({ path: path.join(dir, '.env') });
    }

    const canEmbedPages = await isFeatureEnabled(
      '@eventcatalog/backstage-plugin-eventcatalog',
      process.env.EVENTCATALOG_LICENSE_KEY_BACKSTAGE
    );
    const isEventCatalogStarter = await isEventCatalogStarterEnabled();
    const isEventCatalogScale = await isEventCatalogScaleEnabled();

    await copyServerFiles();

    // Create the auth.config.ts file if it doesn't exist
    await createAuthFileIfNotExists(isEventCatalogScale);

    previewCatalog({ command, canEmbedPages: canEmbedPages || isEventCatalogScale, isEventCatalogStarter, isEventCatalogScale });
  });

program
  .command('start')
  .description('Serves the contents of your eventcatalog build directory')
  .action(async (options, command: Command) => {
    logger.welcome();
    logger.info('Starting preview of your build...', 'preview');

    // Load any .env file in the project directory
    if (fs.existsSync(path.join(dir, '.env'))) {
      dotenv.config({ path: path.join(dir, '.env') });
    }

    const canEmbedPages = await isFeatureEnabled(
      '@eventcatalog/backstage-plugin-eventcatalog',
      process.env.EVENTCATALOG_LICENSE_KEY_BACKSTAGE
    );
    const isEventCatalogStarter = await isEventCatalogStarterEnabled();
    const isEventCatalogScale = await isEventCatalogScaleEnabled();

    await copyServerFiles();

    const isServerOutput = await isOutputServer();

    if (isServerOutput) {
      startServerCatalog({
        command,
        canEmbedPages: canEmbedPages || isEventCatalogScale,
        isEventCatalogStarter,
        isEventCatalogScale,
      });
    } else {
      previewCatalog({
        command,
        canEmbedPages: canEmbedPages || isEventCatalogScale,
        isEventCatalogStarter,
        isEventCatalogScale,
      });
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
