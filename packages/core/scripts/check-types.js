#!/usr/bin/env node
import { getRuntimePaths } from '../eventcatalog/integrations/runtime-paths.mjs';

// Run astro check with proper catalog directory setup
import { join, relative } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
const __dirname = import.meta.dirname;

const args = process.argv.slice(2);
const skipBuild = args.includes('--skip-build');
const catalog = args.find((arg) => arg !== '--skip-build') || 'default';

const projectDIR = join(__dirname, `../../../examples/${catalog}`);
const { runtimeDirectory: catalogDir } = getRuntimePaths(projectDIR);

const shouldFilterAstroLine = (line) => {
  return line.includes('[glob-loader]') || /The collection.*does not exist/.test(line);
};

const runWithFilteredOutput = async ({ command, cwd, env }) => {
  await new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      env: {
        ...process.env,
        ...env,
      },
      shell: true,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let stdoutBuffer = '';
    let stderrBuffer = '';

    const flush = (buffer, writer, isFinal = false) => {
      const lines = buffer.split('\n');
      const remaining = isFinal ? '' : (lines.pop() ?? '');

      for (const rawLine of lines) {
        const line = rawLine.replace(/\r/g, '');
        if (line.length === 0) {
          writer.write('\n');
          continue;
        }
        if (!shouldFilterAstroLine(line)) {
          writer.write(`${rawLine}\n`);
        }
      }

      return remaining;
    };

    child.stdout.on('data', (chunk) => {
      stdoutBuffer += chunk.toString();
      stdoutBuffer = flush(stdoutBuffer, process.stdout);
    });

    child.stderr.on('data', (chunk) => {
      stderrBuffer += chunk.toString();
      stderrBuffer = flush(stderrBuffer, process.stderr);
    });

    child.on('error', (error) => reject(error));
    child.on('close', (code) => {
      flush(stdoutBuffer, process.stdout, true);
      flush(stderrBuffer, process.stderr, true);
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Command failed with exit code ${code}: ${command}`));
    });
  });
};

// Check the same runtime bootstrap used by the CLI, including user components
// and pages, without copying the application into the catalog.
// Standalone checks build the package, including the dependency-facade manifest.
// CI can reuse the outputs of its successful build:bin prerequisite.
if (!skipBuild) {
  execFileSync(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['run', 'build:bin'], {
    cwd: join(__dirname, '..'),
    stdio: 'inherit',
  });
}
const { prepareCatalogRuntime } = await import('../dist/catalog-runtime.js');
prepareCatalogRuntime({
  projectDirectory: projectDIR,
  catalogDirectory: catalogDir,
  packageDirectory: join(__dirname, '../eventcatalog'),
});

await runWithFilteredOutput({
  command: `pnpm exec astro check --minimumSeverity error --root ${projectDIR} --config ${relative(projectDIR, join(__dirname, '../eventcatalog/astro.config.mjs'))} --tsconfig ${join(catalogDir, 'tsconfig.json')}`,
  cwd: process.cwd(),
  env: {
    PATH: process.env.PATH,
    CATALOG_DIR: catalogDir,
    PROJECT_DIR: projectDIR,
    NODE_OPTIONS: '--max-old-space-size=8192',
  },
});
