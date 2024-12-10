#!/usr/bin/env node

// This is used for CI on vercel. Must copy files before building.
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const catalog = args[0] || 'default';
const __dirname = import.meta.dirname;

const coreDir = resolve(__dirname, '../');
const catalogDir = resolve(coreDir, 'eventcatalog/');
const projectDIR = resolve(coreDir, `../../examples/${catalog}`);

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
execSync(`npx astro check --minimumSeverity error --root ${catalogDir}`, {
  stdio: 'inherit',
});
