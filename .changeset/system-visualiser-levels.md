---
'@eventcatalog/visualiser': minor
'@eventcatalog/core': minor
---

A system's visualiser page (`/visualiser/systems/:id/:version`) now has levels. L1 shows the system context diagram. L2 keeps the context but expands the system into its services and how they connect, with its relationships and actors connected to the expanded system. L3 adds messages and channels. Switching levels animates, and `?level=1|2|3` opens a level directly (the page opens at level 1 otherwise, as it does for domains). Layouts saved in dev mode for the system context carry over to level 1, but those saved for a system's old Resource Diagram don't carry over to levels 2 and 3, as they're laid out differently (inside the system's box). The separate System Context page now redirects to level 1, and the system sidebar has a single "Diagram" link in place of "Context Diagram" and "Resource Diagram". The system being viewed is marked "Viewing" on the context diagram, context layouts leave room for edge labels, and the visualiser `NodeGraph` accepts an `overviewGraph` to show as level 1.
