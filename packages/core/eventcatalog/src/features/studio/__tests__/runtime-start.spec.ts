import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { MIGRATIONS, migrate, type Database } from '../../storage/migrations';

// Studio configured to store canvases in SQLite, in a folder made for each test
vi.mock('../../../utils/eventcatalog-config/source', () => ({
  default: { storage: { type: 'sqlite', path: 'eventcatalog.db' } },
}));

const RUNTIME_KEY = Symbol.for('eventcatalog.studio.runtime');
const hasNodeSqlite = await import(/* @vite-ignore */ ['node', 'sqlite'].join(':')).then(
  () => true,
  () => false
);

let directory: string;
const projectDirectory = process.env.PROJECT_DIR;
beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-start-'));
  process.env.PROJECT_DIR = directory;
  delete (globalThis as Record<symbol, unknown>)[RUNTIME_KEY];
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  process.env.PROJECT_DIR = projectDirectory;
  fs.rmSync(directory, { recursive: true, force: true });
  delete (globalThis as Record<symbol, unknown>)[RUNTIME_KEY];
});

describe('Starting Studio', () => {
  it.skipIf(!hasNodeSqlite)('uses the database configured', async () => {
    const { getStudioRuntime } = await import('../server/runtime');
    const runtime = getStudioRuntime();
    await runtime.start();
    expect(runtime.storage).toEqual({ type: 'sqlite', location: path.join(directory, 'eventcatalog.db') });
  });

  it.skipIf(!hasNodeSqlite)(
    "isn't available with a database a newer EventCatalog updated (rather than not saving anyone's changes)",
    async () => {
      const { DatabaseSync } = await import(/* @vite-ignore */ ['node', 'sqlite'].join(':'));
      const database = new DatabaseSync(path.join(directory, 'eventcatalog.db')) as Database & { close: () => void };
      migrate(database, [...MIGRATIONS, { version: MIGRATIONS.length + 1, name: '9999-from-the-future', sql: 'SELECT 1;' }]);
      database.close();

      const { getStudioRuntime, startStudio } = await import('../server/runtime');
      await expect(startStudio()).rejects.toThrow(/updated by a newer EventCatalog/);
      // Still refused when asked again, and never kept in memory instead
      await expect(startStudio()).rejects.toThrow(/updated by a newer EventCatalog/);
      expect(getStudioRuntime().storage.type).toBe('sqlite');
    }
  );
});
