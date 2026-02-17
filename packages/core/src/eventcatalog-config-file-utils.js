import { readFile, writeFile, rm, copyFile, mkdtemp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { v4 as uuidV4 } from 'uuid';
import { pathToFileURL } from 'url';
import { tmpdir } from 'node:os';
import matter from 'gray-matter';

export async function cleanup(projectDirectory) {
  const filePath = path.join(projectDirectory, 'eventcatalog.config.mjs');
  if (existsSync(filePath)) {
    await rm(filePath);
  }
}

export const getEventCatalogConfigFile = async (projectDirectory) => {
  let tempDir;

  try {
    let configFilePath = path.join(projectDirectory, 'eventcatalog.config.js');

    const filePath = path.join(projectDirectory, 'package.json');
    const packageJson = JSON.parse(await readFile(filePath, 'utf-8'));

    if (packageJson?.type !== 'module') {
      // Importing CommonJS config via ESM import requires an .mjs file.
      // Keep this temp copy outside the project directory so Astro/Vite
      // file watchers do not trigger a dev-server restart during startup.
      tempDir = await mkdtemp(path.join(tmpdir(), 'eventcatalog-config-'));
      configFilePath = path.join(tempDir, 'eventcatalog.config.mjs');
      await copyFile(path.join(projectDirectory, 'eventcatalog.config.js'), configFilePath);
    }

    const configFileURL = `${pathToFileURL(configFilePath).href}?t=${Date.now()}`;
    const config = await import(/* @vite-ignore */ configFileURL);

    return config.default;
  } finally {
    await cleanup(projectDirectory);

    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
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
