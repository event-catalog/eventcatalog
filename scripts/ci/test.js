#!/usr/bin/env node

/**
 * Script for GitHub Actions
 * Sets up the project with required files
 */

import { join } from 'node:path';
import fs from 'fs';
import { execSync } from 'node:child_process';
const __dirname = import.meta.dirname;

const args = process.argv.slice(2);
const catalog = args[0] || 'default';

const catalogDir = join(__dirname, '../');
const projectDIR = join(__dirname, `../../examples/${catalog}`);

fs.copyFileSync(join(projectDIR, 'eventcatalog.config.js'), join(catalogDir, 'eventcatalog.config.js'));
fs.copyFileSync(join(projectDIR, 'eventcatalog.styles.css'), join(catalogDir, 'eventcatalog.styles.css'));

execSync(`cross-env NODE_ENV=test PROJECT_DIR=${projectDIR} CATALOG_DIR=${catalogDir} npm run test`, {
  cwd: catalogDir,
  stdio: 'inherit',
});
