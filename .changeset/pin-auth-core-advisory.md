---
'@eventcatalog/core': patch
'@eventcatalog/auth-astro': patch
---

Stop npm from installing vulnerable `@auth/core@0.37.4` for the auth-astro path. Core now depends on `@eventcatalog/auth-astro` (auth-astro@4.2.0 with `@auth/core@>=0.41.3`) so catalogs resolve a single patched Auth.js (GHSA-7rqj-j65f-68wh, GHSA-xmf8-cvqr-rfgj, GHSA-x445-f3h2-j279). Do not downgrade `@eventcatalog/core` to 2.x.
