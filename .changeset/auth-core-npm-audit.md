---
"@eventcatalog/create-eventcatalog": patch
---

Force generated catalogs to use patched `@auth/core` (>=0.41.3) so npm does not nest the vulnerable 0.37.x copy pulled in by auth-astro.
