import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getStorageType, getStudioMode, serializeStudioUsage } from '../analytics/studio-usage.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 14);

type Sqlite = {
  DatabaseSync: new (file: string) => {
    exec: (sql: string) => void;
    prepare: (sql: string) => { run: (...values: unknown[]) => void };
    close: () => void;
  };
};
const sqlite = (process as { getBuiltinModule?: (id: string) => unknown }).getBuiltinModule?.('node:sqlite') as
  | Sqlite
  | undefined;

describe('getStudioMode', () => {
  it.each([
    [{}, 'dev'],
    [{ output: 'server' }, 'dev'],
    [{ studio: { enabled: true } }, 'dev'],
    [{ output: 'server', studio: { enabled: true } }, 'server'],
    [{ studio: { enabled: false } }, 'off'],
    [{ output: 'server', studio: { enabled: false } }, 'off'],
  ])('is %j -> %s', (config, mode) => {
    expect(getStudioMode(config)).toBe(mode);
  });
});

describe('getStorageType', () => {
  it('is memory by default', () => {
    expect(getStorageType({})).toBe('memory');
    expect(getStorageType({ storage: { type: 'sqlite' } })).toBe('sqlite');
  });
});

describe('serializeStudioUsage', () => {
  let catalogDirectory: string;

  beforeEach(() => {
    catalogDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'eventcatalog-studio-usage-'));
  });

  afterEach(() => {
    fs.rmSync(catalogDirectory, { recursive: true, force: true });
  });

  const sqliteConfig = { storage: { type: 'sqlite' } };

  it('is unknown when canvases are kept in memory, or Studio is off', () => {
    expect(serializeStudioUsage(catalogDirectory, {}, NOW)).toBe('canvases:unknown');
    expect(serializeStudioUsage(catalogDirectory, { ...sqliteConfig, studio: { enabled: false } }, NOW)).toBe('canvases:unknown');
  });

  it('counts nothing before the database is created', () => {
    expect(serializeStudioUsage(catalogDirectory, sqliteConfig, NOW)).toBe('canvases:0,changed7d:0,changed30d:0,deleted:0');
  });

  it.skipIf(!sqlite)('counts the canvases in the database and how recently they changed', () => {
    const file = path.join(catalogDirectory, 'data', 'studio.db');
    fs.mkdirSync(path.dirname(file));
    const database = new sqlite!.DatabaseSync(file);
    // Studio's tables, as the storage migrations create them
    database.exec(
      fs.readFileSync(
        path.join(__dirname, '../../eventcatalog/src/features/storage/sql/migrations/0001-studio-canvases.sql'),
        'utf8'
      )
    );
    const save = database.prepare('INSERT INTO studio_canvases (name, state, updated_at) VALUES (?, ?, ?)');
    save.run('today', new Uint8Array([1]), NOW - 1000);
    save.run('last-week', new Uint8Array([1]), NOW - 6 * DAY_IN_MS);
    save.run('last-month', new Uint8Array([1]), NOW - 20 * DAY_IN_MS);
    save.run('old', new Uint8Array([1]), NOW - 90 * DAY_IN_MS);
    database.prepare('INSERT INTO studio_deleted_canvases (name, deleted_at) VALUES (?, ?)').run('gone', NOW);
    database.close();

    const config = { storage: { type: 'sqlite', path: 'data/studio.db' } };
    expect(serializeStudioUsage(catalogDirectory, config, NOW)).toBe('canvases:4,changed7d:2,changed30d:3,deleted:1');
  });

  it('is unknown when the database has no Studio tables', () => {
    const file = path.join(catalogDirectory, '.eventcatalog', 'eventcatalog.db');
    fs.mkdirSync(path.dirname(file));
    fs.writeFileSync(file, 'not a database');

    expect(serializeStudioUsage(catalogDirectory, sqliteConfig, NOW)).toBe('canvases:unknown');
  });
});
