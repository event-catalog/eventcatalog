#!/usr/bin/env node

import { program } from 'commander';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { executeFunction } from './executor';
import { listFunctions, formatListOutput } from './list';

// Read package.json to get version
let version = '1.0.0';
try {
  const packageJsonPath = resolve(__dirname, '../../package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  version = packageJson.version;
} catch {
  // Fall back to default version if package.json not found
}

program
  .name('eventcatalog')
  .description('EventCatalog SDK Command-Line Interface')
  .version(version)
  .option('-d, --dir <path>', 'Path to the EventCatalog directory (default: current directory)', '.');

// List command - show all available functions
program
  .command('list')
  .description('List all available SDK functions')
  .action(() => {
    try {
      const functions = listFunctions('.');
      const output = formatListOutput(functions);
      console.log(output);
    } catch (error) {
      console.error('Error listing functions:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Catch-all for any other command - execute as SDK function
program.arguments('<function> [args...]').action(async (functionName: string, args: string[]) => {
  try {
    const options = program.opts() as any;
    const dir = options.dir || '.';
    const result = await executeFunction(dir, functionName, args);
    console.log(JSON.stringify(result, null, 0));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
});

program.parse(process.argv);

// Show help if no command provided
if (process.argv.length < 3) {
  program.outputHelp();
}
