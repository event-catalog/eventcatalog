---
"@eventcatalog/core": patch
---

Fix environment switcher to support catalogs hosted under different base paths. The environment dropdown now matches the current environment by origin and base path, and preserves the in-catalog path, search params, and hash when switching environments.
