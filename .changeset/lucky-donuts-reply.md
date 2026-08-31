---
'@eventcatalog/core': patch
---

fix(core): embedded `<ArchitectureGraph/>` not rendering in static builds and 404s on domain System Diagram visualiser pages

- The MDX `<ArchitectureGraph/>` placeholder and its island are now paired by document order instead of a render-time occurrence counter — Astro can invoke MDX component functions more than once per tag, which drifted the counter and left the island unable to find its portal div (the graph silently rendered nothing).
- `/visualiser/domains/:id/:version/systems-context` pages were never generated because the guard looked systems up by their hydrated entry id — it now reads the hydrated system entries directly, matching the sidebar's guard.
