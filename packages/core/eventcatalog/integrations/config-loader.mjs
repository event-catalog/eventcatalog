import { readFile, rm, copyFile, mkdtemp, symlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

export async function cleanup(projectDirectory) {
  const filePath = path.join(projectDirectory, 'eventcatalog.config.mjs');
  if (existsSync(filePath)) {
    await rm(filePath);
  }
}

const findNodeModulesDirectory = (directory) => {
  let currentDirectory = directory;

  while (true) {
    const nodeModulesDirectory = path.join(currentDirectory, 'node_modules');

    if (existsSync(nodeModulesDirectory)) {
      return nodeModulesDirectory;
    }

    const parentDirectory = path.dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      return undefined;
    }

    currentDirectory = parentDirectory;
  }
};

const linkNodeModulesIntoTempDirectory = async ({ projectDirectory, tempDir }) => {
  const nodeModulesDirectory = findNodeModulesDirectory(projectDirectory);

  if (!nodeModulesDirectory) {
    return;
  }

  await symlink(nodeModulesDirectory, path.join(tempDir, 'node_modules'), 'dir');
};

const createTemporaryConfigDirectory = async (projectDirectory) => {
  const nodeModulesDirectory = findNodeModulesDirectory(projectDirectory);

  if (nodeModulesDirectory) {
    return mkdtemp(path.join(nodeModulesDirectory, '.eventcatalog-config-'));
  }

  const tempDir = await mkdtemp(path.join(tmpdir(), 'eventcatalog-config-'));
  await linkNodeModulesIntoTempDirectory({ projectDirectory, tempDir });
  return tempDir;
};

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
      tempDir = await createTemporaryConfigDirectory(projectDirectory);
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
