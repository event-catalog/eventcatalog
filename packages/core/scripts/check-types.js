#!/usr/bin/env node

// Run astro check with proper catalog directory setup
import { join } from 'node:path';
import { execSync } from 'node:child_process';
const __dirname = import.meta.dirname;

const args = process.argv.slice(2);
const catalog = args[0] || 'default';

const catalogDir = join(__dirname, '../eventcatalog/');
const projectDIR = join(__dirname, `../../../examples/${catalog}`);

// Type check
execSync(`pnpm exec astro check --minimumSeverity error  --root ${catalogDir}`, {
  stdio: 'inherit',
  env: {
    PATH: process.env.PATH,
    CATALOG_DIR: catalogDir,
    PROJECT_DIR: projectDIR,
    NODE_OPTIONS: '--max-old-space-size=8192',
  },
});
