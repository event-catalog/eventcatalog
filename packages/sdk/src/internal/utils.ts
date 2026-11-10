import { globSync } from 'glob';
import fsSync from 'node:fs';
import { copy, CopyFilterAsync, CopyFilterSync } from 'fs-extra';
import { join, dirname, normalize, sep as pathSeparator, resolve, basename, relative } from 'node:path';
import matter from 'gray-matter';
import { isVersionGreaterThan, versionSatisfiesRange } from './versions';
import type { MessagePointerInput } from '../types';

// In-memory index of every index.{md,mdx} file in the catalog, with its parsed frontmatter, built on first read.
//
// One cache serves the catalog and any folder inside it (the SDK passes `catalog/domains`, `catalog/services`... to many
// functions). The SDK keeps it up to date as it writes, and it notices changes made outside the SDK (by hand, by a
// generator using `fs`, by tests):
// - a file found in it is used only while it still exists with the same mtime (one `stat`)
// - when an id isn't found (or its file changed), every folder in the catalog is checked for a new mtime, and only the
//   folders that changed are read again. That costs a `stat` per folder, instead of reading every file again.
interface FileIndexEntry {
  path: string;
  id: string;
  version: string;
  isVersioned: boolean;
  mtime: number;
}

/** A folder in the catalog as it was when last read. */
interface KnownDir {
  mtime: number;
  ino: number;
  entries: Set<string>;
}

/** Folders at the top of the catalog that are not part of it (dot-folders are skipped too, as glob does). */
const CACHE_IGNORE = ['node_modules', 'dist', '.eventcatalog-core'];
const INDEX_FILE = /^index\.mdx?$/;

let _fileIndexCache: Map<string, FileIndexEntry[]> | null = null;
let _fileIndexCatalogDir: string | null = null;
let _catalogDirIno = -1;
let _matterCache: Map<string, matter.GrayMatterFile<string>> | null = null;
let _fileMtimes: Map<string, number> | null = null;
let _filePathToIdCache: Map<string, string> | null = null;
/** The cached files under each folder in the catalog, so a folder's files are found without going through them all. */
let _filesUnderDir: Map<string, Set<string>> | null = null;
/** Every folder in the catalog. */
let _knownDirs: Map<string, KnownDir> | null = null;
/** Goes up whenever the cache is built, cleared or updated, so lookups built from it know when they're stale. */
let _fileCacheGeneration = 0;

function toCanonicalPath(inputPath: string): string {
  return normalize(resolve(inputPath));
}

/** True when `child` is `parent` or inside it (both canonical). */
function isWithin(child: string, parent: string): boolean {
  if (child === parent) return true;
  return child.startsWith(parent.endsWith(pathSeparator) ? parent : parent + pathSeparator);
}

const statOf = (path: string): fsSync.Stats | undefined => {
  try {
    return fsSync.statSync(path, { throwIfNoEntry: false });
  } catch {
    return undefined;
  }
};

/** The folders holding a file, up to (not including) the cached catalog. */
function foldersAbove(file: string): string[] {
  const folders: string[] = [];
  for (let dir = dirname(file); dir.length > _fileIndexCatalogDir!.length; dir = dirname(dir)) folders.push(dir);
  return folders;
}

const isVersionedPath = (file: string) =>
  relative(_fileIndexCatalogDir!, file).split(pathSeparator).slice(0, -1).includes('versioned');

/** Reads an index file into the cache (the caller removes any previous entry for the same path first). */
function addCachedFile(file: string, rawContent?: string): void {
  const stat = statOf(file);
  if (!stat) return;
  const parsed = matter(rawContent ?? fsSync.readFileSync(file, 'utf-8'));
  _matterCache!.set(file, parsed);
  _fileMtimes!.set(file, stat.mtimeMs);
  for (const dir of foldersAbove(file)) {
    const files = _filesUnderDir!.get(dir);
    if (files) files.add(file);
    else _filesUnderDir!.set(dir, new Set([file]));
  }

  const id = parsed.data.id;
  if (!id) return;
  const resourceId = String(id);
  const entry: FileIndexEntry = {
    path: file,
    id: resourceId,
    version: String(parsed.data.version || ''),
    isVersioned: isVersionedPath(file),
    mtime: stat.mtimeMs,
  };
  _filePathToIdCache!.set(file, resourceId);
  // When files share an id and version, the one written last is found first
  const entries = [...(_fileIndexCache!.get(resourceId) || []), entry].sort((a, b) => b.mtime - a.mtime);
  _fileIndexCache!.set(resourceId, entries);
}

