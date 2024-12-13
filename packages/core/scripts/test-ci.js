#!/usr/bin/env node

/**
 * Script for GitHub Actions
 * Sets up the project with required files
 */

import { join, resolve } from 'node:path';
import fs from 'fs';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const catalog = args[0] || 'default';
const __dirname = import.meta.dirname;

const coreDir = resolve(__dirname, '../');
const catalogDir = resolve(coreDir, 'eventcatalog/');
const projectDIR = resolve(coreDir, `../../examples/${catalog}`);

fs.copyFileSync(join(projectDIR, 'eventcatalog.config.js'), join(catalogDir, 'eventcatalog.config.js'));
fs.copyFileSync(join(projectDIR, 'eventcatalog.styles.css'), join(catalogDir, 'eventcatalog.styles.css'));

execSync(`npm run test run`, {
  cwd: resolve(__dirname, '../../'),
  stdio: 'inherit',
});
