---
'@eventcatalog/core': patch
---

fix(core): only send build telemetry for real `eventcatalog dev` and `build` runs, which always include the command and catalog id, so package scanners calling the telemetry module after a release don't count as new catalogs
