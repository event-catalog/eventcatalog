import fs from 'fs';
import path from 'path';
import { isSSR } from '@utils/feature';

/**
 * Get the absolute base path for a resource item.
 *
 * In SSR mode, filePath is relative to the Astro core directory (e.g., "../examples/default/domains/...").
 * We need to resolve it using PROJECT_DIR to get the correct absolute path.
 *
 * In static mode, filePath is resolved correctly by Astro's build context.
 *
 * @param item - The resource item with a filePath property
 * @returns The absolute path to the directory containing the resource
 */
export function getResourceBasePath(item: { filePath?: string }): string {
  if (!item.filePath) {
    return '';
  }

  const filePath = item.filePath;

  // In SSR mode, we need to resolve the relative path using PROJECT_DIR
  if (isSSR()) {
    const PROJECT_DIR = process.env.PROJECT_DIR || '';

    if (PROJECT_DIR) {
      // Get the project folder name from PROJECT_DIR (e.g., "default" from ".../examples/default")
      const projectFolderName = path.basename(PROJECT_DIR);

      // Find the project folder in the relative path and extract everything after it
      // Pattern: ../examples/default/domains/... -> domains/...
      const regex = new RegExp(`.*?${projectFolderName}/(.+)$`);
      const match = filePath.match(regex);

      if (match && match[1]) {
        // Join PROJECT_DIR with the relative path within the project
        return path.join(PROJECT_DIR, path.dirname(match[1]));
      }
    }
  }

  // Static mode: resolve directly using Astro's build context
  return path.dirname(path.resolve(filePath));
}

/**
 * Get the absolute path to a file within a resource directory.
 *
 * @param item - The resource item with a filePath property
 * @param relativePath - The relative path to the file (e.g., "schema.json")
 * @returns The absolute path to the file
 */
export function getResourceFilePath(item: { filePath?: string }, relativePath: string): string {
  const basePath = getResourceBasePath(item);
  return path.join(basePath, relativePath);
}

/**
 * Check if a file exists within a resource directory.
 *
 * @param item - The resource item with a filePath property
 * @param relativePath - The relative path to the file (e.g., "schema.json")
 * @returns True if the file exists, false otherwise
 */
export function resourceFileExists(item: { filePath?: string }, relativePath: string): boolean {
  const filePath = getResourceFilePath(item, relativePath);
  return fs.existsSync(filePath);
}

/**
 * Read a file from a resource directory.
 *
 * @param item - The resource item with a filePath property
 * @param relativePath - The relative path to the file (e.g., "schema.json")
 * @returns The file content as a string, or null if the file doesn't exist
 */
export function readResourceFile(item: { filePath?: string }, relativePath: string): string | null {
  const filePath = getResourceFilePath(item, relativePath);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  return fs.readFileSync(filePath, 'utf-8');
}
