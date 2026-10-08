import { namedStatements } from './sql';
import runnerSql from './sql/migrations.sql?raw';

/**
 * Changes to the database's schema, for every feature that keeps state, as .sql files in ./sql/migrations named
 * `NNNN-what-it-does.sql` (one numbered order for the whole catalog; tables are named for their feature, e.g.
 * `studio_canvases`). They run in order when the database opens, each once, recorded in its `migrations` table. To
 * change the schema, add a file with the next number: never change one that has shipped, since databases out there have
 * already run it.
 */
export type Migration = { version: number; name: string; sql: string };

/** The parts of node:sqlite's DatabaseSync EventCatalog uses */
export type Database = {
  exec: (sql: string) => void;
  prepare: (sql: string) => { run: (...values: unknown[]) => unknown; all: () => unknown[] };
};

// Built into the server code (no files to find at runtime, wherever it's deployed)
const files = import.meta.glob<string>('./sql/migrations/*.sql', { query: '?raw', import: 'default', eager: true });
const SQL = namedStatements(runnerSql, ['createMigrationsTable', 'appliedVersions', 'recordMigration']);

/** Migrations from their files, in order (an error if a file is misnamed or two have the same number) */
export const toMigrations = (sources: Record<string, string>): Migration[] => {
  const migrations = Object.entries(sources).map(([file, sql]) => {
    const name = file
      .split('/')
      .pop()!
      .replace(/\.sql$/, '');
    const version = Number(/^(\d{4})-[a-z0-9-]+$/.exec(name)?.[1]);
    if (!version) throw new Error(`Migration "${file}" should be named like 0003-what-it-does.sql`);
    return { version, name, sql };
  });
  migrations.sort((a, b) => a.version - b.version);
  migrations.forEach((migration, index) => {
    if (migration.version !== index + 1) {
      throw new Error(`Migrations should be numbered 1, 2, 3...: expected ${index + 1} before ${migration.name}`);
    }
  });
  return migrations;
};

export const MIGRATIONS = toMigrations(files);

/**
 * The database was updated by a newer EventCatalog. Features don't fall back to memory for this (changes would quietly
 * stop being saved): they aren't available until EventCatalog is updated. Told by its code, as the dev server's
 * integrations and the app load this module separately.
 */
const DATABASE_TOO_NEW = 'EVENTCATALOG_DATABASE_TOO_NEW';
export const isDatabaseTooNew = (error: unknown) => (error as { code?: unknown } | null)?.code === DATABASE_TOO_NEW;

/**
 * Brings a database up to date: runs the migrations it hasn't run yet, each in a transaction (all of it or none).
 * Refuses a database that has run migrations this version doesn't know (made by a newer EventCatalog).
 */
export const migrate = (database: Database, migrations: Migration[] = MIGRATIONS) => {
  database.exec(SQL.createMigrationsTable);
  const applied = new Set(
    (database.prepare(SQL.appliedVersions).all() as { version: number }[]).map((row) => Number(row.version))
  );
  const latest = migrations.at(-1)?.version ?? 0;
  const newer = [...applied].filter((version) => version > latest);
  if (newer.length) {
    throw Object.assign(
      new Error(
        `The EventCatalog database has been updated by a newer EventCatalog (migration ${Math.max(...newer)}; this version knows up to ${latest}). Update EventCatalog to use it.`
      ),
      { code: DATABASE_TOO_NEW }
    );
  }
  const record = database.prepare(SQL.recordMigration);
  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;
    database.exec('BEGIN');
    try {
      database.exec(migration.sql);
      record.run(migration.version, migration.name, Date.now());
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      throw new Error(`Could not run migration ${migration.name}: ${(error as Error).message}`);
    }
  }
};
