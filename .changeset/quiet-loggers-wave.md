---
'@eventcatalog/core': patch
---

Improve EventCatalog build output by filtering optional Astro glob warnings without breaking route timing logs, and ignore `dist/**` files in content collection globs to prevent build-time module resolution errors.
