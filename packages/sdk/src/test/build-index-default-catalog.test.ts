import path from 'node:path';
import { describe, expect, it } from 'vitest';
import utils, { parseIndex } from '../index';

const CATALOG_PATH = path.resolve(__dirname, '../../../../examples/default');
const INDEX_SNAPSHOT_PATH = path.join(__dirname, 'fixtures/build-index/default-catalog-index.json');

describe('buildIndex against the default example catalog', () => {
  it('matches the committed index snapshot', async () => {
    const index = await utils(CATALOG_PATH).buildIndex({
      source: 'eventcatalog/examples/default',
      commit: 'fixture',
    });

    const contentPaths = index.resources.map((resource) => resource.contentPath);
    const duplicateContentPaths = [
      ...new Set(contentPaths.filter((contentPath, index) => contentPaths.indexOf(contentPath) !== index)),
    ];

    expect(duplicateContentPaths).toEqual([]);
    expect(parseIndex(index)).toEqual(index);

    await expect(`${JSON.stringify(index, null, 2)}\n`).toMatchFileSnapshot(INDEX_SNAPSHOT_PATH);
  });
});
