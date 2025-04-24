import path from 'node:path';
import { getEventCatalogConfigFile, cleanup } from './eventcatalog-config-file-utils.js';
import { createRequire } from 'node:module';

function getDefaultExport(importedModule) {
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

export const generate = async (PROJECT_DIRECTORY) => {
  try {
    const config = await getEventCatalogConfigFile(PROJECT_DIRECTORY);

    const { generators = [] } = config;

    if (!generators.length) {
      console.log('No configured generators found, skipping generation');
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
        // NOTE: We use the createRequire function to ensure that the generator is loaded from user's project directory.
        // Otherwise, the generator will be loaded from the core package directory (context) which won't work with pnpm
        // because pnpm doesn't hoist packages to the root node_modules directory like npm does.
        const require = createRequire(PROJECT_DIRECTORY);
        const importedGenerator = require(plugin);

        // TODO: Fix this...
        const generator = getDefaultExport(importedGenerator);

        await generator({ eventCatalogConfig: {} }, pluginConfig);

        // Use importedGenerator here
      } catch (error) {
        console.error('Error loading plugin:', error);
        await cleanup(PROJECT_DIRECTORY);
        return;
      }
    }

    await cleanup(PROJECT_DIRECTORY);
  } catch (error) {
    // Failed to generate clean up...
    console.error(error);
    await cleanup(PROJECT_DIRECTORY);
  }
};