function removeCachedFile(file: string): void {
  if (!_matterCache!.delete(file)) return;
  _fileMtimes!.delete(file);
  for (const dir of foldersAbove(file)) {
    const files = _filesUnderDir!.get(dir);
    files?.delete(file);
    if (files?.size === 0) _filesUnderDir!.delete(dir);
  }
  const previousId = _filePathToIdCache!.get(file);
  if (!previousId) return;
  _filePathToIdCache!.delete(file);
  const remaining = (_fileIndexCache!.get(previousId) || []).filter((entry) => entry.path !== file);
  if (remaining.length === 0) _fileIndexCache!.delete(previousId);
  else _fileIndexCache!.set(previousId, remaining);
}

/**
 * Walks a folder of the catalog: remembers every folder in it and returns its index files. Finds what
 * `glob('**\/index.{md,mdx}')` would: dot-folders and the ignored top-level folders are skipped, symlinked folders are
 * not followed, symlinked index files are kept.
 */
function walkCatalogFolder(start: string): string[] {
  const root = _fileIndexCatalogDir!;
  const files: string[] = [];
  const stack = [start];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    const stat = statOf(dir);
    if (!stat?.isDirectory()) continue;
    let dirents: fsSync.Dirent[];
    try {
      dirents = fsSync.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    _knownDirs!.set(dir, { mtime: stat.mtimeMs, ino: stat.ino, entries: new Set(dirents.map((d) => d.name)) });
    for (const dirent of dirents) {
      if (dirent.name.startsWith('.')) continue;
      const path = join(dir, dirent.name);
      if (dirent.isDirectory()) {
        if (dir !== root || !CACHE_IGNORE.includes(dirent.name)) stack.push(path);
      } else if (INDEX_FILE.test(dirent.name) && (dirent.isFile() || (dirent.isSymbolicLink() && statOf(path)?.isFile()))) {
        files.push(path);
      }
    }
  }
  return files;
}

function buildFileCache(catalogDir: string): void {
  const canonicalCatalogDir = toCanonicalPath(catalogDir);
  _fileIndexCache = new Map();
  _matterCache = new Map();
  _fileMtimes = new Map();
  _filePathToIdCache = new Map();
  _filesUnderDir = new Map();
  _knownDirs = new Map();
  _fileIndexCatalogDir = canonicalCatalogDir;
  _catalogDirIno = statOf(canonicalCatalogDir)?.ino ?? -1;

  for (const file of walkCatalogFolder(canonicalCatalogDir)) addCachedFile(file);
  _fileCacheGeneration++;
}

/**
 * Makes sure the cache covers `catalogDir`. Returns the folder to limit lookups to when `catalogDir` is a folder inside
 * the cached catalog, or undefined when it is the cached catalog itself.
 */
function ensureFileCache(catalogDir: string): string | undefined {
  const dir = toCanonicalPath(catalogDir);
  if (!_fileIndexCache || !_fileIndexCatalogDir || !isWithin(dir, _fileIndexCatalogDir)) {
    buildFileCache(dir);
    return undefined;
  }
  // The catalog was removed or replaced (e.g. tests wiping it): start again
  if ((statOf(_fileIndexCatalogDir)?.ino ?? -1) !== _catalogDirIno) buildFileCache(_fileIndexCatalogDir);
  return dir === _fileIndexCatalogDir ? undefined : dir;
}

/** True when a cached file is still on disk as it was read. */
function isCachedFileCurrent(file: string): boolean {
  const mtime = _fileMtimes!.get(file);
  return mtime !== undefined && statOf(file)?.mtimeMs === mtime;
}

/**
 * Catches up with changes made outside the SDK: checks every folder in the catalog, and reads again only what was
 * added to or removed from a folder whose mtime moved. Files changed in place are caught when they are read.
 */
