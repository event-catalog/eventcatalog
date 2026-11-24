---
'@eventcatalog/core': patch
---

fix(core): a diagram laid out automatically (node graphs, flows, entity maps, the system context map) only uses its saved layout when that layout has a position for every node on it. A layout saved before nodes were added used to place the old nodes where they were saved and the new ones where the automatic layout put them, so they overlapped and edges ran through them; now the diagram is laid out automatically until the layout is saved again. Designs, whose nodes are placed by hand, keep their saved positions as before
