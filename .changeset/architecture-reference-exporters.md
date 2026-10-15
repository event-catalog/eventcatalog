---
'@eventcatalog/exporters': patch
---

fix(exporters): leave hidden resources out of the architecture reference, only link services and messages to the message, channel and data store versions they point at (exact versions, semver ranges and number-like versions such as `v1`), only link repository and Slack URLs that use http or https, export catalogs that only contain flows, entities or other resources, render mermaid diagrams in large catalogs, and keep highlighting and HTML compaction linear on unusual input.