function refreshFileCache(): void {
  const root = _fileIndexCatalogDir!;
  const rootStat = statOf(root);
  if ((rootStat?.ino ?? -1) !== _catalogDirIno) {
    buildFileCache(root);
    return;
  }

  const changed: [string, KnownDir, fsSync.Stats | undefined][] = [];
  for (const [dir, known] of _knownDirs!) {
    const stat = statOf(dir);
    if (stat?.mtimeMs !== known.mtime || stat.ino !== known.ino) changed.push([dir, known, stat]);
  }

  for (const [dir, known, stat] of changed) {
    if (_knownDirs!.get(dir) !== known) continue; // Already read again while handling a folder above it
    if (!stat?.isDirectory() || stat.ino !== known.ino) {
      syncFileCachePath(dir);
      continue;
    }

    let now: Set<string>;
    try {
      now = new Set(fsSync.readdirSync(dir));
    } catch {
      continue;
    }
    _knownDirs!.set(dir, { mtime: stat.mtimeMs, ino: stat.ino, entries: now });
    for (const name of known.entries) if (!now.has(name)) syncFileCachePath(join(dir, name));
    for (const name of now) if (!known.entries.has(name)) syncFileCachePath(join(dir, name));
  }
}

/**
 * Catches up with every change on disk, including files changed in place (which don't move their folder's mtime): a
 * `stat` per folder and per file. For answers that must be complete, like what to remove.
 */
function refreshWholeFileCache(): void {
  refreshFileCache();
  for (const file of [..._matterCache!.keys()]) if (!isCachedFileCurrent(file)) syncFileCachePath(file);
}

/** The cached entries for an id, limited to `scope` when given. */
function cachedEntriesForId(id: string, scope: string | undefined): FileIndexEntry[] {
  const entries = _fileIndexCache!.get(id) || [];
  return scope ? entries.filter((entry) => isWithin(entry.path, scope)) : entries;
}

/**
 * Looks something up in the cache, and checks the answer: when nothing is found, or the file found has changed or
 * gone, the cache catches up with the catalog on disk and looks again.
 */
function lookUp<T>(catalogDir: string, find: (scope: string | undefined) => { result: T; file?: string }): T {
  const scope = ensureFileCache(catalogDir);
  const first = find(scope);
  if (first.file && isCachedFileCurrent(first.file)) return first.result;
  if (first.file) syncFileCachePath(first.file);
  refreshFileCache();
  return find(scope).result;
}

/** Invalidate the file cache. The next read builds it again from disk. */
export function invalidateFileCache(): void {
  _fileIndexCache = null;
  _fileIndexCatalogDir = null;
  _catalogDirIno = -1;
  _matterCache = null;
  _fileMtimes = null;
  _filePathToIdCache = null;
  _filesUnderDir = null;
  _knownDirs = null;
  _fileCacheGeneration++;
}

/**
 * Incrementally updates the in-memory file index for a single file write.
 * No-ops when the cache isn't built or the file is outside the cached catalog.
 */
export function upsertFileCacheEntry(catalogDir: string, filePath: string, rawContent: string): void {
  if (!_fileIndexCache || !_fileIndexCatalogDir) return;
  const normalizedPath = toCanonicalPath(filePath);
  if (!isWithin(toCanonicalPath(catalogDir), _fileIndexCatalogDir) || !isWithin(normalizedPath, _fileIndexCatalogDir)) return;

  removeCachedFile(normalizedPath);
  addCachedFile(normalizedPath, rawContent);
  _fileCacheGeneration++;
}

/**
 * Brings the cache up to date with a file or folder that was written, moved or removed: drops what it had at or under
 * the path, and reads what is there now. Costs the size of that folder, not the catalog.
 */
export function syncFileCachePath(targetPath: string): void {
  if (!_fileIndexCache || !_fileIndexCatalogDir) return;
  const target = toCanonicalPath(targetPath);
  const root = _fileIndexCatalogDir;

  // The catalog itself (or a folder holding it) changed: start again
  if (isWithin(root, target)) {
    invalidateFileCache();
    return;
  }
  if (!isWithin(target, root)) return;

  const cachedHere = [...(_filesUnderDir!.get(target) ?? [])];
  if (_matterCache!.has(target)) cachedHere.push(target);
  cachedHere.forEach(removeCachedFile);
  if (_knownDirs!.has(target)) {
    const prefix = target + pathSeparator;
    for (const dir of [..._knownDirs!.keys()]) if (dir === target || dir.startsWith(prefix)) _knownDirs!.delete(dir);
  }

  const parts = relative(root, target).split(pathSeparator);
  const ignored = parts.some((part) => part.startsWith('.')) || CACHE_IGNORE.includes(parts[0]);
  const stat = ignored ? undefined : statOf(target);
  if (stat?.isDirectory() && !fsSync.lstatSync(target).isSymbolicLink()) {
    for (const file of walkCatalogFolder(target)) addCachedFile(file);
  } else if (stat?.isFile() && INDEX_FILE.test(basename(target))) {
    addCachedFile(target);
  }
  _fileCacheGeneration++;
}

