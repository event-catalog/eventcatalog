---
"@eventcatalog/core": patch
---

perf(core): schema pages no longer send the viewed version's flow and usage graphs twice

A schema page sent the version being viewed in full twice: as the page's message, and again in the list of versions to switch between and compare, including the laid-out graphs of every flow it's in. The list now leaves the graphs out, as switching and comparing only use the schemas. In the example catalog, a schema page is about a third smaller (1.2 MB to 0.8 MB) and the build 14 MB smaller.
