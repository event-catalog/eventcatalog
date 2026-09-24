import { Command } from 'commander';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import http from 'node:http';
import fs from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { generate } from './generate';
import logBuild from './analytics/log-build';
import { VERSION } from './constants';
import { watch } from './watcher';
import { getEventCatalogConfigFile, verifyRequiredFieldsAreInCatalogConfigFile } from './eventcatalog-config-file-utils.js';
import resolveCatalogDependencies from './resolve-catalog-dependencies';
import boxen from 'boxen';
import { getProjectOutDir, isAuthEnabled, isIndexedSearchEnabled, isOutputServer } from './features';
import updateNotifier from 'update-notifier';
import dotenv from 'dotenv';
import { runMigrations } from './migrations';
import { logger } from './utils/cli-logger';
import { getLicenseStatus, printLicenseStatus } from './utils/license-status';
import { buildFieldsIndex } from '../eventcatalog/src/features/fields/field-indexer';
import { buildSearchIndex } from './search-indexer';
import { clearCatalogCache, hasLegacyCatalogRuntime, prepareCatalogRuntime } from './catalog-runtime';
import { getRuntimePaths } from '../eventcatalog/integrations/runtime-paths.mjs';
import { createAstroDevLineFilter, createAstroLineFilter } from './astro-output';
import { getAstroConfigPath } from './astro-config-path';
import {
  federateCatalog,
  FederationConflictError,
  FederationDiagnosticError,
  type FederationProgressEvent,
} from './federation/federate';
import { getFederationDiagnosticCounts, getVisibleFederationDiagnostics } from './federation/diagnostics';
import { getEventCatalogUpdateMessage, resolveInstalledCoreVersion } from './update-check';
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const astroCli = path.join(path.dirname(createRequire(import.meta.url).resolve('astro/package.json')), 'bin/astro.mjs');
const program = new Command().version(VERSION);

// The users dierctory
const dir = path.resolve(process.env.PROJECT_DIR || process.cwd());

// The project itself
const eventCatalogDir = path.resolve(join(currentDir, '../eventcatalog/'));
const astroConfigPath = () => getAstroConfigPath(dir, join(eventCatalogDir, 'astro.config.mjs'));

// Astro runs in the user's project. Only generated metadata lives in its cache.
const { runtimeDirectory: core } = getRuntimePaths(dir);

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

const resolveDevPort = async ({ projectDir }: { projectDir: string }): Promise<number> => {
  try {
    const config = await getEventCatalogConfigFile(projectDir);
    const fromConfig = Number(config?.port);
    if (Number.isFinite(fromConfig) && fromConfig > 0) return fromConfig;
  } catch (error) {
    // Ignore config-read errors and fall back to default
  }

  return 3000;
};

const startDevPrewarm = ({
  port = 3000,
  paths = ['/ping', '/'],
  retries = 80,
  intervalMs = 250,
  initialDelayMs = 500,
}: {
  port?: number;
  paths?: string[];
  retries?: number;
  intervalMs?: number;
  initialDelayMs?: number;
}) => {
  let attempt = 0;

  const hit = (requestPath: string) =>
    new Promise<boolean>((resolve) => {
      const req = http.get(
        {
          hostname: '127.0.0.1',
          port,
          path: requestPath,
          timeout: 1200,
        },
        (res) => {
          res.resume();
          resolve(true);
        }
      );

      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });

  const tick = async () => {
    attempt += 1;

    for (const requestPath of paths) {
      const ok = await hit(requestPath);
      if (ok) {
        return;
      }
    }

    if (attempt < retries) {
      setTimeout(tick, intervalMs);
    }
  };

  setTimeout(tick, initialDelayMs);
};

const buildDevSearchIndex = async ({ config }: { config: Awaited<ReturnType<typeof getEventCatalogConfigFile>> }) => {
  const result = await buildSearchIndex({
    projectDir: dir,
    outDir: path.join(core, 'public'),
    searchOutputPath: path.join(core, 'public', 'pagefind'),
    config,
    isServer: false,
  });

  logger.info(`Indexed ${result.records} page(s) into ${path.relative(core, result.outputPath)}`, 'search');
};

