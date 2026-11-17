---
'@eventcatalog/core': patch
'@eventcatalog/linter': patch
'@eventcatalog/sdk': patch
'@eventcatalog/visualiser': patch
---

Allow `QUERY`, `HEAD` and `OPTIONS` as the `operation.method` of a message, so endpoints that use the HTTP `QUERY` method (OpenAPI 3.2 `query` operations) can be documented
