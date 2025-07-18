import path from 'node:path';

/**
 * Using the Astro filePath, this returns the absolute path to the file
 * @param filePath
 * @returns
 */
export const getAbsoluteFilePathForAstroFile = (filePath: string, fileName?: string) => {
  const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd();

  if (fileName) {
    const directory = path.dirname(filePath || '');
    return path.join(PROJECT_DIR, '../', directory, fileName);
  }

  return path.join(PROJECT_DIR, '../', filePath);
};
