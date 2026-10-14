import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';

const config = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('../../../utils/eventcatalog-config/source', () => ({
  get default() {
    return config.current;
  },
}));

const { getDatabasePath, openDatabase, startStorage } = await import('../database');

const hasNodeSqlite = await import(/* @vite-ignore */ ['node', 'sqlite'].join(':')).then(
  () => true,
  () => false
);
const tables = async (file: string) => {
  const database = await openDatabase(file);
  return (database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as { name: string }[]).map(
    (row) => row.name
  );
};

let directory: string;
beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eventcatalog-database-'));
  config.current = {};
});
afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(directory, { recursive: true, force: true });
});

describe('The catalog database', () => {
  it('is kept in memory by default (no database)', () => {
    expect(getDatabasePath(undefined, directory)).toBeUndefined();
    expect(getDatabasePath({ type: 'memory' }, directory)).toBeUndefined();
  });

  it('is one SQLite file, in .eventcatalog by default, or where it is configured (relative to the catalog)', () => {
    expect(getDatabasePath({ type: 'sqlite' }, directory)).toBe(path.join(directory, '.eventcatalog/eventcatalog.db'));
    expect(getDatabasePath({ type: 'sqlite', path: 'data/state.db' }, directory)).toBe(path.join(directory, 'data/state.db'));
  });

  it('says which storage types there are when given an unknown one', () => {
    expect(() => getDatabasePath({ type: 'postgres' } as never, directory)).toThrow(/"memory" or "sqlite"/);
  });

  it.skipIf(!hasNodeSqlite)('is opened once per file, in a new folder if needed, and migrated', async () => {
    const file = path.join(directory, 'data', 'eventcatalog.db');
    expect(openDatabase(file)).toBe(openDatabase(file));
    expect(await tables(file)).toEqual(['migrations', 'studio_canvases', 'studio_deleted_canvases']);
  });

  it.skipIf(!hasNodeSqlite)('is opened and migrated when the server starts, if one is configured', async () => {
    config.current = { storage: { type: 'sqlite', path: 'eventcatalog.db' } };
    const file = await startStorage(directory);
    expect(file).toBe(path.join(directory, 'eventcatalog.db'));
    expect(fs.existsSync(file!)).toBe(true);
    expect(await tables(file!)).toContain('studio_canvases');
  });

  it('has nothing to open when state is kept in memory', async () => {
    expect(await startStorage(directory)).toBeUndefined();
    expect(fs.readdirSync(directory)).toEqual([]);
  });

  it('says when studio.storage is still set (it moved to storage)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    config.current = { studio: { storage: { type: 'sqlite' } } };
    await startStorage(directory);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('studio.storage is no longer used'));
  });
});
