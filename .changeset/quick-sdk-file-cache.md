---
'@eventcatalog/sdk': patch
---

perf(sdk): keep the file cache up to date instead of rebuilding it, so generators importing into a catalog run about 10x faster, and removing, versioning or adding messages and services to resources is 15-20x faster on large catalogs. Changes made to the catalog outside the SDK are still picked up. Resources the SDK returns are now copies, so changing one (or attaching its schema) no longer changes later reads, and when two files have the same id and version, the one written last is found.
