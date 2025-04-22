#!/usr/bin/env node

// This is used for CI on vercel. Must copy files before building.
import { join } from 'node:path';
import { execSync } from 'node:child_process';
const __dirname = import.meta.dirname;

const args = process.argv.slice(2);
const catalog = args[0] || 'default';

const catalogDir = join(__dirname, '../packages/core/eventcatalog/');
const projectDIR = join(__dirname, `../examples/${catalog}`);

// Build cli
execSync('pnpm --filter=@eventcatalog/core run build', { stdio: 'inherit' });

// Run the generator
execSync(
  `cross-env NODE_ENV=CI PROJECT_DIR=${projectDIR} CATALOG_DIR=${catalogDir}\
  pnpm exec eventcatalog generate`,
  {
    stdio: 'inherit',
    // Execute the eventcatalog binary from the examples/default/ directory
    // NOTE: The eventcatalog binary is linked through pnpm workspaces.
    cwd: projectDIR,
  }
);

// Build catalog
execSync(
  `cross-env NODE_ENV=CI PROJECT_DIR=${projectDIR} CATALOG_DIR=${catalogDir}\
  pnpm exec eventcatalog build`,
  {
    stdio: 'inherit',
    // Execute the eventcatalog binary from the examples/default/ directory
    // NOTE: The eventcatalog binary is linked through pnpm workspaces.
    cwd: projectDIR,
  }
);

// Type check
execSync(`pnpm --filter=@eventcatalog/ui exec astro check --minimumSeverity error --root ${catalogDir}`, {
  stdio: 'inherit',
  env: {
    PATH: process.env.PATH,
    CATALOG_DIR: catalogDir,
    PROJECT_DIR: projectDIR,
  },
});
