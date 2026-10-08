import fs from 'node:fs';
import path from 'node:path';

/**
 * Where Studio keeps canvases (`studio.storage` in eventcatalog.config.js). People and agents always work on the copy
 * the collaboration server holds in memory, so storage is only read when the server starts, and written a moment
 * after a canvas changes: it doesn't slow down editing. Canvases are stored as their whole Yjs document
 * (Y.encodeStateAsUpdate), so nothing is lost between restarts.
 */
export type StudioStorageConfig =
  /** Kept only while the server runs: canvases are lost when it restarts or redeploys (the default) */
  | { type: 'memory' }
  /**
   * One SQLite database file (default `.eventcatalog/studio.db` in the catalog). Needs Node.js 22.13 or later. In a
   * container, put it on a volume so it survives redeploys.
   */
  | { type: 'sqlite'; path?: string };

export type StorageType = StudioStorageConfig['type'];

export const DEFAULT_STORAGE: StudioStorageConfig = { type: 'memory' };
const DEFAULT_SQLITE_PATH = '.eventcatalog/studio.db';

/** A canvas as stored: its whole document, and when it last changed */
export type StoredCanvas = { state: Uint8Array; updatedAt?: number };

export type CanvasStorage = {
  type: StorageType;
  /** Where it is, for logs (e.g. the database file) */
  location?: string;
  /** Every stored canvas, by document name (read once, when the server starts) */
  loadAll: () => Promise<Map<string, StoredCanvas>>;
  /**
   * Stores a canvas's document, with when it last changed (now when not known). Synchronous, so canvases can still
   * be saved as the process exits.
   */
  save: (documentName: string, state: Uint8Array, updatedAt?: number) => void;
};

export const memoryStorage = (): CanvasStorage => ({
  type: 'memory',
  loadAll: async () => new Map(),
  save: () => {},
});

type SqliteDatabase = {
  exec: (sql: string) => void;
  prepare: (sql: string) => { run: (...values: unknown[]) => unknown; all: () => unknown[] };
};

export const sqliteStorage = (file: string): CanvasStorage => {
  let database: SqliteDatabase | undefined;
  let upsert: ReturnType<SqliteDatabase['prepare']> | undefined;
  return {
    type: 'sqlite',
    location: file,
    loadAll: async () => {
      // Node's built-in SQLite (no native package to install), asked of Node itself: the dev server loads this
      // through Vite, which doesn't know node:sqlite and fails to import it
      type Sqlite = { DatabaseSync: new (file: string) => SqliteDatabase };
      const getBuiltinModule = (process as { getBuiltinModule?: (id: string) => unknown }).getBuiltinModule;
      let sqlite: Sqlite | undefined;
      try {
        sqlite = getBuiltinModule
          ? (getBuiltinModule('node:sqlite') as Sqlite | undefined)
          : await import(/* @vite-ignore */ ['node', 'sqlite'].join(':'));
      } catch (error) {
        throw new Error(`Could not load node:sqlite (${(error as Error).message})`);
      }
      if (!sqlite?.DatabaseSync) {
        throw new Error(
          `SQLite storage needs Node.js 22.13 or later (it uses node:sqlite); this is Node.js ${process.versions.node}`
        );
      }
      fs.mkdirSync(path.dirname(file), { recursive: true });
      database = new sqlite.DatabaseSync(file);
      database.exec('PRAGMA journal_mode = WAL');
      database.exec(
        'CREATE TABLE IF NOT EXISTS canvases (name TEXT PRIMARY KEY, state BLOB NOT NULL, updated_at INTEGER NOT NULL)'
      );
      upsert = database.prepare(
        'INSERT INTO canvases (name, state, updated_at) VALUES (?, ?, ?) ON CONFLICT(name) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at'
      );
      const rows = database.prepare('SELECT name, state, updated_at FROM canvases').all() as {
        name: string;
        state: Uint8Array;
        updated_at: number;
      }[];
      return new Map(rows.map((row) => [row.name, { state: new Uint8Array(row.state), updatedAt: Number(row.updated_at) }]));
    },
    save: (documentName, state, updatedAt = Date.now()) => {
      if (!upsert) throw new Error('SQLite storage was used before it was opened');
      upsert.run(documentName, state, updatedAt);
    },
  };
};

/** The storage a config asks for, with paths relative to the catalog. Unknown types are an error. */
export const createStorage = (config: StudioStorageConfig | undefined, projectDirectory: string): CanvasStorage => {
  const chosen = config ?? DEFAULT_STORAGE;
  const resolve = (location: string | undefined, fallback: string) => path.resolve(projectDirectory, location ?? fallback);
  switch (chosen.type) {
    case 'memory':
      return memoryStorage();
    case 'sqlite':
      return sqliteStorage(resolve(chosen.path, DEFAULT_SQLITE_PATH));
    default:
      throw new Error(`Unknown studio.storage type "${(chosen as { type?: string }).type}": use "memory" or "sqlite"`);
  }
};
