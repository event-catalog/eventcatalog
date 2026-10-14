import fs from 'node:fs';
import path from 'node:path';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

// Mirrors getDatabasePath in eventcatalog/src/features/storage/database.ts (built for Vite, so the CLI can't import it)
const DEFAULT_DATABASE_PATH = '.eventcatalog/eventcatalog.db';

/**
 * Where Studio is on, as isCanvasEnabled decides: `off` when studio.enabled is false, `server` when it's on in
 * production too (server output with studio.enabled set), otherwise `dev` (the dev server only, the default).
 */
export const getStudioMode = (configFile) => {
  const enabled = configFile.studio?.enabled;
  if (enabled === false) return 'off';
  return configFile.output === 'server' && enabled === true ? 'server' : 'dev';
};

/** Where EventCatalog keeps state such as Studio's canvases: `memory` (the default) or `sqlite` */
export const getStorageType = (configFile) => configFile.storage?.type || 'memory';

// Node's built-in SQLite, without the warning it prints as it loads (it's experimental) in the user's terminal
const loadSqlite = () => {
  const emitWarning = process.emitWarning;
  process.emitWarning = function (warning, ...args) {
    const type = typeof args[0] === 'object' ? args[0]?.type : args[0];
    const message = typeof warning === 'string' ? warning : warning?.message;
    if (type === 'ExperimentalWarning' && message?.startsWith('SQLite')) return;
    return emitWarning.call(this, warning, ...args);
  };
  try {
    return process.getBuiltinModule?.('node:sqlite');
  } catch {
    return undefined;
  } finally {
    process.emitWarning = emitWarning;
  }
};

const UNKNOWN = 'canvases:unknown';

/**
 * How many Studio canvases the catalog keeps, how many changed in the last 7 and 30 days, and how many were deleted:
 * counts only, never their names or contents. Only a SQLite database keeps canvases between runs (in memory they're
 * gone when the server stops), so with memory storage, or a database that can't be read, they're `unknown`.
 */
export const serializeStudioUsage = (projectDirectory, configFile, now = Date.now()) => {
  if (getStudioMode(configFile) === 'off' || getStorageType(configFile) !== 'sqlite') return UNKNOWN;

  const file = path.resolve(projectDirectory, configFile.storage.path ?? DEFAULT_DATABASE_PATH);
  // Not created yet: Studio hasn't run with this storage
  if (!fs.existsSync(file)) return 'canvases:0,changed7d:0,changed30d:0,deleted:0';

  let database;
  try {
    const sqlite = loadSqlite();
    if (!sqlite?.DatabaseSync) return UNKNOWN;
    database = new sqlite.DatabaseSync(file, { readOnly: true });
    const canvases = database
      .prepare(
        'SELECT COUNT(*) AS total, SUM(updated_at >= ?) AS changed7d, SUM(updated_at >= ?) AS changed30d FROM studio_canvases'
      )
      .get(now - 7 * DAY_IN_MS, now - 30 * DAY_IN_MS);
    const { deleted } = database.prepare('SELECT COUNT(*) AS deleted FROM studio_deleted_canvases').get();
    return `canvases:${canvases.total},changed7d:${canvases.changed7d ?? 0},changed30d:${canvases.changed30d ?? 0},deleted:${deleted}`;
  } catch {
    // e.g. a database from before Studio's tables, or one a newer EventCatalog changed
    return UNKNOWN;
  } finally {
    database?.close();
  }
};
