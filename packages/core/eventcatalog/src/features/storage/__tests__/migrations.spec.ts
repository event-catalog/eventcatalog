import { describe, it, expect } from 'vitest';
import { MIGRATIONS, isDatabaseTooNew, migrate, toMigrations, type Database } from '../migrations';

const hasNodeSqlite = await import(/* @vite-ignore */ ['node', 'sqlite'].join(':')).then(
  () => true,
  () => false
);
const openDatabase = async (): Promise<Database & { close: () => void }> => {
  const { DatabaseSync } = await import(/* @vite-ignore */ ['node', 'sqlite'].join(':'));
  return new DatabaseSync(':memory:');
};
const tables = (database: Database) =>
  (database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as { name: string }[]).map(
    (row) => row.name
  );
const applied = (database: Database) =>
  (database.prepare('SELECT version, name FROM migrations ORDER BY version').all() as object[]).map((row) => ({ ...row }));

describe('Database migrations', () => {
  it('are read from the migrations folder, in order', () => {
    expect(MIGRATIONS.map((migration) => migration.name)).toEqual(['0001-studio-canvases']);
    expect(MIGRATIONS.map((migration) => migration.version)).toEqual([1]);
  });

  it('refuses misnamed files, and gaps or repeats in the numbering', () => {
    expect(() => toMigrations({ './migrations/canvases.sql': '' })).toThrow(/named like 0003-what-it-does\.sql/);
    expect(() => toMigrations({ './migrations/0001-a.sql': '', './migrations/0003-c.sql': '' })).toThrow(
      /expected 2 before 0003-c/
    );
    expect(() => toMigrations({ './migrations/0001-a.sql': '', './migrations/0001-b.sql': '' })).toThrow(/expected 2/);
  });

  it.skipIf(!hasNodeSqlite)('runs each migration once, recording it', async () => {
    const database = await openDatabase();
    migrate(database);
    migrate(database);
    expect(tables(database)).toEqual(['migrations', 'studio_canvases', 'studio_deleted_canvases']);
    expect(applied(database)).toEqual([{ version: 1, name: '0001-studio-canvases' }]);
    database.close();
  });

  it.skipIf(!hasNodeSqlite)('runs only the new ones on a database that has run some', async () => {
    const database = await openDatabase();
    migrate(database);
    const next = { version: 2, name: '0002-canvas-tags', sql: 'CREATE TABLE canvas_tags (name TEXT, tag TEXT);' };
    migrate(database, [...MIGRATIONS, next]);
    expect(tables(database)).toContain('canvas_tags');
    expect(applied(database).map((row) => (row as { version: number }).version)).toEqual([1, 2]);
    database.close();
  });

  it.skipIf(!hasNodeSqlite)('leaves a migration that fails undone, and says which one it was', async () => {
    const database = await openDatabase();
    const broken = [
      { version: 1, name: '0001-half-done', sql: 'CREATE TABLE first (id INTEGER); CREATE TABLE first (id INTEGER);' },
    ];
    expect(() => migrate(database, broken)).toThrow(/Could not run migration 0001-half-done/);
    expect(tables(database)).toEqual(['migrations']);
    expect(applied(database)).toEqual([]);
    database.close();
  });

  it.skipIf(!hasNodeSqlite)('refuses a database a newer EventCatalog has migrated', async () => {
    const database = await openDatabase();
    migrate(database, [...MIGRATIONS, { version: 2, name: '0002-from-the-future', sql: 'SELECT 1;' }]);
    expect(() => migrate(database)).toThrow(/updated by a newer EventCatalog \(migration 2; this version knows up to 1\)/);
    // Told apart from other failures (Studio doesn't fall back to memory for it)
    const error = (() => {
      try {
        migrate(database);
      } catch (thrown) {
        return thrown;
      }
    })();
    expect(isDatabaseTooNew(error)).toBe(true);
    expect(isDatabaseTooNew(new Error('disk full'))).toBe(false);
    database.close();
  });
});
