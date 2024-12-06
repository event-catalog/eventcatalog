#!/usr/bin/env node

// This is used for CI on vercel. Must copy files before building.
import { join } from 'node:path';
import { execSync } from 'node:child_process';
const __dirname = import.meta.dirname;

const args = process.argv.slice(2);
const catalog = args[0] || 'default';

const catalogDir = join(__dirname, '../eventcatalog/');
const projectDIR = join(__dirname, `../examples/${catalog}`);

// Build cli
execSync('npm run build:bin', { stdio: 'inherit' });

// Build catalog
execSync(`npx . build`, {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_EVN: 'CI',
    PROJECT_DIR: projectDIR,
    CATALOG_DIR: catalogDir,
  },
});

// Type check
execSync('npx astro check --minimumSeverity error', {
  cwd: catalogDir,
  stdio: 'inherit',
});
