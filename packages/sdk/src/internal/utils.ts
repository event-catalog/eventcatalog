import { globSync } from 'glob';
import fsSync from 'node:fs';
import { copy, CopyFilterAsync, CopyFilterSync } from 'fs-extra';
import { join, dirname, normalize, sep as pathSeparator, resolve, basename, relative } from 'node:path';
import matter from 'gray-matter';
import { satisfies, validRange, valid } from 'semver';

/**
 * Returns true if a given version of a resource id exists in the catalog
 */
export const versionExists = async (catalogDir: string, id: string, version: string) => {
  const files = await getFiles(`${catalogDir}/**/index.{md,mdx}`);
  const matchedFiles = (await searchFilesForId(files, id, version)) || [];
  return matchedFiles.length > 0;
};

export const findFileById = async (catalogDir: string, id: string, version?: string): Promise<string | undefined> => {
  const files = await getFiles(`${catalogDir}/**/index.{md,mdx}`);

  const matchedFiles = (await searchFilesForId(files, id)) || [];
  const latestVersion = matchedFiles.find((path) => !path.includes('versioned'));

  // If no version is provided, return the latest version
  if (!version) {
    return latestVersion;
  }

  // map files into gray matter to get versions
  const parsedFiles = matchedFiles.map((path) => {
    const { data } = matter.read(path);
    return { ...data, path };
  }) as any[];

  // Handle 'latest' version - return the latest (non-versioned) file
  if (version === 'latest') {
    return latestVersion;
  }

  // First, check for exact version match (handles non-semver versions like '1', '2', etc.)
  const exactMatch = parsedFiles.find((c) => c.version === version);
  if (exactMatch) {
    return exactMatch.path;
  }

  // Try semver range matching
  const semverRange = validRange(version);

  if (semverRange) {
    const match = parsedFiles.filter((c) => {
      try {
        return satisfies(c.version, semverRange);
      } catch (error) {
        // If satisfies fails (e.g., comparing semver range with non-semver version), skip this file
        return false;
      }
    });
    return match.length > 0 ? match[0].path : undefined;
  }

  // If no exact match and no valid semver range, return undefined
  return undefined;
};

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
