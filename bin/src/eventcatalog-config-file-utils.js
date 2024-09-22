import { readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'fs';
import path from 'node:path';
import { v4 as uuidV4 } from 'uuid';
import { pathToFileURL } from 'url';

// * Very strange behavior when importing ESM files from catalogs into core.
//  * Core (node) does not know how to handle ESM files, so we have to try and convert them.
//  *
//  * This needs sorting out! Sorry if you are reading this, but it unblocked me for now!
//  * @param {*} content
//  * @returns
//  */
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

export async function cleanup(projectDirectory) {
  const filePath = path.join(projectDirectory, 'eventcatalog.config.cjs');
  if (existsSync(filePath)) {
    await rm(filePath);
  }
}

export const getEventCatalogConfigFile = async (projectDirectory) => {
  try {
    const rawFile = await readFile(path.join(projectDirectory, 'eventcatalog.config.js'), 'utf8');

    // Have to conver the ESM to CJS...
    const configAsCommonJS = convertESMtoCJS(rawFile);

    await writeFile(path.join(projectDirectory, 'eventcatalog.config.cjs'), configAsCommonJS);

    const configFilePath = path.join(projectDirectory, 'eventcatalog.config.cjs');
    const configFileURL = pathToFileURL(configFilePath).href;
    const configAsCJS = await import(/* @vite-ignore */ configFileURL);

    //  Clean up?
    await writeFile(path.join(projectDirectory, 'eventcatalog.config.js'), rawFile);

    await cleanup(projectDirectory);

    return configAsCJS.default;
  } catch (error) {
    await cleanup(projectDirectory);
  }
};

export const writeEventCatalogConfigFile = async (projectDirectory, newConfig) => {
  try {
    const configFilePath = path.join(projectDirectory, 'eventcatalog.config.js');
    let content = await readFile(configFilePath, 'utf8');

    // Find the start of the config object
    const startIndex = content.indexOf('export default {');
    if (startIndex === -1) {
      // Just fail silently if the config object is not found
      return;
    }

    // Update or add each new config item
    Object.entries(newConfig).forEach(([key, value]) => {
      const valueString = JSON.stringify(value, null, 2).replace(/"/g, "'").replace(/\n/g, '\n  ');

      // Check if the key already exists
      const keyRegex = new RegExp(`(${key}\\s*:)([^,}]+)`, 'g');
      if (content.match(keyRegex)) {
        // Update existing key
        content = content.replace(keyRegex, `$1 ${valueString}`);
      } else {
        // Add new key-value pair
        const insertPosition = content.indexOf('{', startIndex) + 1;
        content = content.slice(0, insertPosition) + `\n  ${key}: ${valueString},` + content.slice(insertPosition);
      }
    });

    // Write the updated content back to the file
    await writeFile(configFilePath, content);

    await cleanup(projectDirectory);
  } catch (error) {
    await cleanup(projectDirectory);
  }
};

// Check the eventcatalog.config.js and add any missing required fields on it
export const verifyRequiredFieldsAreInCatalogConfigFile = async (projectDirectory) => {
  try {
    const config = await getEventCatalogConfigFile(projectDirectory);

    if (!config.cId) {
      await writeEventCatalogConfigFile(projectDirectory, { cId: uuidV4() });
    }
  } catch (error) {
    // fail silently, it's overly important
  }
};
