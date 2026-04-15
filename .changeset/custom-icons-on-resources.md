---
"@eventcatalog/core": patch
"@eventcatalog/visualiser": patch
---

Add custom icon support to resources via `styles.icon`. Icons render on visualiser nodes, in the sidebar, on documentation page headers, and in the search modal. Accepts a path under the catalog's `public/` folder or an absolute URL. When no custom icon is set, resources now fall back to collection-appropriate default icons. Also maps container `container_type` to a human-readable label on data nodes.
