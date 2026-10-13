---
'@eventcatalog/core': patch
---

Fix `/visualiser/{type}/{id}` (no version) returning a 500 when EventCatalog runs as a server. It now redirects to the resource's latest version (keeping the query string), returns a 404 for resources that don't exist, and covers every resource with a visualiser page (queries, flows, channels, agents, systems and data products too).
