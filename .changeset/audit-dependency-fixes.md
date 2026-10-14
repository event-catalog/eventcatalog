---
'@eventcatalog/core': patch
'@eventcatalog/linter': patch
---

Fix several `npm audit` findings in new catalogs: upgrade `astro-seo` to 1.x (it no longer installs `@astrojs/check`) and `hono` to a version with the `hono/jsx` XSS fix, remove `shelljs` from core, and replace `fast-glob` with `glob` in the linter.
