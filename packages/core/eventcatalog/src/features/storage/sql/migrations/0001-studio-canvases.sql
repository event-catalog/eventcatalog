-- Studio's canvases: each one's whole Yjs document (Y.encodeStateAsUpdate), and when it last changed.
CREATE TABLE studio_canvases (
  name TEXT PRIMARY KEY,
  state BLOB NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Studio canvases that were deleted, so a browser that still has one open can't bring it back.
CREATE TABLE studio_deleted_canvases (
  name TEXT PRIMARY KEY,
  deleted_at INTEGER NOT NULL
);
