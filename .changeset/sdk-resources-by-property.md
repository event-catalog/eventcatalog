---
'@eventcatalog/sdk': minor
---

feat: `getResourcesByProperty(property, { equals, in, types, latestOnly })` returns the resources with a custom property (`x-…`), optionally with a given value. It's answered from the SDK's in-memory copy of the catalog's frontmatter, so lookups don't read any files. `matchesProperty` and `isCustomPropertyName` are exported too
