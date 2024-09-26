import { execSync } from 'node:child_process';
import { Command } from 'commander';
import path from 'node:path';

export const previewCatalog = (dir: string, core: string) => {
  execSync(`npm run preview -- --root ${path.resolve(dir)} --port 3000`, {
    cwd: core,
    stdio: 'inherit',
  });
};

export const preview = (dir: string, core: string) =>
  new Command('preview').description('Serves the contents of your eventcatalog build directory').action((options) => {
    console.log('Starting preview of your build...');
    previewCatalog(dir, core);
  });
