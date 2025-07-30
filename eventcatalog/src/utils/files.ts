import path from 'node:path';

/**
 * Resolves a file path relative to PROJECT_DIR, handling ../ paths correctly
 * @param filePath - The path to resolve
 * @param projectDir - The project directory to resolve relative to
 * @returns The resolved absolute path
 */
export const resolveProjectPath = (filePath: string, projectDir: string = process.env.PROJECT_DIR || process.cwd()): string => {
  if (filePath.startsWith('../')) {
    const pathAfterDotDot = filePath.substring(3);
    const projectDirName = path.basename(projectDir);
    const projectParentName = path.basename(path.dirname(projectDir));

    if (pathAfterDotDot.startsWith(`${projectParentName}/${projectDirName}/`)) {
      const remainingPath = pathAfterDotDot.substring(`${projectParentName}/${projectDirName}/`.length);
      return path.join(projectDir, remainingPath);
    } else {
      const projectParent = path.dirname(projectDir);
      return path.join(projectParent, pathAfterDotDot);
    }
  }
  return path.join(projectDir, filePath);
};

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
    const resolvedFilePath = resolveProjectPath(filePath, PROJECT_DIR);
    const directory = path.dirname(resolvedFilePath);
    return path.join(directory, fileName);
  }

  return resolveProjectPath(filePath, PROJECT_DIR);
};
