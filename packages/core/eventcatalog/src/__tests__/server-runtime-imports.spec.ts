import fs from 'node:fs/promises';
import path from 'node:path';

const sourceDirectory = path.resolve(import.meta.dirname, '..');
const coreDirectory = path.resolve(sourceDirectory, '../..');
const sourceExtensions = new Set(['.astro', '.js', '.mjs', '.ts', '.tsx']);
const ignoredDirectories = new Set(['.astro', '__tests__', '__mocks__', 'dist', 'node_modules', 'public']);

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

// import(join(...)) or import(path.resolve(...)), with or without a /* @vite-ignore */ comment. Node's ES module loader
// only takes URLs: on Windows an absolute path (C:\catalog\eventcatalog.auth.js) reads as a URL with the scheme "c:"
// and the import fails, so a catalog's files are imported by their file:// URL (importCatalogModule). Tests run on
// Linux, where importing a path works, so this looks for the code instead. It only sees a path built in the import
// itself: one in a variable (import(file)) isn't caught, and CI's Windows SSR job covers those.
const pathImport = /import\(\s*(?:\/\*[^]*?\*\/\s*)?(?:path\.)?(?:join|resolve)\(/g;

const findPathImports = (source: string) => [...source.matchAll(pathImport)].map((match) => match.index);

const findPathImportsIn = async (directories: string[]) => {
  const sourceFiles = (await Promise.all(directories.map(findSourceFiles))).flat();
  const offenders: string[] = [];

  await Promise.all(
    sourceFiles.map(async (file) => {
      const source = await fs.readFile(file, 'utf8');

      for (const index of findPathImports(source)) {
        const line = source.slice(0, index).split('\n').length;
        offenders.push(`${path.relative(coreDirectory, file)}:${line}`);
      }
    })
  );

  return offenders.sort();
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

  it.each([
    `await import(/* @vite-ignore */ join(catalogDirectory, 'eventcatalog.auth.js'));`,
    `await import(path.join(projectDirectory, 'eventcatalog.chat.js'));`,
    `await import( resolve(projectDirectory, 'middleware.ts'));`,
  ])('detects an import of a path built with join or resolve: %s', (source) => {
    expect(findPathImports(source)).toHaveLength(1);
  });

  it.each([
    `await importCatalogModule('eventcatalog.auth.js');`,
    `await import(/* @vite-ignore */ pathToFileURL(join(directory, file)).href);`,
    `await import(/* @vite-ignore */ ['node', 'sqlite'].join(':'));`,
  ])('allows an import of a URL or a package: %s', (source) => {
    expect(findPathImports(source)).toEqual([]);
  });

  it('does not import a path built with join or resolve, which fails on Windows', async () => {
    const offenders = await findPathImportsIn([path.join(coreDirectory, 'eventcatalog'), path.join(coreDirectory, 'src')]);

    expect(offenders).toEqual([]);
  });
});
