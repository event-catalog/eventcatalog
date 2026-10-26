---
'@eventcatalog/linter': patch
---

fix(linter): users and teams synced from `directory.sources` in `eventcatalog.config.js` (for example `githubDirectory()`) no longer fail `refs/owner-exists`. The linter loads the catalog's `.env` and runs each directory source the same way EventCatalog does. If a source can't be loaded (no token or no network), it uses the users and teams in `.eventcatalog/store/directory.json` from the last time EventCatalog ran. If that file doesn't exist either, it skips `refs/owner-exists` and prints a warning instead of reporting every synced owner as missing
