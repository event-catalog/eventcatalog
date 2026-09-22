---
"@eventcatalog/core": patch
---

Exclude colocated test and spec files from the published package and from `.eventcatalog-core`, and remove copies left behind by older installs, so Vite does not scan `vitest` imports during `dev`.
