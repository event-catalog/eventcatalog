---
"@eventcatalog/core": patch
---

fix(core): load `eventcatalog.config.js` from the catalog, and fail `eventcatalog generate` when a generator fails

When a catalog's `package.json` didn't say `"type": "module"` (a new catalog's doesn't), EventCatalog loaded a copy of `eventcatalog.config.js` from a temporary folder. Paths the config built from its own location (`__dirname` from `import.meta.url`) and its relative imports pointed into that folder, so generators couldn't find their specs (e.g. in the openapi template). The config is now loaded from the catalog.

`eventcatalog generate` also exited with code 0 when a generator failed. It now exits with code 1, so CI steps fail.
