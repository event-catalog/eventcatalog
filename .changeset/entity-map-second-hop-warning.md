---
'@eventcatalog/core': patch
---

Stop entity maps warning `Referenced entity "…" not found` when an entity from another domain references an entity that is in the catalog but not on the map. The warning now only appears for references to entities that don't exist.
