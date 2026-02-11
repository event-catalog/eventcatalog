---
"@eventcatalog/core": patch
---

Migrate visualiser components to @eventcatalog/visualiser package

- Move NodeGraph React components, edges, and focus mode to @eventcatalog/visualiser
- Update node-graph utilities to output visualiser-compatible node data
- Update Astro components to use new AstroNodeGraph wrapper
- Update tests to match new node graph output format
