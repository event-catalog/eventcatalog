---
'@eventcatalog/sdk': minor
---

feat(sdk): `buildIndex` gains an `includeSchemaContent` option that embeds raw schema text alongside its hash, off by default. Used by the new `@eventcatalog/diff` package (published separately at 0.1.0) to compute schema compatibility verdicts.
