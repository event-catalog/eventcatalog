-- Statements run as the database opens (see database.ts), each named by the `-- name:` line above it.

-- name: useWriteAheadLog
-- Readers don't wait for writers (set as the database opens: it can't be changed inside a migration's transaction)
PRAGMA journal_mode = WAL;
