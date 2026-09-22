---
'@eventcatalog/core': patch
---

Fix browser errors in installed catalogs during development (e.g. `style-to-js does not provide an export named 'default'`) by prebundling every dependency Core's browser components import, and fix hydration mismatches in the AI assistant panel and JSON schema viewer.
