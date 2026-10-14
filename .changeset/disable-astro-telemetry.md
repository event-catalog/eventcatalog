---
"@eventcatalog/core": patch
---

chore(core): turn off Astro's telemetry

`eventcatalog dev`, `build` and `preview` run Astro, which sent anonymous usage data (the command, config settings and machine details) to Astro by default. EventCatalog now turns it off for every catalog.
