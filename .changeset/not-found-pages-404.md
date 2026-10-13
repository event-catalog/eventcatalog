---
'@eventcatalog/core': patch
---

Return the 404 page for unknown resources and versions when EventCatalog runs as a server (e.g. `/docs/events/order-created/9.9.9`), instead of an empty 500 logged as `[object Response]`. Unknown discover and directory types and the visualiser's designs page return 404 too.
