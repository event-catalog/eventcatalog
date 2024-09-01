import { readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';

/**
 * Very strange behaviour when importing ESM files from catalogs into core.
 * Core (node) does not know how to handle ESM files, so we have to try and convert them.
 *
 * This needs sorting out! Sorry if you are reading this, but it unblocked me for now!
 * @param {*} content
 * @returns
 */
function convertESMtoCJS(content) {
  // Replace import statements with require
  content = content.replace(/import\s+([a-zA-Z0-9{},\s*]+)\s+from\s+['"]([^'"]+)['"];/g, (match, imports, modulePath) => {
    return `const ${imports.trim()} = require('${modulePath}');`;
  });

  // Replace export default with module.exports
  content = content.replace(/export\s+default\s+/g, 'module.exports = ');

  // Replace named exports with module.exports
  content = content.replace(/export\s+{([^}]+)}/g, (match, exports) => {
    return `module.exports = {${exports.trim()}};`;
  });

  // Remove declarations of __filename and __dirname
  content = content.replace(/^\s*(const|let|var)\s+__(filename|dirname)\s+=\s+.*;?\s*$/gm, '');

  return content;
}

// TODO: Do we actually need this? Can we clean this up
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

async function cleanup() {
  await rm(path.join(process.env.PROJECT_DIR, 'eventcatalog.config.cjs'));
}

const generate = async () => {
  try {
    // Fix for the file
    const rawFile = await readFile(path.join(process.env.PROJECT_DIR, 'eventcatalog.config.js'), 'utf8');

    // Have to conver the ESM to CJS...
    const configAsCommonJS = convertESMtoCJS(rawFile);
    await writeFile(path.join(process.env.PROJECT_DIR, 'eventcatalog.config.cjs'), configAsCommonJS);

    const configAsCJS = await import(path.join(process.env.PROJECT_DIR, 'eventcatalog.config.cjs'));
    const config = configAsCJS.default;

    const { generators = [] } = config;

    if (!generators.length) {
      console.log('No configured generators found, skipping generation');
      return;
    }

    // Tidy up
    await writeFile(path.join(process.env.PROJECT_DIR, 'eventcatalog.config.js'), rawFile);

    for (const generator of generators) {
      let plugin = generator[0];
      const pluginConfig = generator[1];

      if (plugin.startsWith('./')) {
        plugin = path.join(process.env.PROJECT_DIR, plugin);
      }

      if (plugin.includes('<rootDir>')) {
        plugin = plugin.replace('<rootDir>', process.env.PROJECT_DIR);
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
  } catch (error) {
    // Failed to generate clean up...
    console.error(error);
    await cleanup();
  }
};

generate();
