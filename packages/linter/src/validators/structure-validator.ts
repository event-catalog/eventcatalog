import fg from 'fast-glob';
import path from 'path';
import { CatalogFile } from '../scanner';
import { ValidationError } from '../types';
import { editDistance } from './unknown-field-validator';

/**
 * Detects markdown files that live under resource folders but match none of the
 * EventCatalog scan patterns. Both the linter and EventCatalog core silently ignore
 * such files, so a resource saved as `events/OrderCreated.mdx` instead of
 * `events/OrderCreated/index.mdx` simply never shows up in the catalog.
 *
 * Rule: `structure/unrecognised-file`
 */

export const UNRECOGNISED_FILE_RULE = 'structure/unrecognised-file';

/** Directory names that hold catalog resources. A file is only considered if one of these is in its path. */
export const RESOURCE_DIRECTORY_NAMES = [
  'domains',
  'subdomains',
  'systems',
  'services',
  'agents',
  'events',
  'commands',
  'queries',
  'channels',
  'flows',
  'entities',
  'containers',
  'data-products',
  'diagrams',
  'adrs',
  'users',
  'teams',
] as const;

/** Resource types stored as flat files (`users/john.mdx`) rather than folders. */
const FLAT_FILE_DIRECTORIES = new Set(['users', 'teams']);

/** Markdown that EventCatalog loads through non-resource collections, or never loads at all. */
const NON_RESOURCE_PATTERNS = [
  // Build artifacts / tooling
  '**/node_modules/**',
  '**/dist/**',
  '**/.astro/**',
  '**/.git/**',
  '**/.turbo/**',
  // Custom pages, changelogs and resource documentation
  '**/pages/*.{md,mdx}',
  '**/changelog.{md,mdx}',
  '**/docs/**',
  // Ubiquitous language dictionaries
  '**/ubiquitous-language.{md,mdx}',
];

const MARKDOWN_EXTENSIONS = /\.(md|mdx)$/i;

const isResourceDirectory = (segment: string): boolean => (RESOURCE_DIRECTORY_NAMES as readonly string[]).includes(segment);

/**
 * Finds a resource directory name that a folder was probably meant to be (`event`, `Services`, `comands`).
 * Deliberately stricter than the frontmatter key matcher: folder names are free-form, so only a
 * case-only difference or a single edit on a reasonably long name counts.
 */
export const suggestDirectoryName = (segment: string): string | undefined => {
  const lower = segment.toLowerCase();
  const caseMatch = RESOURCE_DIRECTORY_NAMES.find((name) => name === lower);
  if (caseMatch) return caseMatch;

  if (segment.length < 5) return undefined;

  const maxDistance = segment.length >= 8 ? 2 : 1;
  let best: { name: string; distance: number } | undefined;
  for (const name of RESOURCE_DIRECTORY_NAMES) {
    const distance = editDistance(lower, name);
    if (distance <= maxDistance && (!best || distance < best.distance)) {
      best = { name, distance };
    }
  }
  return best?.name;
};

const normalisePath = (filePath: string): string => filePath.replace(/\\/g, '/');

const isIndexFile = (fileName: string): boolean => /^index\.(md|mdx)$/i.test(fileName);

interface PathInfo {
  segments: string[];
  directories: string[];
  fileName: string;
  /** Index (in `segments`) of the last resource directory in the path */
  resourceDirIndex: number;
  resourceDir: string;
}

const describePath = (relativePath: string): PathInfo | undefined => {
  const segments = normalisePath(relativePath).split('/');
  const fileName = segments[segments.length - 1];
  const directories = segments.slice(0, -1);

  // Prefer an exact resource directory; fall back to a near-miss (`event/`, `Services/`)
  let resourceDirIndex = directories.map(isResourceDirectory).lastIndexOf(true);
  let resourceDir = resourceDirIndex === -1 ? undefined : directories[resourceDirIndex];

  if (resourceDirIndex === -1) {
    for (let i = directories.length - 1; i >= 0; i--) {
      const suggestion = suggestDirectoryName(directories[i]);
      if (suggestion) {
        resourceDirIndex = i;
        resourceDir = suggestion;
        break;
      }
    }
  }

  if (resourceDirIndex === -1 || !resourceDir) return undefined;

  return { segments, directories, fileName, resourceDirIndex, resourceDir };
};

