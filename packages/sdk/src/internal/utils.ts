import { globSync } from 'glob';
import fsSync from 'node:fs';
import { copy, CopyFilterAsync, CopyFilterSync } from 'fs-extra';
import { join, dirname, normalize, sep as pathSeparator, resolve, basename, relative } from 'node:path';
import matter from 'gray-matter';
import { satisfies, validRange, valid } from 'semver';

// In-memory file index cache. Auto-built on first read, invalidated on writes.
interface FileIndexEntry {
  path: string;
  id: string;
  version: string;
  isVersioned: boolean;
}

let _fileIndexCache: Map<string, FileIndexEntry[]> | null = null;
let _fileIndexCatalogDir: string | null = null;
let _matterCache: Map<string, matter.GrayMatterFile<string>> | null = null;
// Tracks the creation time (birthtimeMs) of the catalog directory at last cache build.
// birthtimeMs only changes when the directory is deleted and recreated (e.g. test teardown),
// making it a reliable guard that avoids spurious rebuilds from nested write operations.
let _fileIndexDirBirthtimeMs: number = 0;

function buildFileCache(catalogDir: string): void {
  const files = globSync('**/index.{md,mdx}', {
    cwd: catalogDir,
    ignore: ['node_modules/**'],
    absolute: true,
    nodir: true,
  }).map(normalize);

  const index = new Map<string, FileIndexEntry[]>();
  const matterResults = new Map<string, matter.GrayMatterFile<string>>();

  for (const file of files) {
    const content = fsSync.readFileSync(file, 'utf-8');
    const parsed = matter(content);
    matterResults.set(file, parsed);

    const id = parsed.data.id;
    if (!id) continue;

    const version = parsed.data.version || '';
    const isVersioned = file.includes('versioned');
    const entry: FileIndexEntry = { path: file, id, version: String(version), isVersioned };

    const existing = index.get(id);
    if (existing) {
      existing.push(entry);
    } else {
      index.set(id, [entry]);
    }
  }

  _fileIndexCache = index;
  _fileIndexCatalogDir = catalogDir;
  _matterCache = matterResults;
  try {
    _fileIndexDirBirthtimeMs = fsSync.statSync(catalogDir).birthtimeMs;
  } catch {
    _fileIndexDirBirthtimeMs = 0;
  }
}

function ensureFileCache(catalogDir: string): void {
  if (!_fileIndexCache || _fileIndexCatalogDir !== catalogDir) {
    buildFileCache(catalogDir);
    return;
  }
  // Rebuild if the catalog directory was deleted and recreated (birthtimeMs changes on recreation).
  // Unlike mtimeMs, birthtimeMs is unaffected by nested file/directory writes, so it won't
  // trigger spurious rebuilds during normal catalog operations.
  try {
    const currentBirthtime = fsSync.statSync(catalogDir).birthtimeMs;
    if (currentBirthtime !== _fileIndexDirBirthtimeMs) {
      buildFileCache(catalogDir);
    }
  } catch {
    buildFileCache(catalogDir);
  }
}

/** Invalidate the file cache. Call after any write/rm/version operation. */
export function invalidateFileCache(): void {
  _fileIndexCache = null;
  _fileIndexCatalogDir = null;
  _matterCache = null;
}

/**
 * Optimistically add or update a resource entry in the in-memory cache after a write.
 * If the cache is not populated this is a no-op (it will be built lazily on the next read).
 */
export function upsertFileCacheEntry(
  filePath: string,
  parsed: matter.GrayMatterFile<string>,
  isVersioned: boolean
): void {
  if (!_fileIndexCache || !_matterCache) return;

  const id = parsed.data.id;
  if (!id) return;

  const version = String(parsed.data.version || '');
  const normalizedPath = normalize(filePath);

  // Update matter cache
  _matterCache.set(normalizedPath, parsed);

  // Update file index cache
  const entry: FileIndexEntry = { path: normalizedPath, id, version, isVersioned };
  const existing = _fileIndexCache.get(id);
  if (existing) {
    // Replace the entry for the same path, or add it
    const idx = existing.findIndex((e) => e.path === normalizedPath);
    if (idx !== -1) {
      existing[idx] = entry;
    } else {
      existing.push(entry);
    }
  } else {
    _fileIndexCache.set(id, [entry]);
  }
}

/**
 * Optimistically remove resource entries from the in-memory cache after a delete.
 * Removes all entries whose path matches one of the given file paths.
 */
