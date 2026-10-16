import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import createSDK from '@eventcatalog/sdk';
import {
  getArchitectureExportPath,
  isCatalogAuthEnabled,
  resolveArchitectureExport,
  writeArchitectureExport,
  getCustomExportsDir,
  hasCustomExports,
  resolveCustomExports,
  writeCustomExportsToBuild,
} from '../architecture-export';

describe('resolveArchitectureExport', () => {
  it('writes the architecture reference when the config says nothing about it', () => {
    expect(resolveArchitectureExport({}, { authEnabled: false })).toEqual({ enabled: true });
    expect(resolveArchitectureExport(undefined, { authEnabled: false })).toEqual({ enabled: true });
  });

  it('skips it when the catalog opts out with exports.html.enabled: false', () => {
    expect(resolveArchitectureExport({ exports: { html: { enabled: false } } }, { authEnabled: false })).toEqual({
      enabled: false,
      reason: 'disabled',
    });
  });

  it('skips it for catalogs with auth unless they opt in, because build output is served without auth', () => {
    expect(resolveArchitectureExport({}, { authEnabled: true })).toEqual({ enabled: false, reason: 'auth' });
    expect(resolveArchitectureExport({ exports: { html: { enabled: true } } }, { authEnabled: true })).toEqual({
      enabled: true,
    });
  });
});

describe('isCatalogAuthEnabled', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ec-architecture-auth-'));
    fs.writeFileSync(path.join(projectDir, 'eventcatalog.auth.js'), '// export default { providers: {} }');
  });

  afterEach(() => {
    fs.rmSync(projectDir, { recursive: true, force: true });
  });

  it('treats auth as off when the auth file exists but auth is not enabled, as in new catalogs', () => {
    expect(isCatalogAuthEnabled({ config: {}, projectDir, isServer: true })).toBe(false);
  });

  it('treats auth as off for static builds, which have no sign-in', () => {
    expect(isCatalogAuthEnabled({ config: { auth: { enabled: true } }, projectDir, isServer: false })).toBe(false);
  });

  it('treats auth as on when it is enabled, the auth file exists and the catalog runs as a server', () => {
    expect(isCatalogAuthEnabled({ config: { auth: { enabled: true } }, projectDir, isServer: true })).toBe(true);
  });
});

describe('getArchitectureExportPath', () => {
  it('writes to the output folder for static builds and to its client folder for server builds', () => {
    expect(getArchitectureExportPath({ outDir: '/site/dist', isServer: false })).toBe('/site/dist/architecture.html');
    expect(getArchitectureExportPath({ outDir: '/site/dist', isServer: true })).toBe('/site/dist/client/architecture.html');
  });
});

describe('writeArchitectureExport', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ec-architecture-export-'));
  });

  afterEach(() => {
    fs.rmSync(projectDir, { recursive: true, force: true });
  });

  it('writes architecture.html for the catalog into the build output', async () => {
    await createSDK(projectDir).writeEvent({ id: 'OrderPlaced', name: 'Order Placed', version: '1.0.0', markdown: '' });
    const outDir = path.join(projectDir, 'dist');

    const result = await writeArchitectureExport({ projectDir, outDir, isServer: false });

    expect(result.path).toBe(path.join(outDir, 'architecture.html'));
    const html = fs.readFileSync(result.path, 'utf-8');
    expect(html).toContain('id="event-OrderPlaced"');
    expect(html).toContain('npx eventcatalog build');
  });
});

describe('custom exports', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ec-custom-exports-'));
  });

  afterEach(() => {
    fs.rmSync(projectDir, { recursive: true, force: true });
  });

  const writeExportFile = (folder: string, name: string, source: string) => {
    fs.mkdirSync(path.join(projectDir, folder), { recursive: true });
    fs.writeFileSync(path.join(projectDir, folder, name), source);
  };

  it('are written on build unless turned off, and only when opted in with auth', () => {
    expect(resolveCustomExports({}, { authEnabled: false })).toEqual({ enabled: true });
    expect(resolveCustomExports({ exports: { custom: { enabled: false } } }, { authEnabled: false })).toEqual({
      enabled: false,
      reason: 'disabled',
    });
    expect(resolveCustomExports({}, { authEnabled: true })).toEqual({ enabled: false, reason: 'auth' });
    expect(resolveCustomExports({ exports: { custom: { enabled: true } } }, { authEnabled: true })).toEqual({
      enabled: true,
    });
  });

  it('are only looked for when the catalog has custom export files', () => {
    expect(hasCustomExports({ projectDir, config: {} })).toBe(false);
    // The JSON dumps `eventcatalog export` writes to exports/ aren't custom exports
    writeExportFile('exports', 'catalog-2026-10-15.json', '{}');
    expect(hasCustomExports({ projectDir, config: {} })).toBe(false);
    writeExportFile('public-docs', 'partners.mdx', '---\ntitle: P\n---\n');
    expect(hasCustomExports({ projectDir, config: {} })).toBe(false);
    expect(hasCustomExports({ projectDir, config: { exports: { custom: { dir: 'public-docs' } } } })).toBe(true);
  });

  it('are written to exports/ in the build output', async () => {
    await createSDK(projectDir).writeEvent({ id: 'OrderPlaced', name: 'Order Placed', version: '1.0.0', markdown: '' });
    writeExportFile('exports', 'partners.mdx', '---\ntitle: For partners\ninclude:\n  - event: OrderPlaced\n---\n');
    const outDir = path.join(projectDir, 'dist');

    const {
      written: [exported],
    } = await writeCustomExportsToBuild({ projectDir, outDir, isServer: false, config: {} });

    expect(exported.path).toBe(path.join(outDir, 'exports', 'partners.html'));
    expect(fs.readFileSync(exported.path, 'utf-8')).toContain('<h1>For partners</h1>');
    expect(getCustomExportsDir({ outDir: '/site/dist', isServer: true })).toBe('/site/dist/client/exports');
  });

  it('skip a broken file and still write the others', async () => {
    await createSDK(projectDir).writeEvent({ id: 'OrderPlaced', name: 'Order Placed', version: '1.0.0', markdown: '' });
    writeExportFile('exports', 'partners.mdx', '---\ntitle: For partners\ninclude:\n  - event: OrderPlaced\n---\n');
    writeExportFile('exports', 'broken.mdx', '---\ninclude:\n  - event: OrderPlaced\n---\n');

    const { written, failed } = await writeCustomExportsToBuild({
      projectDir,
      outDir: path.join(projectDir, 'dist'),
      isServer: false,
      config: {},
    });

    expect(written.map((w) => w.spec.id)).toEqual(['partners']);
    expect(failed).toEqual([
      expect.objectContaining({
        id: 'broken',
        file: path.join('exports', 'broken.mdx'),
        error: expect.objectContaining({ problems: ['title is missing'] }),
      }),
    ]);
  });
});
