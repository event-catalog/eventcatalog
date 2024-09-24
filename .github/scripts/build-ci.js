#!/usr/bin/env node

// This is used for CI on vercel. Must copy files before building.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const catalog = args[0] || 'default';

const catalogDir = join(process.cwd(), '/astro');
const projectDIR = join(process.cwd(), `/examples/${catalog}`);

// Build @eventcatalog/core binary
execSync(`npm run build`, { stdio: 'inherit' });

// Config files needed by @eventcatalog/astro
fs.copyFileSync(join(projectDIR, 'eventcatalog.config.js'), join(catalogDir, 'eventcatalog.config.js'));
fs.copyFileSync(join(projectDIR, 'eventcatalog.styles.css'), join(catalogDir, 'eventcatalog.styles.css'));

execSync(`rimraf astro/dist/ && cross-env NODE_ENV=CI PROJECT_DIR=${projectDIR} CATALOG_DIR=${catalogDir} npx . build`, {
  stdio: 'inherit',
});
