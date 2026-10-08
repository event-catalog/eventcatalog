-- The statements Studio's SQLite storage runs (see storage.ts), each named by the `-- name:` line above it. The tables
-- are made by the catalog's migrations (features/storage/sql/migrations).

-- name: saveCanvas
INSERT INTO studio_canvases (name, state, updated_at) VALUES (?, ?, ?)
ON CONFLICT (name) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at;

-- name: removeCanvas
DELETE FROM studio_canvases WHERE name = ?;

-- name: recordDeleted
INSERT OR IGNORE INTO studio_deleted_canvases (name, deleted_at) VALUES (?, ?);

-- name: allCanvases
SELECT name, state, updated_at FROM studio_canvases;

-- name: allDeleted
SELECT name FROM studio_deleted_canvases;
