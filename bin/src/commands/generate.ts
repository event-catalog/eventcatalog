import { Command } from 'commander';
import { prepareCore } from '../prepare-eventcatalog-core-directory';
import { generate as runGenerate } from '../generate';

export const generate = (dir: string, core: string) =>
  new Command('generate').description('Start the generator scripts.').action(async () => {
    // TODO: Verify if is this really needed?
    prepareCore(dir, core);

    await runGenerate(dir);
  });
