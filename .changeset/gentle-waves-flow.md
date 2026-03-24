---
"@eventcatalog/core": patch
"@eventcatalog/visualiser": patch
---

Fix SSR compatibility: remove CSS import from NodeGraph that breaks server-side rendering, add proper type assertion for lazy-loaded component, and export NodeGraphProps type
