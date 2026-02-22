---
"@eventcatalog/sdk": minor
---

Implement optimistic cache management to avoid full cache rebuilds on writes, deletes, and version operations. Switch staleness detection from mtimeMs to birthtimeMs, add cache-based fast paths for getFiles and searchFilesForId, and replace all 19 invalidateFileCache() calls with incremental cache updates.
