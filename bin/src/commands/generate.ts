import { Command } from 'commander';
import { ExitCode, prepareCore } from '../prepare-eventcatalog-core-directory';
import { generate as runGenerate } from '../generate';

export const generate = (dir: string, core: string) =>
  new Command('generate')
    .description('Start the generator scripts.')
    .option('--no-auto-install', 'Disable automatic installation of dependencies')
    .action(async (options) => {
      // TODO: Verify if is it really needed?
      const res = await prepareCore(core, options);
      if (res == ExitCode.Aborted) return;

      await runGenerate(dir);
    });
