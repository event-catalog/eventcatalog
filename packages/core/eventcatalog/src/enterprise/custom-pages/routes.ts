/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/eventcatalog/src/enterprise/LICENSE
 */

import fs from 'node:fs';
import path from 'node:path';

export interface CustomPageRoute {
  /** Route pattern including the configured prefix, e.g. /custom/reports/[id] */
  pattern: string;
  /** File path relative to the custom pages directory */
  file: string;
  type: 'page' | 'endpoint';
}

export const DEFAULT_CUSTOM_PAGES_PREFIX = 'custom';

/**
 * Tracks the routable files during dev so route injection re-runs when files
 * are added or removed. Never a route itself.
 */
export const CUSTOM_PAGES_MANIFEST_FILENAME = '.routes-manifest.json';

const CUSTOM_PAGE_EXTENSIONS = /\.(astro|ts|js|mjs|json)$/i;

/**
 * Top-level route segments owned by EventCatalog. The custom pages prefix
 * cannot start with any of these — everything else is collision-free because
 * all user routes live under the prefix.
 */
const RESERVED_PREFIXES = [
  'api',
  'api-catalog',
  'architecture',
  'auth',
  'diagrams',
  'directory',
  'discover',
  'docs',
  'icepanel',
  'miro',
  'rss',
  'schemas',
  'settings',
  'studio',
  'unauthorized',
  'visualiser',
  '.well-known',
];

/**
 * Normalizes and validates the configured prefix (e.g. 'custom', 'internal/tools').
 * Throws when the prefix is empty, contains unsafe characters or shadows a core route.
 */
export const resolveCustomPagesPrefix = (prefix: string | undefined): string => {
  const normalized = (prefix ?? DEFAULT_CUSTOM_PAGES_PREFIX).replace(/^\/+|\/+$/g, '');

  if (normalized.length === 0) {
    throw new Error('[EventCatalog] pages.prefix cannot be empty.');
  }

  if (!/^[a-zA-Z0-9-_]+(\/[a-zA-Z0-9-_]+)*$/.test(normalized)) {
    throw new Error(
      `[EventCatalog] pages.prefix "${prefix}" is invalid. Use URL-safe characters (letters, numbers, - and _), optionally separated by "/".`
    );
  }

  const firstSegment = normalized.split('/')[0].toLowerCase();
  if (RESERVED_PREFIXES.includes(firstSegment)) {
    throw new Error(`[EventCatalog] pages.prefix "${prefix}" is reserved by EventCatalog. Choose a different prefix.`);
  }

  return normalized;
};

/**
 * Derives an Astro route pattern from a file path relative to the custom pages
 * directory. Dynamic segments ([id], [...slug]) pass through untouched.
 */
export const deriveRoutePattern = (relativeFilePath: string, prefix: string): string => {
  const withoutExtension = relativeFilePath.replace(CUSTOM_PAGE_EXTENSIONS, '');
  const segments = withoutExtension.split(/[\\/]/).filter(Boolean);

  if (segments[segments.length - 1] === 'index') {
    segments.pop();
  }

  return `/${[prefix, ...segments].join('/')}`;
};

const walkDirectory = (directory: string, relativeTo: string): string[] => {
  const files: string[] = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDirectory(fullPath, relativeTo));
    } else if (entry.isFile()) {
      files.push(path.relative(relativeTo, fullPath));
    }
  }

  return files;
};

/**
 * Lists the routable code files in the custom pages directory (sorted, relative paths).
 * Underscore-prefixed files and directories follow the Astro convention: they are
 * never routable (partials, helpers, colocated components).
 */
export const listCustomPageFiles = (customPagesDir: string): string[] => {
  if (!fs.existsSync(customPagesDir)) return [];

  return walkDirectory(customPagesDir, customPagesDir)
    .filter((file) => CUSTOM_PAGE_EXTENSIONS.test(file))
    .filter((file) => file !== CUSTOM_PAGES_MANIFEST_FILENAME)
    .filter((file) => !file.split(path.sep).some((segment) => segment.startsWith('_')))
    .sort();
};

/**
 * Reads the custom pages directory and returns the routes to inject.
 */
export const getCustomPageRoutes = (customPagesDir: string, prefix: string): CustomPageRoute[] => {
  const routes: CustomPageRoute[] = [];

  for (const file of listCustomPageFiles(customPagesDir)) {
    // pages/homepage.astro is the custom landing page, rendered by src/pages/index.astro
    if (file === 'homepage.astro') continue;

    routes.push({
      pattern: deriveRoutePattern(file, prefix),
      file,
      type: file.toLowerCase().endsWith('.astro') ? 'page' : 'endpoint',
    });
  }

  return routes;
};

export const isApiRoute = (route: CustomPageRoute): boolean => route.file.split(path.sep)[0] === 'api';
