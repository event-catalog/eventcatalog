import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import matter from 'gray-matter';
import path from 'node:path';
import { cachedMatterRead, disableFileCache, enableFileCache, findFileById, upsertFileCacheEntry } from '../internal/utils';

const ABS_CATALOG_PATH = path.join(__dirname, 'catalog-cache-path-normalization');
const REL_CATALOG_PATH = path.relative(process.cwd(), ABS_CATALOG_PATH);
const ABS_RESOURCE_PATH = path.join(ABS_CATALOG_PATH, 'events', 'OrderPlaced', 'index.mdx');
const REL_RESOURCE_PATH = path.relative(process.cwd(), ABS_RESOURCE_PATH);

const makeDocument = (summary: string, markdown: string) =>
  matter.stringify(markdown, {
    id: 'OrderPlaced',
    name: 'OrderPlaced',
    version: '1.0.0',
    summary,
  });

beforeEach(() => {
  disableFileCache();
  fs.rmSync(ABS_CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(ABS_RESOURCE_PATH), { recursive: true });
});

afterEach(() => {
  disableFileCache();
  fs.rmSync(ABS_CATALOG_PATH, { recursive: true, force: true });
});

describe('file cache path normalization', () => {
  it('updates cached matter when upserting with relative paths', async () => {
    const initialDocument = makeDocument('Initial summary', '# Initial');
    fs.writeFileSync(ABS_RESOURCE_PATH, initialDocument);

    enableFileCache(REL_CATALOG_PATH);

    const initialResolvedPath = await findFileById(REL_CATALOG_PATH, 'OrderPlaced', '1.0.0');
    expect(initialResolvedPath).toBeDefined();
    expect(cachedMatterRead(initialResolvedPath!).data.summary).toBe('Initial summary');

    const updatedDocument = makeDocument('Updated summary', '# Updated');
    fs.writeFileSync(ABS_RESOURCE_PATH, updatedDocument);
    upsertFileCacheEntry(REL_CATALOG_PATH, REL_RESOURCE_PATH, updatedDocument);

    const updatedResolvedPath = await findFileById(REL_CATALOG_PATH, 'OrderPlaced', '1.0.0');
    expect(updatedResolvedPath).toBeDefined();
    expect(cachedMatterRead(updatedResolvedPath!).data.summary).toBe('Updated summary');
  });
});