export function removeFileCacheEntries(filePaths: string[]): void {
  if (!_fileIndexCache || !_matterCache) return;

  const normalizedPaths = new Set(filePaths.map(normalize));

  for (const path of normalizedPaths) {
    _matterCache.delete(path);
  }

  for (const [id, entries] of _fileIndexCache) {
    const filtered = entries.filter((e) => !normalizedPaths.has(e.path));
    if (filtered.length === 0) {
      _fileIndexCache.delete(id);
    } else if (filtered.length !== entries.length) {
      _fileIndexCache.set(id, filtered);
    }
  }
}

// Keep these as aliases for backwards compat with CLI export code
export const enableFileCache = buildFileCache;
export const disableFileCache = invalidateFileCache;

/**
 * Returns cached matter.read result if available, otherwise reads from disk.
 */
export function cachedMatterRead(filePath: string): matter.GrayMatterFile<string> {
  if (_matterCache) {
    const cached = _matterCache.get(filePath);
    if (cached) return cached;
  }
  return matter.read(filePath);
}

/**
 * Returns true if a given version of a resource id exists in the catalog
 */
export const versionExists = async (catalogDir: string, id: string, version: string) => {
  ensureFileCache(catalogDir);
  const entries = _fileIndexCache!.get(id);
  if (!entries) return false;
  return entries.some((e) => e.version === version);
};

export const findFileById = async (catalogDir: string, id: string, version?: string): Promise<string | undefined> => {
  ensureFileCache(catalogDir);

  const entries = _fileIndexCache!.get(id);
  if (!entries || entries.length === 0) return undefined;

  const latestEntry = entries.find((e) => !e.isVersioned);

  if (!version || version === 'latest') {
    return latestEntry?.path;
  }

  // Exact version match
  const exactMatch = entries.find((e) => e.version === version);
  if (exactMatch) return exactMatch.path;

  // Semver range match
  const semverRange = validRange(version);
  if (semverRange) {
    const match = entries.find((e) => {
      try {
        return satisfies(e.version, semverRange);
      } catch {
        return false;
      }
    });
    return match?.path;
  }

  return undefined;
};

/**
 * Converts a glob pattern to a RegExp. Handles `**`, `*`, `{a,b}` and `.` escaping.
 * Sufficient for the limited patterns used in getFiles.
 */
function globToRegex(pattern: string): RegExp {
  const normalized = pattern.replace(/\\/g, '/');
  const regexStr = normalized
    .replace(/[.+^${}()|[\]\\]/g, (ch) => {
      // Keep { } and handle them specially below; escape everything else
      if (ch === '{' || ch === '}') return ch;
      return `\\${ch}`;
    })
    .replace(/\{([^}]+)\}/g, (_, choices) => `(${choices.split(',').join('|')})`)
    .replace(/\*\*/g, '\u0000') // temp placeholder
    .replace(/\*/g, '[^/]*')
    .replace(/\u0000\//g, '(?:.+/)?') // **/ → optional nested path
    .replace(/\u0000/g, '.*'); // remaining ** (at end)
  return new RegExp(`^${regexStr}$`, 'i');
}

