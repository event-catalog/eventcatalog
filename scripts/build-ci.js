#!/usr/bin/env node

// This is used for CI on vercel. Must copy files before building.
import { join } from 'node:path';
import { execSync } from 'node:child_process';
const __dirname = import.meta.dirname;

const args = process.argv.slice(2);
const catalog = args[0] || 'default';

const catalogDir = join(__dirname, '../');
const projectDIR = join(__dirname, `../examples/${catalog}`);

execSync(
  `cross-env NODE_ENV=CI PROJECT_DIR=${projectDIR} CATALOG_DIR=${catalogDir} npm run build && astro check --minimumSeverity error`,
  {
    cwd: catalogDir,
    stdio: 'inherit',
  }
);
