---
'@eventcatalog/core': patch
---

Render 4 pages at a time when building a catalog. A catalog with 640 events builds in about 40s rather than 50–75s, with the same pages and less memory.
