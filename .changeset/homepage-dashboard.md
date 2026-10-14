---
"@eventcatalog/core": patch
---

feat(core): a dashboard homepage

Catalogs without their own homepage open on a dashboard: the catalog's title and tagline with search and Ask, counts of its domains, services, messages, flows, schemas and teams, and the architecture graph (or, when the graph isn't turned on, what changed most recently, dated from git). A custom homepage can show it too, with `<CatalogDashboard />` from `Astro.props.components` (and an optional `title` and `description`).
