---
"@eventcatalog/core": patch
"@eventcatalog/create-eventcatalog": patch
"@eventcatalog/linter": patch
---

Add build-time link validation for static catalogs and fix broken resource reference links

- New `linkValidation` config option checks internal links and anchors in generated HTML after static builds (warns by default, can be set to `error` or `ignore`, supports `ignore` globs)
- `<ResourceRef>` now links teams, users, and custom pages without a version segment, resolves owners to the correct users or teams page, and resolves messages to the collection they actually live in
- Catalog discovery, schema loading, design discovery, and the linter scanner now exclude `node_modules` so dependency example catalogs are never loaded as catalog resources
- Default template containers now declare owners
