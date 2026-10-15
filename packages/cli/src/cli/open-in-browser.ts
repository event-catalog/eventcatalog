import { spawn } from 'node:child_process';

/** Opens a file in the default browser. Resolves false when no browser could be launched; it never throws. */
export const openInBrowser = (filePath: string): Promise<boolean> =>
  new Promise((resolve) => {
    const [command, args] =
      process.platform === 'darwin'
        ? ['open', [filePath]]
        : process.platform === 'win32'
          ? ['cmd', ['/c', 'start', '', filePath]]
          : ['xdg-open', [filePath]];
    try {
      const child = spawn(command, args, { stdio: 'ignore', detached: true });
      child.once('error', () => resolve(false));
      child.once('spawn', () => {
        child.unref();
        resolve(true);
      });
    } catch {
      resolve(false);
    }
  });
