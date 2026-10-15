---
'@eventcatalog/exporters': patch
---

fix(exporters): leave hidden resources out of the architecture reference, only link services to the message version they point at (exact versions and semver ranges), export catalogs that only contain flows, entities or other resources, render mermaid diagrams in large catalogs, and keep highlighting and HTML compaction linear on unusual input.
