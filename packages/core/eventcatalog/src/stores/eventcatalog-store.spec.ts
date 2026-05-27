import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { EventCatalogStore } from './eventcatalog-store';

type TestStoreResources = {
  users: { id: string; name: string }[];
  teams: { id: string; name: string }[];
};

describe('EventCatalogStore', () => {
  it('writes one collection while preserving the rest of the store', async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), 'eventcatalog-store-'));
    const storePath = EventCatalogStore.getStorePath(tempDir, 'directory');
    const store = new EventCatalogStore<TestStoreResources>({
      storePath,
      resources: {
        users: [],
        teams: [],
      },
    });

    try {
      await store.writeCollection('teams', [{ id: 'platform', name: 'Platform' }]);
      await store.writeCollection('users', [{ id: 'jane', name: 'Jane' }]);

      const stored = JSON.parse(await readFile(storePath, 'utf8'));
      expect(stored).toMatchObject({
        version: '1',
        resources: {
          users: [{ id: 'jane', name: 'Jane' }],
          teams: [{ id: 'platform', name: 'Platform' }],
        },
      });
      expect(stored.generatedAt).toEqual(expect.any(String));
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('does not create a store file when clearing a collection that has not been generated', async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), 'eventcatalog-store-'));
    const storePath = EventCatalogStore.getStorePath(tempDir, 'directory');
    const store = new EventCatalogStore<TestStoreResources>({
      storePath,
      resources: {
        users: [],
        teams: [],
      },
    });

    try {
      await store.clearCollectionIfStoreExists('users');
      expect(await store.exists()).toBe(false);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
