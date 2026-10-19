import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { CatalogResourceType, FitnessDiagnostic } from './types';

export const FITNESS_FILE_SUFFIX = '.fitness.ts';
export const FITNESS_DIRECTORY = 'fitness';

/** Folders that hold each type of resource. Resources can be nested in other resources (e.g. domains/Orders/services/...). */
const COLLECTION_TYPES: Record<string, CatalogResourceType> = {
  domains: 'domain',
  subdomains: 'domain',
  systems: 'system',
  services: 'service',
  agents: 'agent',
  events: 'event',
  commands: 'command',
  queries: 'query',
  flows: 'flow',
  channels: 'channel',
  entities: 'entity',
  containers: 'container',
  'data-products': 'data-product',
  adrs: 'adr',
  diagrams: 'diagram',
};

// Dot folders cover .git, .astro, .eventcatalog and .eventcatalog-core
const isIgnoredDirectory = (name: string) => name.startsWith('.') || name === 'node_modules' || name === 'dist';

// Federation writes other catalogs into federated/<source>/. Only the catalog's own fitness functions run: other
// catalogs' code is never run without the catalog choosing to (https://github.com/event-catalog/eventcatalog/issues/2977)
const FEDERATED_DIRECTORY = 'federated';

export type FitnessScope = {
  type: CatalogResourceType;
  id: string;
  /** Undefined for resources without a version */
  version?: string;
  /** The resource's index file */
  file: string;
};

export type FitnessFile = {
  /** Absolute path */
  path: string;
  /** Path relative to the catalog, with forward slashes */
  source: string;
  /** The resource the file sits alongside. Undefined for files in the root `fitness/` folder, or when it can't be resolved. */
  scope?: FitnessScope;
  /** Why the file's resource could not be resolved */
  scopeError?: string;
};

export type DiscoveryResult = {
  files: FitnessFile[];
  diagnostics: FitnessDiagnostic[];
};

const findFitnessFiles = (directory: string, found: string[] = [], isRoot = true): string[] => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (isIgnoredDirectory(entry.name) || (isRoot && entry.name === FEDERATED_DIRECTORY)) continue;
      findFitnessFiles(entryPath, found, false);
    } else if (entry.isFile() && entry.name.endsWith(FITNESS_FILE_SUFFIX)) {
      found.push(entryPath);
    }
  }
  return found;
};

const findIndexFile = (directory: string) =>
  ['index.mdx', 'index.md'].map((name) => path.join(directory, name)).find((file) => fs.existsSync(file));

/** The type of the resource in `segments`, from the nearest folder above it that holds resources (skipping `versioned/<version>`). */
const getResourceType = (segments: string[]): CatalogResourceType | undefined => {
  for (let index = segments.length - 2; index >= 0; index--) {
    const type = COLLECTION_TYPES[segments[index]];
    if (type) return type;
  }
};

const resolveScope = (catalogDir: string, resourceSegments: string[]): { scope?: FitnessScope; scopeError?: string } => {
  const resourceFolder = resourceSegments.join('/');
  const indexFile = findIndexFile(path.join(catalogDir, ...resourceSegments));
  if (!indexFile) {
    return { scopeError: `No resource found for this fitness function: '${resourceFolder}' has no index.mdx or index.md` };
  }

  const type = getResourceType(resourceSegments);
  if (!type) {
    return {
      scopeError: `No resource found for this fitness function: '${resourceFolder}' is not in a resource folder (such as domains/ or services/)`,
    };
  }

  let frontmatter: Record<string, unknown>;
  try {
    frontmatter = matter(fs.readFileSync(indexFile, 'utf8')).data;
  } catch (error) {
    return { scopeError: `Could not read '${path.relative(catalogDir, indexFile)}': ${(error as Error).message}` };
  }

  if (frontmatter.id === undefined || frontmatter.id === null || String(frontmatter.id).trim() === '') {
    return { scopeError: `No resource found for this fitness function: '${path.relative(catalogDir, indexFile)}' has no id` };
  }

  return {
    scope: {
      type,
      id: String(frontmatter.id),
      ...(frontmatter.version !== undefined && frontmatter.version !== null ? { version: String(frontmatter.version) } : {}),
      file: indexFile,
    },
  };
};

const byPath = (a: { source: string }, b: { source: string }) => (a.source < b.source ? -1 : a.source > b.source ? 1 : 0);

/**
 * Finds the catalog's fitness functions: `*.fitness.ts` files in the root `fitness/` folder, or in a `fitness/`
 * folder inside a resource's folder (which scopes them to that resource). Files are returned in path order.
 */
export const discoverFitnessFiles = (catalogDir: string): DiscoveryResult => {
  const root = path.resolve(catalogDir);
  const files: FitnessFile[] = [];
  const diagnostics: FitnessDiagnostic[] = [];

  for (const file of findFitnessFiles(root)) {
    const segments = path.relative(root, file).split(path.sep);
    const source = segments.join('/');
    // The fitness/ folders in the path, innermost first. Folders below the one that holds the function are just
    // organisation, and a resource can itself be named fitness (domains/fitness/fitness/...)
    const fitnessIndexes = segments
      .slice(0, -1)
      .flatMap((segment, index) => (segment === FITNESS_DIRECTORY ? [index] : []))
      .reverse();

    if (fitnessIndexes.length === 0) {
      diagnostics.push({
        source,
        message: `Not run: fitness functions must be in a ${FITNESS_DIRECTORY}/ folder, either at the root of the catalog or in a resource's folder`,
      });
      continue;
    }

    // The innermost fitness/ folder that sits in a resource's folder, or at the root of the catalog
    let resolved: Pick<FitnessFile, 'scope' | 'scopeError'> = {};
    for (const fitnessIndex of fitnessIndexes) {
      resolved = fitnessIndex === 0 ? {} : resolveScope(root, segments.slice(0, fitnessIndex));
      if (!resolved.scopeError) break;
    }

    // When none resolve, the error is about the outermost fitness/ folder: the one most likely meant to hold the function
    files.push({ path: file, source, ...resolved });
  }

  return { files: files.sort(byPath), diagnostics: diagnostics.sort(byPath) };
};
