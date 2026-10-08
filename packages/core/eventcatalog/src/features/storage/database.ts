import fs from 'node:fs';
import path from 'node:path';
import config from '../../utils/eventcatalog-config/source';
import type { Config } from '../../../../src/eventcatalog.config';
import { migrate, type Database } from './migrations';
import { namedStatements } from './sql';
import databaseSql from './sql/database.sql?raw';

/** `storage` in eventcatalog.config.js: memory (the default), or one SQLite database for the whole catalog */
export type StorageConfig = NonNullable<Config['storage']>;
export type StorageType = StorageConfig['type'];
export type { Database };

export const DEFAULT_STORAGE: StorageConfig = { type: 'memory' };
const DEFAULT_DATABASE_PATH = '.eventcatalog/eventcatalog.db';

const SQL = namedStatements(databaseSql, ['useWriteAheadLog']);

/** The database file a config asks for (relative to the catalog), or undefined when state is kept in memory */
export const getDatabasePath = (storage: StorageConfig | undefined, projectDirectory: string) => {
  const chosen = storage ?? DEFAULT_STORAGE;
  switch (chosen.type) {
    case 'memory':
      return undefined;
    case 'sqlite':
      return path.resolve(projectDirectory, chosen.path ?? DEFAULT_DATABASE_PATH);
    default:
      throw new Error(`Unknown storage type "${(chosen as { type?: string }).type}": use "memory" or "sqlite"`);
  }
};

const open = async (file: string): Promise<Database> => {
  // Node's built-in SQLite (no native package to install), asked of Node itself: the dev server loads this through
  // Vite, which doesn't know node:sqlite and fails to import it
  type Sqlite = { DatabaseSync: new (file: string) => Database };
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
  const database = new sqlite.DatabaseSync(file);
  database.exec(SQL.useWriteAheadLog);
  migrate(database);
  return database;
};

// Opened once per process, by file (kept on globalThis: the dev server's integrations and the app load this module
// separately, and code reloads in dev keep globalThis)
const DATABASES = Symbol.for('eventcatalog.databases');
const store = globalThis as typeof globalThis & { [DATABASES]?: Map<string, Promise<Database>> };

/**
 * The database in `file`, brought up to date by the migrations: opened the first time it's asked for, then shared by
 * every feature. Rejects (every time) if it can't be opened or migrated, e.g. when a newer EventCatalog updated it.
 */
export const openDatabase = (file: string): Promise<Database> => {
  const databases = (store[DATABASES] ??= new Map());
  let database = databases.get(file);
  if (!database) {
    database = open(file);
    databases.set(file, database);
  }
  return database;
};

/**
 * Opens the storage configured, running the migrations it needs. Called as the dev server and `eventcatalog start`
 * start (not on build: builds often run somewhere other than where the database lives), so it's ready before any
 * feature uses it. Returns the database file, or undefined when state is kept in memory.
 */
export const startStorage = async (projectDirectory = process.env.PROJECT_DIR || process.cwd()) => {
  if ((config as { studio?: { storage?: unknown } }).studio?.storage) {
    console.warn('[eventcatalog] studio.storage is no longer used: set storage in eventcatalog.config.js instead');
  }
  const file = getDatabasePath(config.storage, projectDirectory);
  if (file) await openDatabase(file);
  return file;
};
