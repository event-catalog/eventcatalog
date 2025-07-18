import path from 'node:path';

/**
 * Using the Astro filePath, this returns the absolute path to the file
 *
 * The astro file path does not return the absolute path to the file, it returns the relative path to the file.
 *
 * This function will return the absolute path to the file, and it will also remove any overlapping path segments, issues seen with local development and also docker
 *
 * @param filePath
 * @returns
 */
export const getAbsoluteFilePathForAstroFile = (filePath: string, fileName?: string) => {
  const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd();

  if (fileName) {
    const safeRelativePath = path.posix.relative('/', path.resolve('/', filePath));

    // Check for overlapping path segments
    const projectDirSegments = PROJECT_DIR.split(path.sep);
    const relativePathSegments = safeRelativePath.split(path.posix.sep);

    // Find the longest matching suffix of PROJECT_DIR with prefix of relative path
    let overlapLength = 0;
    for (let i = 1; i <= Math.min(projectDirSegments.length, relativePathSegments.length); i++) {
      const projectSuffix = projectDirSegments.slice(-i);
      const relativPrefix = relativePathSegments.slice(0, i);

      if (projectSuffix.join(path.sep) === relativPrefix.join(path.posix.sep)) {
        overlapLength = i;
      }
    }

    // Remove overlapping segments from the relative path
    const cleanedRelativePath = relativePathSegments.slice(overlapLength).join(path.posix.sep);
    const absoluteFilePath = path.join(PROJECT_DIR, cleanedRelativePath);

    const directory = path.dirname(absoluteFilePath || '');
    return path.join(directory, fileName);
  }

  return path.join(PROJECT_DIR, filePath);
};
