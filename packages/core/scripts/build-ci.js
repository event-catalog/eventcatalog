#!/usr/bin/env node

// This is used for CI on vercel. Must copy files before building.
import { join } from 'node:path';
import { execSync, spawn } from 'node:child_process';
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

const run = async () => {
  // Build cli (workspace deps already built by turbo before this script runs)
  execSync('pnpm run build:bin', { stdio: 'inherit' });

  // Run the generator
  execSync(`cross-env NODE_ENV=CI PROJECT_DIR=${projectDIR} CATALOG_DIR=${catalogDir} npx . generate`, {
    stdio: 'inherit',
  });

  // Build catalog
  execSync(`cross-env NODE_ENV=CI PROJECT_DIR=${projectDIR} CATALOG_DIR=${catalogDir} npx . build`, {
    stdio: 'inherit',
    IGNORE_BUILD_ARTIFACTS: 'true',
  });

  // Type check
  await runWithFilteredOutput({
    command: `pnpm exec astro check --minimumSeverity error --root ${catalogDir}`,
    cwd: process.cwd(),
    env: {
      PATH: process.env.PATH,
      CATALOG_DIR: catalogDir,
      PROJECT_DIR: projectDIR,
      NODE_OPTIONS: '--max-old-space-size=8192',
    },
  });
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
