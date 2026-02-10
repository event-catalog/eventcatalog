#!/usr/bin/env node

/**
 * Script for GitHub Actions
 * Sets up the project with required files
 */

import { join } from 'node:path';
import fs from 'fs';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const catalog = args[0] || 'default';

// When run from CI, cwd could be repo root or packages/core
// Use __dirname to compute paths relative to this script's location
// Script is at: packages/core/scripts/ci/test.js
// Repo root is: ../../../../ (up 4 levels)
const __dirname = import.meta.dirname;
const repoRoot = join(__dirname, '../../../..');
const catalogDir = join(repoRoot, 'packages/core/eventcatalog/');
const projectDIR = join(repoRoot, `examples/${catalog}`);

fs.copyFileSync(join(projectDIR, 'eventcatalog.config.js'), join(catalogDir, 'eventcatalog.config.js'));
fs.copyFileSync(join(projectDIR, 'eventcatalog.styles.css'), join(catalogDir, 'eventcatalog.styles.css'));

execSync(`cross-env NODE_ENV=test PROJECT_DIR=${projectDIR} CATALOG_DIR=${catalogDir} pnpm run test run`, {
  stdio: 'inherit',
});
