---
"@eventcatalog/core": patch
---

fix(core): focus Studio's catalog search when its tab is chosen

Choosing the Catalog Resources tab left the focus on the tab, so typing a resource's name ran the canvas's shortcuts (typing "Order Service" picked the Comment tool and changed the canvas). The search box is now focused, so typing searches the catalog.
