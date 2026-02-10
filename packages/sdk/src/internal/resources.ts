import { dirname, join } from 'path';
import { copyDir, findFileById, getFiles, searchFilesForId, versionExists } from './utils';
import matter from 'gray-matter';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import { Message, Service, CustomDoc } from '../types';
import { satisfies } from 'semver';
import { lock, unlock } from 'proper-lockfile';
import { basename } from 'node:path';
import path from 'node:path';

type Resource = Service | Message | CustomDoc;

export const versionResource = async (catalogDir: string, id: string) => {
  // Find all the events in the directory
  const files = await getFiles(`${catalogDir}/**/index.{md,mdx}`);
  const matchedFiles = await searchFilesForId(files, id);

  if (matchedFiles.length === 0) {
    throw new Error(`No resource found with id: ${id}`);
  }

  // Event that is in the route of the project
  const file = matchedFiles[0];
  // Handle both forward and back slashes for cross-platform compatibility (Windows uses \, Unix uses /)
  const sourceDirectory = dirname(file).replace(/[/\\]versioned[/\\][^/\\]+[/\\]/, path.sep);
  const { data: { version = '0.0.1' } = {} } = matter.read(file);
  const targetDirectory = getVersionedDirectory(sourceDirectory, version);

  fsSync.mkdirSync(targetDirectory, { recursive: true });

  const ignoreListToCopy = ['events', 'commands', 'queries', 'versioned'];

  // Copy the event to the versioned directory
  await copyDir(catalogDir, sourceDirectory, targetDirectory, (src) => {
    // get the folder name
    const folderName = basename(src);

    if (ignoreListToCopy.includes(folderName)) {
      return false;
    }
    return true;
  });

  // Remove all the files in the root of the resource as they have now been versioned
  await fs.readdir(sourceDirectory).then(async (resourceFiles) => {
    await Promise.all(
      resourceFiles.map(async (file) => {
        // Dont remove anything in the ignore list
        if (ignoreListToCopy.includes(file)) {
          return;
        }
        if (file !== 'versioned') {
          fsSync.rmSync(join(sourceDirectory, file), { recursive: true });
        }
      })
    );
  });
};

export const writeResource = async (
  catalogDir: string,
  resource: Resource,
  options: { path?: string; type: string; override?: boolean; versionExistingContent?: boolean; format?: 'md' | 'mdx' } = {
    path: '',
    type: '',
    override: false,
    versionExistingContent: false,
    format: 'mdx',
  }
) => {
  const path = options.path || `/${resource.id}`;
  const fullPath = join(catalogDir, path);
  const format = options.format || 'mdx';

  // Create directory if it doesn't exist
  fsSync.mkdirSync(fullPath, { recursive: true });

  // Create or get lock file path
  const lockPath = join(fullPath, `index.${format}`);

  // Ensure the file exists before attempting to lock it
  if (!fsSync.existsSync(lockPath)) {
    fsSync.writeFileSync(lockPath, '');
  }

  try {
    // Acquire lock with retry
    await lock(lockPath, {
      retries: 5,
      stale: 10000, // 10 seconds
    });

    const exists = await versionExists(catalogDir, resource.id, resource.version);

    if (exists && !options.override) {
      throw new Error(`Failed to write ${resource.id} (${options.type}) as the version ${resource.version} already exists`);
    }

    const { markdown, ...frontmatter } = resource;

    if (options.versionExistingContent && !exists) {
      const currentResource = await getResource(catalogDir, resource.id);

      if (currentResource) {
        if (satisfies(resource.version, `>${currentResource.version}`)) {
          await versionResource(catalogDir, resource.id);
        } else {
          throw new Error(`New version ${resource.version} is not greater than current version ${currentResource.version}`);
        }
      }
    }

    const document = matter.stringify(markdown.trim(), frontmatter);
    fsSync.writeFileSync(lockPath, document);
  } finally {
    // Always release the lock
    await unlock(lockPath).catch(() => {});
  }
};

export const getResource = async (
  catalogDir: string,
  id?: string,
  version?: string,
  options?: { type: string; attachSchema?: boolean },
  filePath?: string
): Promise<Resource | undefined> => {
  const attachSchema = options?.attachSchema || false;
  const file = filePath || (id ? await findFileById(catalogDir, id, version) : undefined);
  if (!file || !fsSync.existsSync(file)) return;

  const { data, content } = matter.read(file);

  if (attachSchema && data?.schemaPath) {
    const resourceDirectory = dirname(file);
    const pathToSchema = join(resourceDirectory, data.schemaPath);
    if (fsSync.existsSync(pathToSchema)) {
      const schema = fsSync.readFileSync(pathToSchema, 'utf8');
      // Try to parse the schema
      try {
        data.schema = JSON.parse(schema);
      } catch (error) {
        data.schema = schema;
      }
    }
  }

  return {
    ...data,
    markdown: content.trim(),
  } as Resource;
};

export const getResourcePath = async (catalogDir: string, id: string, version?: string) => {
  const file = await findFileById(catalogDir, id, version);
  if (!file) return;

  return {
    fullPath: file,
    relativePath: file.replace(catalogDir, ''),
    directory: dirname(file.replace(catalogDir, '')),
  };
};

