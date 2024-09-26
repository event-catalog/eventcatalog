import { Command } from 'commander';
import { ExitCode, prepareCore } from '../prepare-eventcatalog-core-directory';
import { generate as runGenerate } from '../generate';

export const generate = (dir: string, core: string) =>
  new Command('generate').description('Start the generator scripts.').action(async () => {
    // TODO: Verify if is this really needed?
    const res = await prepareCore(dir, core);
    if (res == ExitCode.Aborted) return;

    await runGenerate(dir);
  });
