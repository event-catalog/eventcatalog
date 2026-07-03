---
'@eventcatalog/core': patch
---

Schema Explorer: stop inlining the full payload into the `client:load` props. `producers`/`consumers`/`examples` are no longer inlined per item, and a selected message's schema body is lazy-fetched from an internal explorer route (`/schemas/explorer/content/<collection>/<id>/<version>`) instead of being serialized for every schema. The route ships with every catalog (prerendered in static output, on-demand in SSR), so this is not coupled to the Scale `/api/schemas` API. Keeps `/schemas/explorer` small (and the browser responsive) on large catalogs, complementing the existing pagination.
