import fs from 'node:fs/promises';
import path from 'node:path';

const sourceDirectory = path.resolve(import.meta.dirname, '..');
const sourceExtensions = new Set(['.astro', '.js', '.mjs', '.ts', '.tsx']);
const ignoredDirectories = new Set(['.astro', '__tests__', 'dist', 'node_modules']);

const findSourceFiles = async (directory: string): Promise<string[]> => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return ignoredDirectories.has(entry.name) ? [] : findSourceFiles(entryPath);
      }

      return sourceExtensions.has(path.extname(entry.name)) ? [entryPath] : [];
    })
  );

  return files.flat();
};

const isBarePackageSpecifier = (specifier: string) =>
  !specifier.startsWith('.') && !specifier.startsWith('/') && !specifier.startsWith('file:') && !specifier.startsWith('node:');

const findIgnoredBarePackageImports = (source: string) => {
  const ignoredImport = /import\s*\(\s*\/\*\s*@vite-ignore\s*\*\/\s*(['"])([^'"]+)\1\s*\)/g;

  return [...source.matchAll(ignoredImport)]
    .filter((match) => isBarePackageSpecifier(match[2]))
    .map((match) => ({ index: match.index, specifier: match[2] }));
};

describe('server runtime imports', () => {
  it('detects ignored imports that leave package resolution to production Node', () => {
    const source = `await import(/* @vite-ignore */ 'auth-astro/server');`;

    expect(findIgnoredBarePackageImports(source)).toEqual([{ index: 6, specifier: 'auth-astro/server' }]);
  });

  it('does not bypass Vite bundling for bare package specifiers', async () => {
    const sourceFiles = await findSourceFiles(sourceDirectory);
    const offenders: string[] = [];

    await Promise.all(
      sourceFiles.map(async (file) => {
        const source = await fs.readFile(file, 'utf8');

        for (const ignoredImport of findIgnoredBarePackageImports(source)) {
          const line = source.slice(0, ignoredImport.index).split('\n').length;
          offenders.push(`${path.relative(sourceDirectory, file)}:${line} imports ${ignoredImport.specifier}`);
        }
      })
    );

    expect(offenders.sort()).toEqual([]);
  });
});
