---
"@eventcatalog/sdk": minor
---

Add the federation pipeline to the SDK: `buildIndex` discovers and describes catalog content into a portable index, `resolve` combines indexes from multiple sources into a single graph (with conflict detection, externals and edges), and `hydrate` materializes the resolved content to disk (fetching, verifying, caching and referencing artifacts). Also adds `parseIndex` for validating an index, and exports the new federation types.
