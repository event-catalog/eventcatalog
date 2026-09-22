import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearCatalogCache, prepareCatalogRuntime } from '../catalog-runtime';

describe('prepareCatalogRuntime', () => {
  let directory: string;
  let projectDirectory: string;
  let packageDirectory: string;
  let catalogDirectory: string;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eventcatalog-runtime-'));
    projectDirectory = path.join(directory, 'catalog');
    packageDirectory = path.join(directory, 'installed package', 'eventcatalog');
    catalogDirectory = path.join(projectDirectory, '.astro/eventcatalog');
    fs.mkdirSync(path.join(packageDirectory, 'src/pages'), { recursive: true });
    fs.mkdirSync(path.join(packageDirectory, 'public/generated'), { recursive: true });
    fs.writeFileSync(path.join(packageDirectory, 'src/pages/index.astro'), '<h1>Packaged application</h1>');
    fs.writeFileSync(path.join(packageDirectory, 'public/logo.svg'), '<svg />');
    fs.writeFileSync(path.join(packageDirectory, 'public/generated/stale.json'), '{}');
    fs.writeFileSync(
      path.join(packageDirectory, 'tsconfig.json'),
      JSON.stringify({
        '//': 'Shared alias table maintenance note',
        compilerOptions: { paths: { '@utils/*': ['src/utils/*'], '@config': ['./eventcatalog.config.js'] } },
        exclude: ['src/custom-pages'],
      })
    );
  });

  afterEach(() => fs.rmSync(directory, { recursive: true, force: true }));

  const prepare = () => prepareCatalogRuntime({ projectDirectory, packageDirectory, catalogDirectory });

  it('clears the whole generated Astro cache without deleting catalog source or other state', () => {
    prepare();
    const cache = path.join(projectDirectory, '.astro');
    for (const file of ['data-store.json', 'types.d.ts', 'content-assets.mjs'])
      fs.writeFileSync(path.join(cache, file), 'generated');
    const state = path.join(projectDirectory, '.eventcatalog/store');
    fs.mkdirSync(state, { recursive: true });
    fs.writeFileSync(path.join(state, 'directory.json'), 'state');
    fs.writeFileSync(path.join(projectDirectory, 'eventcatalog.config.js'), 'source');

    clearCatalogCache(projectDirectory);
    expect(fs.existsSync(cache)).toBe(false);
    expect(fs.readFileSync(path.join(state, 'directory.json'), 'utf8')).toBe('state');
    expect(fs.readFileSync(path.join(projectDirectory, 'eventcatalog.config.js'), 'utf8')).toBe('source');
    expect(() => clearCatalogCache(projectDirectory)).not.toThrow();
  });

  it('does not follow an Astro cache symlink outside the project', () => {
    const external = path.join(directory, 'external-cache');
    fs.mkdirSync(external, { recursive: true });
    fs.mkdirSync(projectDirectory, { recursive: true });
    fs.writeFileSync(path.join(external, 'keep.txt'), 'keep');
    fs.symlinkSync(external, path.join(projectDirectory, '.astro'), 'junction');
    clearCatalogCache(projectDirectory);
    expect(fs.readFileSync(path.join(external, 'keep.txt'), 'utf8')).toBe('keep');
  });

  it('generates only collection and type metadata without creating a copied application', () => {
    prepare();
    expect(fs.readFileSync(path.join(catalogDirectory, 'content.config.ts'), 'utf8')).toBe(
      `export { collections } from ${JSON.stringify(path.join(packageDirectory, 'src/content.config.ts').replace(/\\/g, '/'))};\n`
    );
    expect(fs.existsSync(path.join(catalogDirectory, 'src/pages'))).toBe(false);
    expect(fs.readdirSync(catalogDirectory).sort()).toEqual(['content.config.ts', 'tsconfig.json']);
    expect(fs.existsSync(path.join(projectDirectory, '.eventcatalog-core'))).toBe(false);
  });

  it('does not copy public assets or dependencies into the metadata cache', () => {
    prepare();
    expect(fs.existsSync(path.join(catalogDirectory, 'public'))).toBe(false);
    expect(fs.existsSync(path.join(catalogDirectory, 'node_modules'))).toBe(false);
  });

  it('resolves core types from the package and customizations from the current catalog', () => {
    prepare();
    const config = JSON.parse(fs.readFileSync(path.join(catalogDirectory, 'tsconfig.json'), 'utf8'));
    const posix = (value: string) => value.replace(/\\/g, '/');
    expect(config.compilerOptions.paths['@utils/*']).toEqual([posix(path.join(packageDirectory, 'src/utils/*'))]);
    expect(config.compilerOptions.paths['@config']).toEqual([posix(path.join(projectDirectory, 'eventcatalog.config.js'))]);
    expect(config.compilerOptions.paths['@catalog/components/*']).toEqual([
      posix(path.join(projectDirectory, 'components/*')),
      posix(path.join(projectDirectory, 'federated/components/*')),
    ]);
    expect(config.compilerOptions.paths['astro/zod'][0]).toMatch(/\/astro\/dist\/zod\.d\.ts$/);
    expect(config.exclude).toEqual([posix(path.join(packageDirectory, 'src/custom-pages'))]);
  });

  it('does not rewrite unchanged metadata or alter an existing legacy runtime', () => {
    prepare();
    const wrapper = path.join(catalogDirectory, 'content.config.ts');
    fs.utimesSync(wrapper, new Date(1000), new Date(1000));
    const legacyPages = path.join(projectDirectory, '.eventcatalog-core/src/pages');
    fs.mkdirSync(legacyPages, { recursive: true });
    fs.writeFileSync(path.join(legacyPages, 'index.astro'), 'legacy');
    prepare();
    expect(fs.statSync(wrapper).mtimeMs).toBe(1000);
    expect(fs.readFileSync(path.join(legacyPages, 'index.astro'), 'utf8')).toBe('legacy');
  });

  it('refuses to write runtime files into the installed application or project root', () => {
    for (const unsafeDirectory of [packageDirectory, projectDirectory]) {
      expect(() => prepareCatalogRuntime({ projectDirectory, packageDirectory, catalogDirectory: unsafeDirectory })).toThrow(
        'The catalog runtime must be separate from the project and installed application directories.'
      );
    }
  });
});