export const getFiles = async (pattern: string, ignore: string | string[] = '') => {
  // Fast path: if the file index cache is warm for this catalog dir, filter cached
  // paths by the pattern instead of performing an expensive glob on the file system.
  // Only applies when the pattern targets index.{md,mdx} files — the cache only
  // stores those files, so non-index patterns (e.g. teams/*.md) must fall through.
  if (_fileIndexCache && _matterCache && _fileIndexCatalogDir) {
    const normalizedCatalogDir = normalize(_fileIndexCatalogDir).replace(/\\/g, '/');
    const normalizedPattern = normalize(pattern).replace(/\\/g, '/');
    if (
      normalizedPattern.startsWith(normalizedCatalogDir) &&
      normalizedPattern.includes('index.{md,mdx}')
    ) {
      const ignoreList = (Array.isArray(ignore) ? ignore : [ignore]).filter(Boolean);
      const matchRegex = globToRegex(normalizedPattern);
      const ignoreRegexes = ignoreList.map((ig) => globToRegex(ig.replace(/\\/g, '/')));
      return Array.from(_matterCache.keys())
        .map((p) => p.replace(/\\/g, '/'))
        .filter((p) => matchRegex.test(p) && !ignoreRegexes.some((ig) => ig.test(p)))
        .map(normalize);
    }
  }

  try {
    // 1. Normalize the input pattern to handle mixed separators potentially
    const normalizedInputPattern = normalize(pattern);

    // 2. Determine the absolute base directory (cwd for glob)
    // Resolve ensures it's absolute. Handles cases with/without globstar.
    const absoluteBaseDir = resolve(
      normalizedInputPattern.includes('**') ? normalizedInputPattern.split('**')[0] : dirname(normalizedInputPattern)
    );

    // 3. Determine the pattern part relative to the absolute base directory
    // We extract the part of the normalized pattern that comes *after* the absoluteBaseDir
    let relativePattern = relative(absoluteBaseDir, normalizedInputPattern);

    // On Windows, relative() might return empty string if paths are identical,
    // or might need normalization if the original pattern didn't have `**`
    // Example: pattern = 'dir/file.md', absoluteBaseDir='.../dir', normalized='...\dir\file.md'
    // relative() -> 'file.md'
    // Example: pattern = 'dir/**/file.md', absoluteBaseDir='.../dir', normalized='...\dir\**\file.md'
    // relative() -> '**\file.md'
    // Convert separators in the relative pattern to forward slashes for glob
    relativePattern = relativePattern.replace(/\\/g, '/');

    const ignoreList = Array.isArray(ignore) ? ignore : [ignore];

    const files = globSync(relativePattern, {
      cwd: absoluteBaseDir,
      ignore: ['node_modules/**', ...ignoreList],
      absolute: true,
      nodir: true,
    });

    // 5. Normalize results for consistency before returning
    return files.map(normalize);
  } catch (error: any) {
    // Add more diagnostic info to the error
    const absoluteBaseDirForError = resolve(
      normalize(pattern).includes('**') ? normalize(pattern).split('**')[0] : dirname(normalize(pattern))
    );
    const relativePatternForError = relative(absoluteBaseDirForError, normalize(pattern)).replace(/\\/g, '/');
    throw new Error(
      `Error finding files for pattern "${pattern}" (using cwd: "${absoluteBaseDirForError}", globPattern: "${relativePatternForError}"): ${error.message}`
    );
  }
};

export const readMdxFile = async (path: string) => {
  const { data } = matter.read(path);
  const { markdown, ...frontmatter } = data;
  return { ...frontmatter, markdown };
};

export const searchFilesForId = async (files: string[], id: string, version?: string) => {
  // Fast path: if the file index cache is warm we can resolve by id directly
  // without reading any files from disk — O(1) map lookup + set intersection.
  if (_fileIndexCache) {
    const entries = _fileIndexCache.get(id);
    if (entries) {
      const filesSet = new Set(files.map(normalize));
      return entries
        .filter((e) => {
          if (!filesSet.has(e.path)) return false;
          if (version && e.version !== version) return false;
          return true;
        })
        .map((e) => e.path);
    }
    // id not found in cache means no match in these files
    return [];
  }

  // Slow path: read each file from disk and match by id/version regex
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const idRegex = new RegExp(`^id:\\s*(['"]|>-)?\\s*${escapedId}['"]?\\s*$`, 'm');
  const versionRegex = new RegExp(`^version:\\s*['"]?${version}['"]?\\s*$`, 'm');

  const matches = files.map((file) => {
    const content = fsSync.readFileSync(file, 'utf-8');
    const hasIdMatch = content.match(idRegex);

    // Check version if provided
    if (version && !content.match(versionRegex)) {
      return undefined;
    }

    if (hasIdMatch) {
      return file;
    }
  });

  return matches.filter(Boolean).filter((file) => file !== undefined);
};

/**
 * Function to copy a directory from source to target, uses a tmp directory
 * @param catalogDir
 * @param source
 * @param target
 * @param filter
 */
export const copyDir = async (catalogDir: string, source: string, target: string, filter?: CopyFilterAsync | CopyFilterSync) => {
  const tmpDirectory = join(catalogDir, 'tmp');
  fsSync.mkdirSync(tmpDirectory, { recursive: true });

  // Copy everything over
  await copy(source, tmpDirectory, {
    overwrite: true,
    filter,
  });

  await copy(tmpDirectory, target, {
    overwrite: true,
    filter,
  });

  // Remove the tmp directory
  fsSync.rmSync(tmpDirectory, { recursive: true });
};

// Makes sure values in sends/recieves are unique
export const uniqueVersions = (messages: { id: string; version: string }[]): { id: string; version: string }[] => {
  const uniqueSet = new Set();

  return messages.filter((message) => {
    const key = `${message.id}-${message.version}`;
    if (!uniqueSet.has(key)) {
      uniqueSet.add(key);
      return true;
    }
    return false;
  });
};