/**
 * Every index file in the catalog with its parsed frontmatter, from the in-memory cache (built on first use), and the
 * cache's generation: it changes whenever the files do, so anything built from them can tell when to build again.
 */
export function getCachedIndexFiles(catalogDir: string): {
  generation: number;
  files: ReadonlyMap<string, matter.GrayMatterFile<string>>;
} {
  const scope = ensureFileCache(catalogDir);
  refreshWholeFileCache();
  if (!scope) return { generation: _fileCacheGeneration, files: _matterCache! };
  const files = new Map([..._matterCache!].filter(([file]) => isWithin(file, scope)));
  return { generation: _fileCacheGeneration, files };
}

// Keep these as aliases for backwards compat with CLI export code
export const enableFileCache = buildFileCache;
export const disableFileCache = invalidateFileCache;

/**
 * Returns the parsed file from the cache while it's unchanged on disk, otherwise reads it (into the cache, when it is one
 * of the catalog's index files).
 */
export function cachedMatterRead(filePath: string): matter.GrayMatterFile<string> {
  if (_matterCache && _fileIndexCatalogDir) {
    const file = toCanonicalPath(filePath);
    if (_matterCache.has(file) && isCachedFileCurrent(file)) return _matterCache.get(file)!;
    if (isWithin(file, _fileIndexCatalogDir) && INDEX_FILE.test(basename(file))) {
      syncFileCachePath(file);
      const parsed = _matterCache?.get(file);
      if (parsed) return parsed;
    }
  }
  return matter.read(filePath);
}

/**
 * Returns true if a given version of a resource id exists in the catalog
 */
export const versionExists = async (catalogDir: string, id: string, version: string) =>
  lookUp(catalogDir, (scope) => {
    const match = cachedEntriesForId(id, scope).find((e) => e.version === version);
    return { result: !!match, file: match?.path };
  });

/**
 * Index files of a resource id (every version, or one exact version), latest first. These are about to be changed or
 * removed, so the cache first catches up with everything on disk, files changed in place included: a file whose id was
 * changed to this one is found too. Empty when there are none.
 */
export const findCachedFilesForId = (catalogDir: string, id: string, version?: string): string[] => {
  const scope = ensureFileCache(catalogDir);
  refreshWholeFileCache();
  return cachedEntriesForId(id, scope)
    .filter((entry) => !version || entry.version === version)
    .sort((a, b) => Number(a.isVersioned) - Number(b.isVersioned))
    .map((entry) => entry.path);
};

const pickFileForVersion = (entries: FileIndexEntry[], version?: string): string | undefined => {
  if (entries.length === 0) return undefined;

  if (!version || version === 'latest') {
    return entries.find((e) => !e.isVersioned)?.path;
  }

  // Exact version match
  const exactMatch = entries.find((e) => e.version === version);
  if (exactMatch) return exactMatch.path;

  // Semver range match — pick the highest satisfying version
  let match: FileIndexEntry | undefined;
  for (const entry of entries) {
    if (!versionSatisfiesRange(entry.version, version)) continue;
    if (!match || isVersionGreaterThan(entry.version, match.version)) match = entry;
  }
  return match?.path;
};

export const findFileById = async (catalogDir: string, id: string, version?: string): Promise<string | undefined> =>
  lookUp(catalogDir, (scope) => {
    const file = pickFileForVersion(cachedEntriesForId(id, scope), version);
    return { result: file, file };
  });

export const getFiles = async (pattern: string, ignore: string | string[] = '') => {
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
      ignore: ['node_modules/**', 'dist/**', '.eventcatalog-core/**', ...ignoreList],
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
  // Escape the id to avoid regex issues
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

// Builds the frontmatter pointer used by sends/receives relationships.
export const buildMessagePointer = (message: MessagePointerInput, options: { includeTriggers?: boolean } = {}) => {
  const pointer: MessagePointerInput = {
    id: message.id,
    version: message.version,
  };
  if (message.fields) pointer.fields = message.fields;
  if (message.group) pointer.group = message.group;
  if (options.includeTriggers && message.triggers) {
    pointer.triggers = message.triggers.map((trigger) => ({ ...trigger }));
  }
  return pointer;
};

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
