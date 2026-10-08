import { getDatabasePath, openDatabase, type Database, type StorageConfig, type StorageType } from '../../storage/database';
import { namedStatements } from '../../storage/sql';
import storageSql from './sql/storage.sql?raw';

/**
 * Where Studio keeps canvases: the catalog's storage (`storage` in eventcatalog.config.js). People and agents always
 * work on the copy the collaboration server holds in memory, so storage is only read when the server starts, and
 * written a moment after a canvas changes: it doesn't slow down editing. Canvases are stored as their whole Yjs
 * document (Y.encodeStateAsUpdate), so nothing is lost between restarts.
 */

/** A canvas as stored: its whole document, and when it last changed */
export type StoredCanvas = { state: Uint8Array; updatedAt?: number };

/** What's stored: every canvas, and the canvases deleted (so a browser still holding one can't bring it back) */
export type StoredCanvases = { canvases: Map<string, StoredCanvas>; deleted: Set<string> };

export type CanvasStorage = {
  type: StorageType;
  /** Where it is, for logs (e.g. the database file) */
  location?: string;
  /** Every stored canvas by document name, and the deleted ones (read once, when the server starts) */
  loadAll: () => Promise<StoredCanvases>;
  /**
   * Stores a canvas's document, with when it last changed (now when not known). Synchronous, so canvases can still
   * be saved as the process exits.
   */
  save: (documentName: string, state: Uint8Array, updatedAt?: number) => void;
  /** Deletes a canvas, and records that it was deleted */
  remove: (documentName: string) => void;
};

export const memoryStorage = (): CanvasStorage => ({
  type: 'memory',
  loadAll: async () => ({ canvases: new Map(), deleted: new Set() }),
  save: () => {},
  remove: () => {},
});

/** The queries Studio runs, from ./sql/storage.sql (its tables are made by the catalog's migrations) */
const QUERIES = ['saveCanvas', 'removeCanvas', 'recordDeleted', 'allCanvases', 'allDeleted'] as const;
const SQL = namedStatements(storageSql, QUERIES);

type Statements = Record<(typeof QUERIES)[number], ReturnType<Database['prepare']>>;

/** Canvases in the catalog's SQLite database, in `file` */
export const sqliteStorage = (file: string): CanvasStorage => {
  let opened: { database: Database; statements: Statements } | undefined;
  const use = () => {
    if (!opened) throw new Error('SQLite storage was used before it was opened');
    return opened;
  };
  return {
    type: 'sqlite',
    location: file,
    loadAll: async () => {
      const database = await openDatabase(file);
      const statements = Object.fromEntries(QUERIES.map((name) => [name, database.prepare(SQL[name])])) as Statements;
      opened = { database, statements };

      const rows = statements.allCanvases.all() as { name: string; state: Uint8Array; updated_at: number }[];
      const deleted = statements.allDeleted.all() as { name: string }[];
      return {
        canvases: new Map(rows.map((row) => [row.name, { state: new Uint8Array(row.state), updatedAt: Number(row.updated_at) }])),
        deleted: new Set(deleted.map((row) => row.name)),
      };
    },
    save: (documentName, state, updatedAt = Date.now()) => {
      use().statements.saveCanvas.run(documentName, state, updatedAt);
    },
    remove: (documentName) => {
      const { database, statements } = use();
      database.exec('BEGIN');
      try {
        statements.recordDeleted.run(documentName, Date.now());
        statements.removeCanvas.run(documentName);
        database.exec('COMMIT');
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    },
  };
};

/** Canvases in the storage a config asks for (paths relative to the catalog). Unknown types are an error. */
export const createStorage = (config: StorageConfig | undefined, projectDirectory: string): CanvasStorage => {
  const file = getDatabasePath(config, projectDirectory);
  return file ? sqliteStorage(file) : memoryStorage();
};
