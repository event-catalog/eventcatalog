import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import { addNodes, buildNode, canvasDocumentName, getCanvasMaps, readMeta, setMeta } from '../canvas-doc';
import { createStorage, memoryStorage, sqliteStorage } from '../server/storage';

const NAME = canvasDocumentName('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d');

let directory: string;
beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-storage-'));
});
afterEach(() => {
  fs.rmSync(directory, { recursive: true, force: true });
});

const stateOf = (title: string) => {
  const doc = new Y.Doc();
  setMeta(doc, { title });
  addNodes(doc, [{ ...buildNode('service', {}, { x: 0, y: 0 }), id: 'orders' }]);
  return Y.encodeStateAsUpdate(doc);
};
const restore = (state: Uint8Array | undefined) => {
  const doc = new Y.Doc();
  if (state) Y.applyUpdate(doc, state);
  return { title: readMeta(doc).title, nodes: [...getCanvasMaps(doc).nodes.keys()] };
};

const hasNodeSqlite = await import(/* @vite-ignore */ ['node', 'sqlite'].join(':')).then(
  () => true,
  () => false
);

describe('Studio storage', () => {
  it('keeps canvases in memory by default (nothing to load after a restart)', async () => {
    const storage = createStorage(undefined, directory);
    expect(storage.type).toBe('memory');
    storage.save(NAME, stateOf('Payments'));
    expect(await memoryStorage().loadAll()).toEqual({ canvases: new Map(), deleted: new Set() });
  });

  it.skipIf(!hasNodeSqlite)('stores canvases in a SQLite database and loads them back, in a new folder if needed', async () => {
    const file = path.join(directory, 'data', 'studio.db');
    const storage = sqliteStorage(file);
    expect(await storage.loadAll()).toEqual({ canvases: new Map(), deleted: new Set() });
    storage.save(NAME, stateOf('First'));
    storage.save(NAME, stateOf('First, again'), 1_700_000_000_000);

    const { canvases: loaded } = await sqliteStorage(file).loadAll();
    expect([...loaded.keys()]).toEqual([NAME]);
    expect(restore(loaded.get(NAME)?.state)).toEqual({ title: 'First, again', nodes: ['orders'] });
    // When it last changed, not when it was stored (e.g. every open canvas is stored again as the server stops)
    expect(loaded.get(NAME)?.updatedAt).toBe(1_700_000_000_000);
  });

  it.skipIf(!hasNodeSqlite)('records a canvas as changed when it is stored, when the change time is not known', async () => {
    const file = path.join(directory, 'studio.db');
    const before = Date.now();
    const storage = sqliteStorage(file);
    await storage.loadAll();
    storage.save(NAME, stateOf('Payments'));
    expect((await sqliteStorage(file).loadAll()).canvases.get(NAME)?.updatedAt).toBeGreaterThanOrEqual(before);
  });

  it.skipIf(!hasNodeSqlite)('deletes a canvas and remembers it was deleted, across restarts', async () => {
    const file = path.join(directory, 'studio.db');
    const storage = sqliteStorage(file);
    await storage.loadAll();
    storage.save(NAME, stateOf('Payments'));
    storage.remove(NAME);
    expect(await sqliteStorage(file).loadAll()).toEqual({ canvases: new Map(), deleted: new Set([NAME]) });
  });

  it("keeps canvases in the catalog's SQLite database when it has one", () => {
    expect(createStorage({ type: 'sqlite' }, directory)).toMatchObject({
      type: 'sqlite',
      location: path.join(directory, '.eventcatalog/eventcatalog.db'),
    });
  });
});
