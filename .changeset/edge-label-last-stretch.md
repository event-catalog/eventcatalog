---
"@eventcatalog/visualiser": patch
"@eventcatalog/core": patch
---

fix(visualiser): put an edge's label on its own line when the layout hasn't routed it

Edges drawn as a step between two nodes (e.g. added in Studio from the catalog) had their label in the middle, where edges from one node to nodes in the same column run on top of each other, so a label could sit on another edge's line ("reads and writes" on the line to an event). The label now sits on the edge's last stretch, into its target.
