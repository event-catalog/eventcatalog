/* eslint-disable import/no-extraneous-dependencies */
import spawn from 'cross-spawn';

export function installEventCatalogSkills(root: string): Promise<boolean> {
  return new Promise((resolve) => {
    const isInteractive = Boolean(process.stdin.isTTY && process.stdout.isTTY);

    const child = spawn('npx', ['skills', 'add', 'event-catalog/skills'], {
      cwd: root,
      stdio: isInteractive ? 'inherit' : 'ignore',
      env: {
        ...process.env,
        ADBLOCK: '1',
        DISABLE_OPENCOLLECTIVE: '1',
      },
    });

    child.on('error', () => {
      resolve(false);
    });

    child.on('close', (code) => {
      resolve(code === 0);
    });
  });
}
