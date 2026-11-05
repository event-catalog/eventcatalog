---
'@eventcatalog/visualiser': patch
'@eventcatalog/core': patch
---

fix(visualiser): clicking the background of a diagram no longer zooms out to fit the whole graph, so an accidental click on a large diagram keeps your place. It still clears what's highlighted or selected, and Fit view in the bottom bar still fits the graph.
