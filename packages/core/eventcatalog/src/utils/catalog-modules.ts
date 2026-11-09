import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * The file:// URL of a file in the catalog. Node's ES module loader only takes URLs: on Windows an absolute path
 * (C:\catalog\eventcatalog.auth.js) reads as a URL with the scheme "c:", and the import fails.
 */
export const catalogModuleUrl = (file: string, directory = process.env.PROJECT_DIR || process.cwd()) =>
  pathToFileURL(join(directory, file)).href;

/**
 * Imports a module from the catalog (eventcatalog.auth.js, eventcatalog.chat.js, middleware.ts), at runtime rather
 * than bundled into the build, so the catalog's own file is the one that runs.
 */
export const importCatalogModule = (file: string, directory?: string) =>
  import(/* @vite-ignore */ catalogModuleUrl(file, directory));
