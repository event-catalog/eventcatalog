import fs from 'node:fs';
import path from 'node:path';

const IGNORED_CORE_DIRECTORIES = new Set(['.astro', 'dist', 'node_modules', '__tests__']);

// Keep this aligned with the negated `files` pattern in packages/core/package.json.
const COLOCATED_TEST_SUFFIXES = [
  '.spec.js',
  '.spec.jsx',
  '.spec.cjs',
  '.spec.mjs',
  '.spec.ts',
  '.spec.tsx',
  '.spec.cts',
  '.spec.mts',
  '.test.js',
  '.test.jsx',
  '.test.cjs',
  '.test.mjs',
  '.test.ts',
  '.test.tsx',
  '.test.cts',
  '.test.mts',
];

const isColocatedTestFile = (fileName: string) => COLOCATED_TEST_SUFFIXES.some((suffix) => fileName.endsWith(suffix));

export const shouldCopyCoreEntry = (sourceRoot: string, sourcePath: string) => {
  const relativePath = path.relative(sourceRoot, sourcePath);

  if (relativePath === '') return true;

  const pathParts = relativePath.split(path.sep);

  if (pathParts.some((part) => IGNORED_CORE_DIRECTORIES.has(part))) return false;

  const fileName = pathParts[pathParts.length - 1] ?? '';
  return !isColocatedTestFile(fileName);
};

// Generated output and the linked dependency tree are not copied from the package,
// and walking them would either be slow or delete files we did not publish.
const PRUNE_SKIPPED_DIRECTORIES = new Set(['.astro', 'dist', 'node_modules']);

export const pruneExcludedCoreEntries = (coreDir: string) => {
  if (!fs.existsSync(coreDir)) return;

  const visit = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);

      if (entry.name === '__tests__' || isColocatedTestFile(entry.name)) {
        fs.rmSync(entryPath, { recursive: true, force: true });
        continue;
      }

      if (entry.isDirectory() && !PRUNE_SKIPPED_DIRECTORIES.has(entry.name)) {
        visit(entryPath);
      }
    }
  };

  visit(coreDir);
};
