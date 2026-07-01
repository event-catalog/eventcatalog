---
'@eventcatalog/core': patch
---

Schema Explorer: stop inlining the full payload into the `client:load` props. `producers`/`consumers`/`examples` are no longer inlined per item, and a selected message's schema body is lazy-fetched from `/api/schemas/<collection>/<id>/<version>` instead of being serialized for every schema. Keeps `/schemas/explorer` small (and the browser responsive) on large catalogs, complementing the existing pagination.
