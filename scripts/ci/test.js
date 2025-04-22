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

const catalogDir = join(process.cwd(), 'packages/core/eventcatalog/');
const projectDIR = join(process.cwd(), `/examples/${catalog}`);

// Create the AI directory
fs.mkdirSync(join(projectDIR, 'public/ai'), { recursive: true });

// Write fake embeddings and documents
fs.writeFileSync(join(projectDIR, 'public/ai/documents.json'), JSON.stringify([]));
fs.writeFileSync(join(projectDIR, 'public/ai/embeddings.json'), JSON.stringify([]));

fs.copyFileSync(join(projectDIR, 'eventcatalog.config.js'), join(catalogDir, 'eventcatalog.config.js'));
fs.copyFileSync(join(projectDIR, 'eventcatalog.styles.css'), join(catalogDir, 'eventcatalog.styles.css'));

execSync(
  `cross-env NODE_ENV=test PROJECT_DIR=${projectDIR} CATALOG_DIR=${catalogDir}\
    pnpm test run`,
  { stdio: 'inherit' }
);
