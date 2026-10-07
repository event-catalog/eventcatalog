import { glob } from 'glob';

/**
 * Finds the files matching `patterns` under `cwd`. A pattern starting with `!` leaves out the
 * files it matches. Symlinked directories are not followed.
 */
export const findFiles = (
  patterns: string[],
  { cwd, absolute = false, ignore = [] }: { cwd: string; absolute?: boolean; ignore?: string[] }
): Promise<string[]> => {
  const included = patterns.filter((pattern) => !pattern.startsWith('!'));
  const excluded = patterns.filter((pattern) => pattern.startsWith('!')).map((pattern) => pattern.slice(1));
  return glob(included, { cwd, absolute, nodir: true, follow: false, ignore: [...ignore, ...excluded] });
};
