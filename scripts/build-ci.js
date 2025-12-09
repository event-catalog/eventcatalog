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
execSync('pnpm run build:bin', { stdio: 'inherit' });

// Run the generator
execSync(`cross-env NODE_ENV=CI PROJECT_DIR=${projectDIR} CATALOG_DIR=${catalogDir} npx . generate`, {
  stdio: 'inherit',
});

// Build catalog
execSync(`cross-env NODE_ENV=CI PROJECT_DIR=${projectDIR} CATALOG_DIR=${catalogDir} npx . build`, {
  stdio: 'inherit',
});

// Type check
execSync(`pnpm exec astro check --minimumSeverity error --root ${catalogDir}`, {
  stdio: 'inherit',
  env: {
    PATH: process.env.PATH,
    CATALOG_DIR: catalogDir,
    PROJECT_DIR: projectDIR,
    NODE_OPTIONS: '--max-old-space-size=8192',
  },
});
