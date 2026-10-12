---
'@eventcatalog/visualiser': minor
'@eventcatalog/core': patch
---

feat(visualiser): Studio's canvas is now part of the visualiser, at `@eventcatalog/visualiser/studio` (with its styles at `@eventcatalog/visualiser/studio.css`), shared by EventCatalog Studio and Studio on the web: the canvas's document, levels, layout and placement, live presence, and its nodes, comments, hotspots and controls. EventCatalog Studio uses it, and its components list gains the kinds of data store (database, cache, search index, object store), teams and entities.

Studio's canvas shares its Yjs document with the app using it, so `yjs` is an optional peer dependency (`^13.6.0`): install it alongside the visualiser to use `@eventcatalog/visualiser/studio` (one copy of Yjs, the app's). Diagrams (`NodeGraph`) don't need it. `zod` is a new dependency (the model at `@eventcatalog/visualiser/model`).
