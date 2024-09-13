import path from 'node:path';
import { getEventCatalogConfigFile, cleanup } from './eventcatalog-config-file-utils.js';

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

const generate = async () => {
  try {
    const PROJECT_DIRECTORY = process.env.PROJECT_DIR;

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
        const importedGenerator = await import(plugin);

        // TODO: Fix this...
        const generator = getDefaultExport(importedGenerator);

        await generator({ eventCatalogConfig: {} }, pluginConfig);

        // Use importedGenerator here
      } catch (error) {
        console.error('Error loading plugin:', error);
        await cleanup();
        return;
      }
    }

    await cleanup();
  } catch (error) {
    // Failed to generate clean up...
    console.error(error);
    await cleanup();
  }
};

generate();