const warnIfIndexedSearchUsesAuth = async () => {
  if (!(await isAuthEnabled())) {
    return;
  }

  logger.info(
    'Indexed search creates client-readable search files. Make sure your deployment protects /pagefind assets if your catalog is private.',
    'search'
  );
};

const createDevSearchIndexWatcher = ({ config }: { config: Awaited<ReturnType<typeof getEventCatalogConfigFile>> }) => {
  let timeout: NodeJS.Timeout | undefined;
  let isBuilding = false;
  let queued = false;

  const run = async () => {
    if (isBuilding) {
      queued = true;
      return;
    }

    isBuilding = true;
    try {
      await buildDevSearchIndex({ config });
    } catch (err: any) {
      logger.info(`Failed to rebuild indexed search: ${err.message}`, 'search');
    } finally {
      isBuilding = false;
      if (queued) {
        queued = false;
        run();
      }
    }
  };

  return (_err: Error | null, events: { path: string; type: string }[]) => {
    if (!events.some((event) => event.path.endsWith('.md') || event.path.endsWith('.mdx'))) {
      return;
    }

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(run, 500);
  };
};

const replaceAstroReadyVersionLine = (line: string) => {
  const matches = line.match(/^(\s*)astro(\s+)v\S+(\s+ready.*)$/i);

  if (!matches) {
    return line;
  }

  return `${matches[1]}eventcatalog${matches[2]}v${VERSION}${matches[3]}`;
};

const runCommandWithFilteredOutput = async ({
  command,
  args = [],
  cwd,
  env,
  shouldFilterLine,
  transformLine = (line) => line,
}: {
  command: string;
  args?: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  shouldFilterLine: (line: string) => boolean;
  transformLine?: (line: string) => string;
}) => {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        ...env,
      },
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let stdoutBuffer = '';
    let stderrBuffer = '';

    const flush = (buffer: string, writer: NodeJS.WriteStream, isFinal = false) => {
      const lines = buffer.split('\n');
      const remaining = isFinal ? '' : (lines.pop() ?? '');

      for (const rawLine of lines) {
        const line = rawLine.replace(/\r/g, '');
        if (line.length === 0) {
          writer.write('\n');
          continue;
        }
        if (!shouldFilterLine(line)) {
          writer.write(`${transformLine(rawLine)}\n`);
        }
      }

      return remaining;
    };

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutBuffer += chunk.toString();
      stdoutBuffer = flush(stdoutBuffer, process.stdout);
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderrBuffer += chunk.toString();
      stderrBuffer = flush(stderrBuffer, process.stderr);
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      stdoutBuffer = flush(stdoutBuffer, process.stdout, true);
      stderrBuffer = flush(stderrBuffer, process.stderr, true);

      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Command failed with exit code ${code}: ${command} ${args.join(' ')}`));
    });
  });
};

const prepareCore = () => {
  if (hasLegacyCatalogRuntime(dir)) {
    logger.warning(
      'The .eventcatalog-core/ directory is no longer used. You can delete it once older EventCatalog processes have stopped.',
      'eventcatalog'
    );
  }

  prepareCatalogRuntime({
    projectDirectory: dir,
    catalogDirectory: core,
    packageDirectory: eventCatalogDir,
  });
};

const clearCore = () => {
  clearCatalogCache(dir);
};

const checkForUpdate = () => {
  const declaredVersion = getInstalledEventCatalogVersion();

  if (!declaredVersion) return;

  // Check if user is on version < 3 and notify about V3
  const majorVersion = parseInt(declaredVersion.replace(/[^0-9.]/g, '').split('.')[0], 10);
  if (majorVersion < 3) {
    const v3Message = `🚀 EventCatalog V3 is now available in beta!

