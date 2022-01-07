import fs from 'fs';

// eslint-disable-next-line import/prefer-default-export
export function makeDir(root: string, options = { recursive: true }): Promise<void> {
  return fs.promises.mkdir(root, options);
}
