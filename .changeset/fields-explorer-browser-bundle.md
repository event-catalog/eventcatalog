---
"@eventcatalog/core": patch
---

fix(core): keep server-only code out of the Fields Explorer's browser bundle

Building a catalog warned that `node:fs` and `node:path` were "externalized for browser compatibility", and the Fields Explorer's browser code included the catalog's `eventcatalog.config.js`. The Fields Explorer now lays out its graph without reading the config, and the collection helpers it uses no longer need `node:path`.
