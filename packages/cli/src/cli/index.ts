#!/usr/bin/env node

import { program } from 'commander';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { executeFunction } from './executor';
import { listFunctions, formatListOutput } from './list';
import { exportResource, exportCatalog } from './export';
import { importFromDSL } from './import';

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
  .description('EventCatalog Command-Line Interface')
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

// Export command - export a resource to .ec DSL format
program
  .command('export')
  .description('Export a catalog resource to EventCatalog DSL (.ec) format')
  .option('-a, --all', 'Export the entire catalog (all resource types)', false)
  .option('-r, --resource <type>', 'Resource type (event, command, query, service, domain)')
  .option('--id <id>', 'Resource ID (omit to export all resources of the given type)')
  .option('-v, --version <version>', 'Resource version (defaults to latest)')
  .option('--hydrate', 'Include referenced resources (messages, channels, owners)', false)
  .option('--stdout', 'Print to stdout instead of writing a file', false)
  .option('--playground', 'Open the exported DSL in the playground', false)
  .option('-o, --output <path>', 'Output file path (defaults to <id>.ec or catalog.ec)')
  .action(async (opts) => {
    try {
      const globalOpts = program.opts() as any;
      const dir = globalOpts.dir || '.';

      if (opts.all) {
        const result = await exportCatalog({
          hydrate: opts.hydrate,
          stdout: opts.stdout,
          playground: opts.playground,
          output: opts.output,
          dir,
        });
        console.log(result);
        return;
      }

      if (!opts.resource) {
        console.error('Either --all or --resource is required');
        process.exit(1);
      }

      const result = await exportResource({
        resource: opts.resource,
        id: opts.id,
        version: opts.version,
        hydrate: opts.hydrate,
        stdout: opts.stdout,
        playground: opts.playground,
        output: opts.output,
        dir,
      });
      console.log(result);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Import command - import EventCatalog DSL (.ec) into frontmatter resources
program
  .command('import <file>')
  .description('Import EventCatalog DSL (.ec) into catalog resources')
  .option('--dry-run', 'Preview resources to import without writing files', false)
  .action(async (file, opts) => {
    try {
      const globalOpts = program.opts() as any;
      const dir = globalOpts.dir || '.';
      const result = await importFromDSL({ file, dir, dryRun: opts.dryRun });
      console.log(result);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
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
