---
'@eventcatalog/core': patch
---

The architecture graph (on the homepage, in `<ArchitectureGraph/>` embeds and at `/visualiser/graph`) now appears with its layout already settled instead of drifting into place for about five seconds. The first layout settles before it paints, in short slices that don't block the page; switching lens or focusing a resource still animates.
