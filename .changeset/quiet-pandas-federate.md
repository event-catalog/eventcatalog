---
'@eventcatalog/core': minor
---

feat(core): load catalog content from federated source directories

Astro content collections now also scan `federated/*/` so resources pulled in from
federated catalog sources (services, domains, subdomains, resource docs and doc
categories, ubiquitous language, users and teams) are picked up alongside the
local catalog.
