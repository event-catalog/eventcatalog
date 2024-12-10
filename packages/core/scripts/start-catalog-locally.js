#!/usr/bin/env node
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const catalog = args[0] || 'default';
const __dirname = import.meta.dirname;

const coreDir = resolve(__dirname, '../');
const catalogDir = resolve(coreDir, 'eventcatalog/');
const projectDIR = resolve(coreDir, `../../examples/${catalog}`);

execSync('npm run build:bin', {
  stdio: 'inherit',
});

execSync(`npx . dev`, {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development',
    PROJECT_DIR: projectDIR,
    CATALOG_DIR: catalogDir,
  },
});
