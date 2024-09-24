import { Command } from 'commander';
import { previewCatalog } from './preview';

export const start = (dir: string, core: string) =>
  new Command('start').description('Serves the contents of your eventcatalog build directory').action((options) => {
    console.log('Starting preview of your build...');
    previewCatalog(dir, core);
  });
