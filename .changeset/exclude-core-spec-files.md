---
"@eventcatalog/core": patch
---

Exclude colocated test and spec files from the published package and from the `.eventcatalog-core` copy so Vite does not scan `vitest` imports during `dev`.
