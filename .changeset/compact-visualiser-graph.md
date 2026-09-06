---
'@eventcatalog/core': patch
---

Strip hydrated collection entries from NodeGraph island props so docs and visualiser HTML stays small on large catalogs. On a synthetic catalog of 8 domains / 64 services / 640 events, total HTML dropped from 199.45 MB to a much smaller payload (see PR benchmark table) and domain/event graph islands no longer embed markdown bodies or producer/consumer trees.
