import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { shouldCopyCoreEntry } from '../copy-core';

const sourceRoot = path.join('/catalog', 'node_modules', '@eventcatalog', 'core', 'eventcatalog');
const entry = (...parts: string[]) => path.join(sourceRoot, ...parts);

describe('shouldCopyCoreEntry', () => {
  it('copies catalog source files, including names that mention spec or test', () => {
    expect(shouldCopyCoreEntry(sourceRoot, sourceRoot)).toBe(true);
    expect(shouldCopyCoreEntry(sourceRoot, entry('src', 'components', 'MDX', 'CodeGroup', 'CodeGroup.tsx'))).toBe(true);
    expect(shouldCopyCoreEntry(sourceRoot, entry('src', 'utils', 'remote-spec.ts'))).toBe(true);
    expect(shouldCopyCoreEntry(sourceRoot, entry('src', 'components', 'Grids', 'specification-utils.ts'))).toBe(true);
    expect(shouldCopyCoreEntry(sourceRoot, entry('src', 'pages', 'docs', 'services', '_latest-version-route.ts'))).toBe(true);
  });

  it('skips generated directories and installed dependencies', () => {
    expect(shouldCopyCoreEntry(sourceRoot, entry('.astro'))).toBe(false);
    expect(shouldCopyCoreEntry(sourceRoot, entry('.astro', 'settings.json'))).toBe(false);
    expect(shouldCopyCoreEntry(sourceRoot, entry('dist', 'server', 'entry.mjs'))).toBe(false);
    expect(shouldCopyCoreEntry(sourceRoot, entry('node_modules', 'vitest', 'index.js'))).toBe(false);
  });

  it('skips __tests__ directories even when an older package still contains them', () => {
    expect(shouldCopyCoreEntry(sourceRoot, entry('src', 'utils', '__tests__'))).toBe(false);
    expect(shouldCopyCoreEntry(sourceRoot, entry('src', 'utils', '__tests__', 'events', 'events.spec.ts'))).toBe(false);
  });

  it('skips colocated spec and test files that Vite would otherwise scan', () => {
    const skipped = [
      ['src', 'components', 'MDX', 'CodeGroup', 'code-group.spec.tsx'],
      ['src', 'components', 'MDX', 'Columns', 'columns.spec.tsx'],
      ['src', 'components', 'EnvironmentDropdown.test.ts'],
      ['src', 'components', 'SchemaExplorer', 'JSONSchemaViewer.test.tsx'],
      ['src', 'utils', 'collections', 'glob-loader.spec.ts'],
      ['src', 'example.spec.js'],
      ['src', 'example.spec.jsx'],
      ['src', 'example.spec.mjs'],
      ['src', 'example.spec.cjs'],
      ['src', 'example.spec.mts'],
      ['src', 'example.spec.cts'],
      ['src', 'example.test.js'],
      ['src', 'example.test.jsx'],
      ['src', 'example.test.mjs'],
      ['src', 'example.test.cjs'],
      ['src', 'example.test.mts'],
      ['src', 'example.test.cts'],
    ];

    for (const parts of skipped) {
      expect(shouldCopyCoreEntry(sourceRoot, entry(...parts))).toBe(false);
    }
  });

  it('does not copy spec files or __tests__ when used as the fs.cp filter', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eventcatalog-copy-core-'));
    const source = path.join(root, 'eventcatalog');
    const destination = path.join(root, '.eventcatalog-core');

    try {
      const files: Record<string, string> = {
        [path.join('src', 'components', 'MDX', 'CodeGroup', 'CodeGroup.tsx')]: 'export const CodeGroup = {};\n',
        [path.join('src', 'components', 'MDX', 'CodeGroup', 'code-group.spec.tsx')]: 'import { it } from "vitest";\n',
        [path.join('src', 'components', 'EnvironmentDropdown.test.ts')]: 'import { it } from "vitest";\n',
        [path.join('src', 'utils', '__tests__', 'events.spec.ts')]: 'import { it } from "vitest";\n',
        [path.join('src', 'utils', 'remote-spec.ts')]: 'export const remoteSpec = {};\n',
      };

      for (const [relativePath, contents] of Object.entries(files)) {
        const filePath = path.join(source, relativePath);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, contents);
      }

      fs.cpSync(source, destination, {
        recursive: true,
        filter: (src) => shouldCopyCoreEntry(source, src),
      });

      expect(fs.existsSync(path.join(destination, 'src', 'components', 'MDX', 'CodeGroup', 'CodeGroup.tsx'))).toBe(true);
      expect(fs.existsSync(path.join(destination, 'src', 'utils', 'remote-spec.ts'))).toBe(true);
      expect(fs.existsSync(path.join(destination, 'src', 'components', 'MDX', 'CodeGroup', 'code-group.spec.tsx'))).toBe(false);
      expect(fs.existsSync(path.join(destination, 'src', 'components', 'EnvironmentDropdown.test.ts'))).toBe(false);
      expect(fs.existsSync(path.join(destination, 'src', 'utils', '__tests__'))).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('published package files', () => {
  it('excludes colocated spec and test files from the eventcatalog tree', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8')) as { files: string[] };

    expect(packageJson.files).toContain('!eventcatalog/**/*.{spec,test}.{js,jsx,cjs,mjs,ts,tsx,cts,mts}');
    expect(packageJson.files).toContain('!eventcatalog/**/__tests__/');
  });
});
