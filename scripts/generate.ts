import path from 'node:path';
import type { Logger } from 'pino';
import { getEventCatalogConfigFile, cleanup } from './eventcatalog-config-file-utils.js';

function getDefaultExport(importedModule: any) {
  if (importedModule === null || typeof importedModule !== 'object') {
    throw new Error('Invalid module');
  }

  if (typeof importedModule.default === 'object' && importedModule.default !== null) {
    return importedModule.default.default || importedModule.default;
  }

  if (typeof importedModule.default !== 'undefined') {
    return importedModule.default;
  }

  return importedModule;
}

export const generate = async (PROJECT_DIRECTORY: string, ctx?: { logger?: Logger }) => {
  const logger = ctx?.logger;

  try {
    const config = await getEventCatalogConfigFile(PROJECT_DIRECTORY);

    const { generators = [] } = config;

    if (!generators.length) {
      logger?.info('No configured generators found, skipping generation');
      return;
    }

    for (const generator of generators) {
      let plugin = generator[0];
      const pluginConfig = generator[1];

      if (plugin.startsWith('./')) {
        plugin = path.join(PROJECT_DIRECTORY, plugin);
      }

      if (plugin.includes('<rootDir>')) {
        plugin = plugin.replace('<rootDir>', PROJECT_DIRECTORY);
      }

      try {
        const importedGenerator = await import(plugin);

        // TODO: Fix this...
        const generator = getDefaultExport(importedGenerator);

        await generator({ eventCatalogConfig: {} }, pluginConfig);

        // Use importedGenerator here
      } catch (error) {
        logger?.error(error, 'Error loading plugin');
        await cleanup(PROJECT_DIRECTORY);
        return;
      }
    }

    await cleanup(PROJECT_DIRECTORY);
  } catch (error) {
    // Failed to generate clean up...
    logger?.error(error);
    await cleanup(PROJECT_DIRECTORY);
  }
};