export const getResourceFolderName = async (catalogDir: string, id: string, version?: string) => {
  const paths = await getResourcePath(catalogDir, id, version);
  if (!paths) return;
  return paths?.directory.split(path.sep).filter(Boolean).pop();
};

export const toResource = async (catalogDir: string, rawContents: string) => {
  const { data, content } = matter(rawContents);
  return {
    ...data,
    markdown: content.trim(),
  } as Resource;
};

export const getResources = async (
  catalogDir: string,
  {
    type,
    latestOnly = false,
    ignore = [],
    pattern = '',
    attachSchema = false,
  }: { type: string; pattern?: string; latestOnly?: boolean; ignore?: string[]; attachSchema?: boolean }
): Promise<Resource[] | undefined> => {
  const ignoreList = latestOnly ? `**/versioned/**` : '';
  const filePattern = pattern || `${catalogDir}/**/${type}/**/index.{md,mdx}`;
  const files = await getFiles(filePattern, [ignoreList, ...ignore]);

  if (files.length === 0) return;

  return files.map((file) => {
    const { data, content } = matter.read(file);

    // Attach the schema if the attachSchema option is set to true
    if (attachSchema && data?.schemaPath) {
      const resourceDirectory = dirname(file);
      const pathToSchema = join(resourceDirectory, data.schemaPath);
      if (fsSync.existsSync(pathToSchema)) {
        const schema = fsSync.readFileSync(pathToSchema, 'utf8');
        // Try to parse the schema
        try {
          data.schema = JSON.parse(schema);
        } catch (error) {
          data.schema = schema;
        }
      }
    }
    return {
      ...data,
      markdown: content.trim(),
    } as Resource;
  });
};

export const rmResourceById = async (
  catalogDir: string,
  id: string,
  version?: string,
  options?: { type: string; persistFiles?: boolean }
) => {
  const files = await getFiles(`${catalogDir}/**/index.{md,mdx}`);

  const matchedFiles = await searchFilesForId(files, id, version);

  if (matchedFiles.length === 0) {
    throw new Error(`No ${options?.type || 'resource'} found with id: ${id}`);
  }

  if (options?.persistFiles) {
    await Promise.all(
      matchedFiles.map(async (file) => {
        await fs.rm(file, { recursive: true });
        // Verify file is actually removed
        await waitForFileRemoval(file);
      })
    );
  } else {
    await Promise.all(
      matchedFiles.map(async (file) => {
        const directory = dirname(file);
        await fs.rm(directory, { recursive: true, force: true });
        // Verify directory is actually removed
        await waitForFileRemoval(directory);
      })
    );
  }
};

// Helper function to ensure file/directory is completely removed
const waitForFileRemoval = async (path: string, maxRetries: number = 50, delay: number = 10): Promise<void> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await fs.access(path);
      // If access succeeds, file still exists, wait and retry
      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (error) {
      // If access fails, file is removed
      return;
    }
  }
  // If we reach here, file still exists after all retries
  throw new Error(`File/directory ${path} was not removed after ${maxRetries} attempts`);
};

export const addFileToResource = async (
  catalogDir: string,
  id: string,
  file: { content: string; fileName: string },
  version?: string,
  options?: { path?: string }
) => {
  let pathToResource: string | undefined;

  if (options?.path) {
    pathToResource = join(catalogDir, options.path, 'index.mdx');
  } else {
    // Fall back to global lookup (existing behavior)
    pathToResource = await findFileById(catalogDir, id, version);
  }

  if (!pathToResource) throw new Error('Cannot find directory to write file to');

  // Create the directory if it doesn't exist
  fsSync.mkdirSync(path.dirname(pathToResource), { recursive: true });

  let fileContent = file.content.trim();

  try {
    const json = JSON.parse(fileContent);
    fileContent = JSON.stringify(json, null, 2);
  } catch (error) {
    // Just silently fail if the file is not valid JSON
    // Write it as it is
  }

  fsSync.writeFileSync(join(dirname(pathToResource), file.fileName), fileContent);
};

export const getFileFromResource = async (catalogDir: string, id: string, file: { fileName: string }, version?: string) => {
  const pathToResource = await findFileById(catalogDir, id, version);

  if (!pathToResource) throw new Error('Cannot find directory of resource');

  const exists = await fs
    .access(join(dirname(pathToResource), file.fileName))
    .then(() => true)
    .catch(() => false);
  if (!exists) throw new Error(`File ${file.fileName} does not exist in resource ${id} v(${version})`);

  return fsSync.readFileSync(join(dirname(pathToResource), file.fileName), 'utf-8');
};
export const getVersionedDirectory = (sourceDirectory: string, version: any): string => {
  return join(sourceDirectory, 'versioned', version);
};

export const isLatestVersion = async (catalogDir: string, id: string, version?: string) => {
  const resource = await getResource(catalogDir, id, version);
  if (!resource) return false;

  const pathToResource = await getResourcePath(catalogDir, id, version);

  return !pathToResource?.relativePath.replace(/\\/g, '/').includes('/versioned/');
};
