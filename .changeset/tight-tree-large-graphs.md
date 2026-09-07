---
'@eventcatalog/core': patch
'@eventcatalog/visualiser': patch
---

Use dagre's tight-tree ranker for large node graphs so domain and architecture maps layout in hundreds of milliseconds instead of several seconds.