/** Works out the most likely intended location for an unrecognised file. */
export const suggestLocation = (relativePath: string): string | undefined => {
  const info = describePath(relativePath);
  if (!info) return undefined;

  const { segments, directories, fileName, resourceDirIndex, resourceDir } = info;
  const afterResourceDir = directories.slice(resourceDirIndex + 1);
  const ext = path.extname(fileName);
  const baseName = path.basename(fileName, ext);

  // A directory that is a near-miss of a resource directory name: `event/`, `Services/`, `comands/`
  for (let i = 0; i < directories.length; i++) {
    const segment = directories[i];
    if (isResourceDirectory(segment)) continue;
    const suggestion = suggestDirectoryName(segment);
    if (suggestion) {
      const fixed = [...segments];
      fixed[i] = suggestion;
      return `Did you mean "${fixed.join('/')}"?`;
    }
  }

  // Users and teams are flat files: `users/john.mdx`, not `users/john/index.mdx`
  if (FLAT_FILE_DIRECTORIES.has(resourceDir)) {
    if (afterResourceDir.length > 0) {
      const id = isIndexFile(fileName) ? afterResourceDir[afterResourceDir.length - 1] : baseName;
      const prefix = directories.slice(0, resourceDirIndex + 1).join('/');
      return `${resourceDir} are flat files. Did you mean "${prefix}/${id}${ext || '.mdx'}"?`;
    }
    return undefined;
  }

  const prefix = directories.slice(0, resourceDirIndex + 1).join('/');

  // `events/OrderCreated.mdx` -> `events/OrderCreated/index.mdx`
  if (afterResourceDir.length === 0 && !isIndexFile(fileName)) {
    return `Did you mean "${prefix}/${baseName}/index${ext || '.mdx'}"?`;
  }

  // `events/index.mdx` -> resources need their own folder
  if (afterResourceDir.length === 0 && isIndexFile(fileName)) {
    return `Each resource needs its own folder, e.g. "${prefix}/<id>/index${ext || '.mdx'}".`;
  }

  // `events/OrderCreated/versioned/index.mdx` -> missing version folder
  if (afterResourceDir[afterResourceDir.length - 1] === 'versioned' && isIndexFile(fileName)) {
    return `Versioned resources need a version folder, e.g. "${directories.join('/')}/<version>/index${ext || '.mdx'}".`;
  }

  // `services/order-service/notes.mdx` -> only index files are loaded; extra docs belong in docs/
  if (!isIndexFile(fileName)) {
    return `Only index.md(x) files are loaded as resources. Additional documentation belongs in a "docs" folder, e.g. "${directories.join('/')}/docs/${fileName}".`;
  }

  return undefined;
};

export interface UnrecognisedFile {
  relativePath: string;
  suggestion?: string;
}

/**
 * Finds markdown files under resource directories that were not picked up by the scanner.
 * `recognisedFiles` should be the full (unfiltered) scanner output for `rootDir`.
 */
export const findUnrecognisedFiles = async (
  rootDir: string,
  recognisedFiles: Pick<CatalogFile, 'relativePath'>[]
): Promise<UnrecognisedFile[]> => {
  const recognised = new Set(recognisedFiles.map((file) => normalisePath(file.relativePath)));

  const candidates = await fg(['**/*.{md,mdx}'], {
    cwd: rootDir,
    onlyFiles: true,
    followSymbolicLinks: false,
    ignore: NON_RESOURCE_PATTERNS,
  });

  return candidates
    .map(normalisePath)
    .filter((relativePath) => MARKDOWN_EXTENSIONS.test(relativePath))
    .filter((relativePath) => !recognised.has(relativePath))
    .filter((relativePath) => describePath(relativePath) !== undefined)
    .sort()
    .map((relativePath) => ({ relativePath, suggestion: suggestLocation(relativePath) }));
};

export const toUnrecognisedFileError = (file: UnrecognisedFile): ValidationError => {
  const base = `File "${file.relativePath}" is not recognised as an EventCatalog resource and will be ignored`;
  return {
    type: 'structure',
    resource: 'unknown',
    message: file.suggestion ? `${base}. ${file.suggestion}` : `${base}.`,
    file: file.relativePath,
    severity: 'warning',
    rule: UNRECOGNISED_FILE_RULE,
  };
};

export const validateUnrecognisedFiles = async (
  rootDir: string,
  recognisedFiles: Pick<CatalogFile, 'relativePath'>[]
): Promise<ValidationError[]> => {
  const files = await findUnrecognisedFiles(rootDir, recognisedFiles);
  return files.map(toUnrecognisedFileError);
};
