-- The statements the migration runner runs (see migrations.ts), each named by the `-- name:` line above it. Its own
-- table is made here rather than in a migration: it records which migrations have run, so it's needed before any do.

-- name: createMigrationsTable
CREATE TABLE IF NOT EXISTS migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at INTEGER NOT NULL
);

-- name: appliedVersions
SELECT version FROM migrations;

-- name: recordMigration
INSERT INTO migrations (version, name, applied_at) VALUES (?, ?, ?);
