#!/usr/bin/env node
import { join } from 'node:path';
import fs from 'fs';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const catalog = args[0] || 'default';

const catalogDir = join(process.cwd());
const projectDIR = join(process.cwd(), `examples/${catalog}`);

fs.copyFileSync(join(projectDIR, 'eventcatalog.config.js'), join(catalogDir, 'eventcatalog.config.js'));
fs.copyFileSync(join(projectDIR, 'eventcatalog.styles.css'), join(catalogDir, 'eventcatalog.styles.css'));

execSync(
  `cross-env NODE_ENV=development PROJECT_DIR=${projectDIR} CATALOG_DIR=${catalogDir} npm run scripts:hydrate-content && cross-env PROJECT_DIR=${projectDIR} CATALOG_DIR=${catalogDir} npm run dev:local`,
  {
    cwd: catalogDir,
    stdio: 'inherit',
  }
);
