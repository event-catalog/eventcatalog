#!/usr/bin/env node

// This is used for CI on vercel. Must copy files before building.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const catalog = args[0] || 'default';

const catalogDir = join(process.cwd());
const projectDIR = join(process.cwd(), `/examples/${catalog}`);

fs.copyFileSync(join(projectDIR, 'eventcatalog.config.js'), join(catalogDir, 'eventcatalog.config.js'));

fs.copyFileSync(join(projectDIR, 'eventcatalog.styles.css'), join(catalogDir, 'eventcatalog.styles.css'));

execSync(`cross-env NODE_ENV=CI PROJECT_DIR=${projectDIR} CATALOG_DIR=${catalogDir} npm run build`, {
  cwd: catalogDir,
  stdio: 'inherit',
});
