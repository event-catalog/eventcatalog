#!/usr/bin/env node

// Run astro check with proper catalog directory setup
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const __dirname = import.meta.dirname;

const args = process.argv.slice(2);
const catalog = args[0] || 'default';

const catalogDir = join(__dirname, '../eventcatalog/');
const projectDIR = join(__dirname, `../../../examples/${catalog}`);

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

// astro check needs the catalog's config/styles in the app directory. These are
// generated at build time and absent on a clean checkout (both are gitignored),
// so copy them across the same way scripts/ci/test.js does.
for (const file of ['eventcatalog.config.js', 'eventcatalog.styles.css']) {
  fs.copyFileSync(join(projectDIR, file), join(catalogDir, file));
}

await runWithFilteredOutput({
  command: `pnpm exec astro check --minimumSeverity error  --root ${catalogDir}`,
  cwd: process.cwd(),
  env: {
    PATH: process.env.PATH,
    CATALOG_DIR: catalogDir,
    PROJECT_DIR: projectDIR,
    NODE_OPTIONS: '--max-old-space-size=8192',
  },
});
