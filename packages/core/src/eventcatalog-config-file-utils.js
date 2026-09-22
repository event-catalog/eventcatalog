import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { v4 as uuidV4 } from 'uuid';
import matter from 'gray-matter';
import { cleanup, getEventCatalogConfigFile } from '../eventcatalog/integrations/config-loader.mjs';

export { cleanup, getEventCatalogConfigFile };

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
  } finally {
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

export function addPropertyToFrontMatter(input, newProperty, newValue) {
  const file = matter(input);

  return matter.stringify(file.content, { ...file.data, [newProperty]: newValue });
}
