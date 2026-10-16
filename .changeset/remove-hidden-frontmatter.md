---
'@eventcatalog/core': patch
'@eventcatalog/sdk': patch
'@eventcatalog/linter': patch
'@eventcatalog/exporters': patch
---

Remove the `hidden` frontmatter field from resources, resource docs, users and teams. Resources that set `hidden: true` are now shown in the catalog, MCP server, API catalog, search and exports; the linter reports `hidden` as an unknown field.
