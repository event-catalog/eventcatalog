---
'@eventcatalog/core': patch
---

Use the catalog's `title` in page titles instead of a hardcoded "EventCatalog". Pages now read `Domains | Ordering | Acme Inc` (page first, then the catalog), the homepage is just the catalog's title, and `og:title` matches. Catalogs without a `title` keep "EventCatalog".
