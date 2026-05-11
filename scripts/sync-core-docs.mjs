#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const sourceDir = path.resolve(process.env.EVENTCATALOG_DOCS_SOURCE ?? path.join(repoRoot, '..', 'website-2', 'docs'));
const destinationDir = path.join(repoRoot, 'packages', 'core', 'docs');

const ignoredTopLevelDirs = new Set(['sdk', 'studio']);
const ignoredFiles = new Set(['.DS_Store']);
const ignoredExtensions = new Set(['.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']);

const pathExists = async (target) => {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
};

const shouldCopy = (source) => {
  const relativePath = path.relative(sourceDir, source);

  if (!relativePath) {
    return true;
  }

  const [topLevelSegment] = relativePath.split(path.sep);
  const basename = path.basename(source);
  const extension = path.extname(source).toLowerCase();

  return !ignoredTopLevelDirs.has(topLevelSegment) && !ignoredFiles.has(basename) && !ignoredExtensions.has(extension);
};

if (!(await pathExists(sourceDir))) {
  console.error(`EventCatalog docs source not found: ${sourceDir}`);
  console.error('Set EVENTCATALOG_DOCS_SOURCE to override the default ../website-2/docs path.');
  process.exit(1);
}

await fs.rm(destinationDir, { recursive: true, force: true });
await fs.mkdir(destinationDir, { recursive: true });
await fs.cp(sourceDir, destinationDir, {
  recursive: true,
  filter: shouldCopy,
});

console.log(`Synced docs from ${sourceDir} to ${destinationDir}`);
