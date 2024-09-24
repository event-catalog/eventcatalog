#!/usr/bin/env node
import { Command } from 'commander';
import { join } from 'node:path';

import { build } from './commands/build.js';
import { dev } from './commands/dev.js';
import { generate } from './commands/generate.js';
import { preview } from './commands/preview.js';
import { start } from './commands/start.js';

import pkg from '../../package.json';

// The users dierctory
const dir = process.env.PROJECT_DIR || process.cwd();

// The tmp core directory
const core = join(dir, '.eventcatalog-core');

async function main() {
  const program = new Command();

  program.name('eventcatalog').description('Documentation tool for event-driven architectures').version(pkg.version);

  // TODO: Add projectDir and coreDir as command options
  program
    .addCommand(dev(dir, core))
    .addCommand(build(dir, core))
    .addCommand(preview(dir, core))
    .addCommand(start(dir, core))
    .addCommand(generate(dir, core));

  await program.parseAsync();
}

main();
