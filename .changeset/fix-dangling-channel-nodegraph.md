---
'@eventcatalog/core': patch
---

Prevent static builds from crashing when a message NodeGraph references a producer or consumer channel that is missing from the catalog. Unresolved channel refs now skip chain lookup and fall back to the existing direct-connect path.
