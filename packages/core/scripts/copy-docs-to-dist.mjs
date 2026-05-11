#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(packageRoot, 'docs');
const destinationDir = path.join(packageRoot, 'dist', 'docs');

const pathExists = async (target) => {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
};

if (!(await pathExists(sourceDir))) {
  console.warn(`Skipping docs package copy. Source directory not found: ${sourceDir}`);
  process.exit(0);
}

await fs.rm(destinationDir, { recursive: true, force: true });
await fs.mkdir(path.dirname(destinationDir), { recursive: true });
await fs.cp(sourceDir, destinationDir, { recursive: true });

console.log(`Copied bundled docs to ${destinationDir}`);
