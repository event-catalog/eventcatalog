---
'@eventcatalog/core': patch
---

The sidebar now shows with the page instead of after its JavaScript and data load. Each page renders its own sidebar level on the server, and the full navigation (`/api/sidebar-data.json`) loads straight away rather than when the browser is idle, so drilling down and search are ready sooner.
