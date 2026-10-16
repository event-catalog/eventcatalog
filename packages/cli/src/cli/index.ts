#!/usr/bin/env node

import { program } from 'commander';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { executeFunction } from './executor';
import { listFunctions, formatListOutput } from './list';
import { exportResource, exportCatalog } from './export';
import { exportHtml } from './export-html';
import { snapshotCreate, snapshotDiff, snapshotList } from './snapshot';
import { governanceCheck } from './governance';

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

// Export command - export a resource to .ec DSL format, or the whole catalog as an HTML reference
program
  .command('export [custom-export]')
  .description(
    "Export a catalog resource to EventCatalog DSL (.ec) format, the whole catalog as an HTML reference, or a custom export from the catalog's exports/ folder (by id)"
  )
  .option('-f, --format <format>', 'Output format: dsl or html', 'dsl')
  .option('-a, --all', 'Export the entire catalog (all resource types)', false)
  .option('-r, --resource <type>', 'Resource type (event, command, query, service, domain)')
  .option('--id <id>', 'Resource ID (omit to export all resources of the given type)')
  .option('-v, --version <version>', 'Resource version (defaults to latest)')
  .option('--hydrate', 'Include referenced resources (messages, channels, owners)', false)
  .option('--stdout', 'Print to stdout instead of writing a file', false)
  .option('--no-open', 'With --format html: do not open the reference in your browser')
  .option('-o, --output <path>', 'Output file path (defaults to <id>.ec, catalog.ec, architecture.html or <custom-export>.html)')
  .option('--check', 'With a custom export: list what is in it and what was left out, without writing it', false)
  .action(async (customExport, opts) => {
    try {
      const globalOpts = program.opts() as any;
      const dir = globalOpts.dir || '.';

      if (opts.format === 'html' || customExport || opts.check) {
        const result = await exportHtml({
          dir,
          output: opts.output,
          stdout: opts.stdout,
          customExport,
          check: opts.check,
          // Open it for people at a terminal; never in CI or when the output is piped
          open: opts.open && !process.env.CI && Boolean(process.stdout.isTTY),
        });
        if (opts.stdout) process.stdout.write(result);
        else console.log(result);
        return;
      }

      if (opts.format !== 'dsl') {
        console.error(`Unknown format '${opts.format}'. Use dsl or html.`);
        process.exit(1);
      }

      if (opts.all) {
        const result = await exportCatalog({
          hydrate: opts.hydrate,
          stdout: opts.stdout,
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
        output: opts.output,
        dir,
      });
      console.log(result);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Snapshot command group
const snapshot = program.command('snapshot').description('Create, diff, and list catalog snapshots');

snapshot
  .command('create')
  .description('Take a point-in-time snapshot of the catalog')
  .option('--label <label>', 'Human-readable label (default: ISO timestamp)')
  .option('-o, --output <path>', 'Output directory for the snapshot file')
  .option('--stdout', 'Print JSON to stdout instead of writing a file', false)
  .action(async (opts) => {
    try {
      const globalOpts = program.opts() as any;
      const dir = globalOpts.dir || '.';
      const result = await snapshotCreate({ label: opts.label, output: opts.output, stdout: opts.stdout, dir });
      console.log(result);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

snapshot
  .command('diff <fileA> <fileB>')
  .description('Compare two snapshot files and output a structured diff')
  .option('--format <format>', 'Output format: text or json', 'text')
  .action(async (fileA: string, fileB: string, opts) => {
    try {
      const globalOpts = program.opts() as any;
      const dir = globalOpts.dir || '.';
      const result = await snapshotDiff({ fileA, fileB, format: opts.format, dir });
      console.log(result);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

snapshot
  .command('list')
  .description('List all snapshots in the catalog')
  .option('--format <format>', 'Output format: text or json', 'text')
  .action(async (opts) => {
    try {
      const globalOpts = program.opts() as any;
      const dir = globalOpts.dir || '.';
      const result = await snapshotList({ format: opts.format, dir });
      console.log(result);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Governance command group
const governance = program.command('governance').description('Run governance rules against catalog changes');

governance
  .command('check')
  .description('Compare catalog against a base branch and evaluate governance rules')
  .option('--base <branch>', 'Base branch to compare against (default: main)')
  .option('--target <branch>', 'Target branch to compare (default: current working directory)')
  .option('--format <format>', 'Output format: text or json', 'text')
  .option('--status <status>', 'Status label to include in webhook payloads (e.g. proposed, approved)')
  .action(async (opts) => {
    try {
      const globalOpts = program.opts() as any;
      const dir = globalOpts.dir || '.';
      const result = await governanceCheck({
        base: opts.base,
        target: opts.target,
        format: opts.format,
        status: opts.status,
        dir,
      });
      console.log(result.output);
      process.exitCode = result.exitCode;
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
