---
'@eventcatalog/core': patch
'@eventcatalog/linter': patch
---

Explain a missing or invalid ADR `status` or `date` clearly. A missing `date` was reported as ``Expected type `"date"`, received `"object"` `` (with the field name garbled) by the build, and as `Invalid date` by the linter. The build now reports `Required: a date, e.g. 2026-06-01` or `Invalid date: use a date, e.g. 2026-06-01`, and a missing status lists the allowed values. The linter reports a missing date as missing.