You are currently on version ${declaredVersion}.
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

  // Compare the running package, not the catalog dependency specifier.
  // That specifier is often a range (`^4.10.0`), which is not an installed version.
  const installedVersion = resolveInstalledCoreVersion(VERSION, declaredVersion);
  if (!installedVersion) return;

  const pkg = { name: '@eventcatalog/core', version: installedVersion };
  const notifier = updateNotifier({ pkg, updateCheckInterval: 0 });
  const message = getEventCatalogUpdateMessage(installedVersion, notifier.update?.latest);

  if (message) {
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
  .option('--force-recreate', 'Clear and regenerate the entire .astro cache, including content and metadata', false)
  .option('--no-prewarm', 'Disable automatic dev prewarm request')
  .action(async (options, command: Command) => {
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

    // Verify required fields (e.g. cId) before preparing the runtime so that the config is stable when Astro starts.
    // Otherwise, writing the config after the server starts triggers a Vite config dependency
    // change restart, which races with the initial dependency scan and floods the terminal with errors.
    await verifyRequiredFieldsAreInCatalogConfigFile(dir);

    prepareCore();

    await resolveCatalogDependencies(dir, core);

    // Run any migrations for the catalog
    await runMigrations(dir);

    const config = await getEventCatalogConfigFile(dir);

    const license = await getLicenseStatus(dir);
    printLicenseStatus(license, config?.tsd);

    // Fire-and-forget so dev startup never waits on telemetry
    void logBuild(dir, { command: 'dev', license });

    // Build fields index if running in SSR mode
    if (isServer) {
      try {
        logger.info('Building fields index...', 'fields');
        const { warnings } = await buildFieldsIndex(dir, core);
        if (warnings.length > 0) {
          logger.info(`Fields index built with ${warnings.length} warning(s)`, 'fields');
        } else {
          logger.info('Fields index built successfully', 'fields');
        }
      } catch (err: any) {
        logger.info(`Failed to build fields index: ${err.message}`, 'fields');
      }
    }

    const shouldBuildIndexedSearch = await isIndexedSearchEnabled();
    if (shouldBuildIndexedSearch) {
      await warnIfIndexedSearchUsesAuth();

      logger.info('Building indexed search for local development...', 'search');
      await buildDevSearchIndex({ config });
    }

    // is there an eventcatalog update to install?
    checkForUpdate();

    let watchUnsub;
    try {
      if (shouldBuildIndexedSearch) {
        watchUnsub = await watch(dir, core, createDevSearchIndexWatcher({ config }));
      }

      if (options.prewarm) {
        const prewarmPort = await resolveDevPort({
          projectDir: dir,
        });

        startDevPrewarm({
          port: prewarmPort,
          paths: ['/ping', '/'],
        });
      }

      await runCommandWithFilteredOutput({
        command: process.execPath,
        args: [astroCli, 'dev', '--config', astroConfigPath(), ...command.args],
        cwd: dir,
        env: {
          PROJECT_DIR: dir,
          CATALOG_DIR: core,
          EVENTCATALOG_DEV_MODE: 'true',
          IGNORE_BUILD_ARTIFACTS: 'true',
          NODE_NO_WARNINGS: '1',
        },
        shouldFilterLine: createAstroDevLineFilter(),
        transformLine: replaceAstroReadyVersionLine,
      });
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

    // Verify required fields (e.g. cId) before preparing the runtime
    await verifyRequiredFieldsAreInCatalogConfigFile(dir);

    const config = await getEventCatalogConfigFile(dir);
    const license = await getLicenseStatus(dir);
    printLicenseStatus(license, config?.tsd);

    prepareCore();

    await logBuild(dir, { command: 'build', license });

    await resolveCatalogDependencies(dir, core);

    // Run any migrations for the catalog
    await runMigrations(dir);

    // Build fields index if running in SSR mode
    if (isServer) {
      try {
        logger.info('Building fields index...', 'fields');
        const { warnings } = await buildFieldsIndex(dir, core);
        if (warnings.length > 0) {
          logger.info(`Fields index built with ${warnings.length} warning(s)`, 'fields');
        } else {
          logger.info('Fields index built successfully', 'fields');
        }
      } catch (err: any) {
        logger.info(`Failed to build fields index: ${err.message}`, 'fields');
      }
    }

    checkForUpdate();

    await runCommandWithFilteredOutput({
      command: process.execPath,
      args: [astroCli, 'build', '--config', astroConfigPath(), ...command.args],
      cwd: dir,
      env: {
        PROJECT_DIR: dir,
        CATALOG_DIR: core,
        IGNORE_BUILD_ARTIFACTS: 'true',
      },
      shouldFilterLine: createAstroLineFilter(),
    });

    if (await isIndexedSearchEnabled()) {
      await warnIfIndexedSearchUsesAuth();

      const outDir = path.resolve(dir, await getProjectOutDir());

      logger.info('Building indexed search...', 'search');
      const result = await buildSearchIndex({
        projectDir: dir,
        outDir,
        config,
        isServer,
      });
      logger.info(`Indexed ${result.records} page(s) into ${path.relative(dir, result.outputPath)}`, 'search');
    }
  });

const previewCatalog = async ({ command }: { command: Command }) => {
  await runCommandWithFilteredOutput({
    command: process.execPath,
    args: [astroCli, 'preview', '--config', astroConfigPath(), ...command.args],
    cwd: dir,
    env: {
      PROJECT_DIR: dir,
      CATALOG_DIR: core,
    },
    shouldFilterLine: createAstroLineFilter(),
  });
};

const startServerCatalog = async () => {
  const serverEntryPath = path.join(dir, 'dist', 'server', 'entry.mjs');
  await runCommandWithFilteredOutput({
    command: process.execPath,
    args: [serverEntryPath],
    cwd: dir,
    env: {
      PROJECT_DIR: dir,
      CATALOG_DIR: core,
    },
    shouldFilterLine: createAstroLineFilter(),
  });
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

    await previewCatalog({ command });
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

    const isServerOutput = await isOutputServer();

    if (isServerOutput) {
      await startServerCatalog();
    } else {
      await previewCatalog({ command });
    }
  });

program
  .command('export')
  .description('Export your EventCatalog using the SDK dumpCatalog function')
  .option('--include-markdown', 'Include markdown content in the export', false)
  .action(async (options) => {
    logger.welcome();
    logger.info('Exporting EventCatalog...', 'export');

    // Load any .env file in the project directory
    if (fs.existsSync(path.join(dir, '.env'))) {
      dotenv.config({ path: path.join(dir, '.env') });
    }

    const { default: initSDK } = await import('@eventcatalog/sdk');
    const sdk = initSDK(dir);

    const catalog = await sdk.dumpCatalog({ includeMarkdown: options.includeMarkdown });

    const exportsDir = path.join(dir, 'exports');
    ensureDir(exportsDir);

    const date = new Date().toISOString().split('T')[0];
    const exportFile = path.join(exportsDir, `catalog-${date}.json`);

    fs.writeFileSync(exportFile, JSON.stringify(catalog, null, 2), 'utf-8');

    logger.info(`Catalog exported to ${exportFile}`, 'export');
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

const reportFederationProgress = (event: FederationProgressEvent, verbose = false) => {
  switch (event.type) {
    case 'configured':
      if (event.sources > 0)
        logger.info(`Found ${event.sources} configured source${event.sources === 1 ? '' : 's'}`, 'federation');
      return;
    case 'cleanup:complete':
      logger.success(
        `No sources configured; removed previous federation output${
          event.publicFiles > 0 ? ` and ${event.publicFiles} managed public file${event.publicFiles === 1 ? '' : 's'}` : ''
        }.`,
        'federation'
      );
      return;
    case 'cache:disabled':
      logger.info('Content cache disabled; all federated files will be downloaded.', 'federation');
      return;
    case 'source:start':
      logger.info(`[${event.current}/${event.total}] Fetching and indexing ${event.source.id}...`, 'federation');
      return;
    case 'source:complete':
      logger.success(
        `[${event.current}/${event.total}] ${event.source.id}: ${event.resources} resources at ${event.commit.slice(0, 7)}${
          event.generated ? ' (index generated)' : ' (published index)'
        }`,
        'federation'
      );
      return;
    case 'local:start':
      logger.info('Indexing central catalog ownership...', 'federation');
      return;
    case 'local:complete':
      logger.success(
        `Central catalog: ${event.resources} local resource${event.resources === 1 ? '' : 's'} found (excluding federated/)`,
        'federation'
      );
      return;
    case 'resolving':
      logger.info(
        `Validating ownership across ${event.localResources} local resource${event.localResources === 1 ? '' : 's'} and ${event.resources} remote resource${event.resources === 1 ? '' : 's'}...`,
        'federation'
      );
      return;
    case 'resolved':
      const counts = getFederationDiagnosticCounts(event.diagnostics);
      const showDiagnosticDetails = verbose || counts.errors > 0;

      if (counts.errors === 0) {
        logger.success(
          `Graph resolved: ${event.graph.entities.length} remote resources, ${event.graph.edges.length} relationships`,
          'federation'
        );
      }

      if (counts.errors + counts.warnings === 0) return;

      if (showDiagnosticDetails) {
        const diagnostics = getVisibleFederationDiagnostics(event.diagnostics, verbose);

        logger.info('Federation diagnostics', 'federation');
        logger.line();
        for (const diagnostic of diagnostics) {
          logger.diagnostic(diagnostic.severity, diagnostic.message, diagnostic.rule, diagnostic.attributes);
          logger.line();
        }
        logger.diagnosticSummary(counts.errors, counts.warnings);
      } else {
        logger.warning(
          `${counts.warnings} problem${counts.warnings === 1 ? '' : 's'} (0 errors, ${counts.warnings} warning${counts.warnings === 1 ? '' : 's'})`,
          'federation'
        );
      }

      if (!verbose && counts.warnings > 0) {
        logger.info('Run with --verbose to see warning details.', 'federation');
      }
      return;
    case 'hydrating':
      logger.info(`Hydrating federated content into ${path.relative(dir, event.outDir)}/...`, 'federation');
      return;
    case 'hydrate:cache':
      if (event.files === 1 || event.files % 25 === 0) {
        logger.info(`Reused ${event.files} cached file${event.files === 1 ? '' : 's'}...`, 'federation');
      }
      return;
    case 'hydrate:file':
      if (event.files === 1 || event.files % 25 === 0) {
        logger.info(`Fetched ${event.files} federated file${event.files === 1 ? '' : 's'}...`, 'federation');
      }
      return;
    case 'public:complete':
      logger.success(
        `Public assets: ${event.result.copied} copied, ${event.result.skipped} preserved from the main catalog, ${event.result.removed} stale removed`,
        'federation'
      );
      return;
    case 'complete':
      logger.success(
        `Federation complete: ${event.result.sources} sources, ${event.result.resources} remote resources, ${event.result.hydrate.written} files written (${event.result.hydrate.fetched} downloaded, ${event.result.hydrate.written - event.result.hydrate.fetched} cached)`,
        'federation'
      );
      logger.info(`Recorded resolved source state in ${path.relative(dir, event.result.lockPath)}`, 'federation');
  }
};

program
  .command('federate')
  .description('Fetch, resolve, and hydrate the catalogs configured in federation.sources.')
  .option('--no-cache', 'Download all federation content and refresh the cache.')
  .option('-v, --verbose', 'Show detailed federation diagnostics.')
  .action(async (commandOptions: { cache: boolean; verbose: boolean }) => {
    logger.welcome();

    if (fs.existsSync(path.join(dir, '.env'))) {
      dotenv.config({ path: path.join(dir, '.env') });
    }

    logger.info('Starting federation...', 'federation');
    let cleanedPreviousOutput = false;
    const result = await federateCatalog(dir, {
      useCache: commandOptions.cache,
      onProgress: (event) => {
        if (event.type === 'cleanup:complete') cleanedPreviousOutput = true;
        reportFederationProgress(event, commandOptions.verbose);
      },
    });
    if (!result && !cleanedPreviousOutput) logger.warning('No federation sources configured; nothing to do.', 'federation');
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
    if (!(err instanceof FederationConflictError) && !(err instanceof FederationDiagnosticError)) console.error(err);
    process.exit(1);
  });
