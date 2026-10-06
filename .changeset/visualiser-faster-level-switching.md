---
'@eventcatalog/visualiser': patch
---

Switching between levels in the visualiser is faster: nodes no longer render again on every frame of the layout animation, keep their measured size while they move, and name labels no longer force a layout recalculation as they mount.
