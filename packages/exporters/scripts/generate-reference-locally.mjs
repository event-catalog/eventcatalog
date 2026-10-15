#!/usr/bin/env node
// Generates the architecture reference for one of the example catalogs, for local development.
//   pnpm run generate:reference            -> examples/default
//   pnpm run generate:reference e-commerce -> examples/e-commerce
//   pnpm run generate:reference --no-open   -> don't open it in the browser
// The file goes to the example's public/ folder, so `pnpm run start:catalog` serves it at /architecture.html.
import { execSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const packageDir = join(import.meta.dirname, '..');
const repoDir = join(packageDir, '../..');
const args = process.argv.slice(2);
const shouldOpen = !args.includes('--no-open') && !process.env.CI;
const example = args.find((arg) => !arg.startsWith('--')) || 'default';
const projectDir = join(repoDir, 'examples', example);

if (!existsSync(projectDir)) {
  console.error(`No example catalog at ${relative(repoDir, projectDir)}`);
  process.exit(1);
}

// Builds the exporters package and what it depends on (the SDK); turbo skips anything unchanged.
execSync('pnpm exec turbo run build:bin --filter=@eventcatalog/exporters --output-logs=errors-only', {
  cwd: repoDir,
  stdio: 'inherit',
});

const { writeHtml } = await import(pathToFileURL(join(packageDir, 'dist/index.mjs')).href);
const result = await writeHtml({
  dir: projectDir,
  outputPath: join(projectDir, 'public', 'architecture.html'),
  regenerateCommand: `pnpm run generate:reference${example === 'default' ? '' : ` ${example}`}`,
});

console.log(`\n  Architecture reference: ${relative(repoDir, result.path)}`);
console.log(
  `  ${result.model.messages.length} messages, ${result.model.services.length} services, ${result.model.domains.length} domains · ${Math.round(result.bytes / 1024)} KB in ${result.durationMs} ms`
);
console.log('  Also served at /architecture.html while `pnpm run start:catalog` is running\n');

// Open it in the default browser. Failing to open never fails the command.
if (shouldOpen) {
  const [command, commandArgs] =
    process.platform === 'darwin'
      ? ['open', [result.path]]
      : process.platform === 'win32'
        ? ['explorer.exe', [result.path]]
        : ['xdg-open', [result.path]];
  const child = spawn(command, commandArgs, { stdio: 'ignore', detached: true });
  child.on('error', () => console.log(`  Could not open a browser. Open ${result.path} yourself.\n`));
  child.unref();
}
