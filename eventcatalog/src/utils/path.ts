import * as path from 'node:path';

/**
 * Convert a platform path to a posix path.
 */
export function posixifyPath(filePath: string) {
  return filePath.split(path.sep).join('/');
}

export function removeLeadingForwardSlash(filePath: string) {
  return filePath.startsWith('/') ? filePath.substring(1) : filePath;
}

export function removeTrailingForwardSlash(filePath: string) {
  return filePath.endsWith('/') ? filePath.slice(0, -1) : filePath;
}

export function removeBase(filePath: string, base: string) {
  if (filePath.startsWith(base)) {
    return filePath.slice(removeTrailingForwardSlash(base).length);
  }
  return filePath;
}
