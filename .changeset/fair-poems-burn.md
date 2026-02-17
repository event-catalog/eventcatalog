---
"@eventcatalog/core": patch
---

Fix first-run dev startup race by loading non-module `eventcatalog.config.js` from a temp directory outside the project, avoiding watcher-triggered restarts during Vite dependency scanning.
