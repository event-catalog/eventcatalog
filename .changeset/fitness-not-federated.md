---
'@eventcatalog/sdk': patch
---

fix(sdk): `buildIndex` no longer indexes `fitness/` folders as resource sidecars, so a catalog's fitness functions (code that `eventcatalog fitness check` runs) are not copied into catalogs that federate it
