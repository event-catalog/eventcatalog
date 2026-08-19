import fs from 'node:fs/promises';
import path from 'node:path';

export const isCustomComponentPath = (projectDirectory, filePath) => {
  const [rootDirectory, childDirectory] = path.relative(projectDirectory, filePath).split(path.sep);
  return rootDirectory === 'components' || (rootDirectory === 'federated' && childDirectory === 'components');
};

const readDirectory = async (directory) => {
  try {
    return await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
};

const mergeDirectory = async (sourceDirectory, destinationDirectory) => {
  for (const entry of await readDirectory(sourceDirectory)) {
    const sourcePath = path.join(sourceDirectory, entry.name);
    const destinationPath = path.join(destinationDirectory, entry.name);

    if (entry.isDirectory()) {
      const destinationEntry = await fs.stat(destinationPath).catch((error) => {
        if (error.code === 'ENOENT') return undefined;
        throw error;
      });
      if (destinationEntry && !destinationEntry.isDirectory()) {
        await fs.rm(destinationPath, { recursive: true, force: true });
      }
      await fs.mkdir(destinationPath, { recursive: true });
      await mergeDirectory(sourcePath, destinationPath);
      continue;
    }

    await fs.rm(destinationPath, { recursive: true, force: true });
    await fs.copyFile(sourcePath, destinationPath);
  }
};

/**
 * Builds the component directory consumed by the @catalog/components/* alias.
 * Federated components form the base layer and local catalog components always win.
 */
export const syncCustomComponents = async (projectDirectory, catalogDirectory) => {
  const destinationDirectory = path.join(catalogDirectory, 'src', 'custom-defined-components');
  const destinationParent = path.dirname(destinationDirectory);
  await fs.mkdir(destinationParent, { recursive: true });

  const stagingDirectory = await fs.mkdtemp(path.join(destinationParent, '.custom-defined-components.staging-'));

  try {
    await mergeDirectory(path.join(projectDirectory, 'federated', 'components'), stagingDirectory);
    await mergeDirectory(path.join(projectDirectory, 'components'), stagingDirectory);
    await fs.rm(destinationDirectory, { recursive: true, force: true });
    await fs.rename(stagingDirectory, destinationDirectory);
  } finally {
    await fs.rm(stagingDirectory, { recursive: true, force: true });
  }
};
