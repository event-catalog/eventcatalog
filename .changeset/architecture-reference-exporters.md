---
'@eventcatalog/exporters': patch
---

fix(exporters): leave hidden resources out of the architecture reference, only link resources (messages, channels, data stores, system and domain members, flow steps) to the versions they point at (exact versions, semver ranges and number-like versions such as `v1`), only link repository and Slack URLs that use http or https, keep numeric and boolean enum values as literals in generated TypeScript, export catalogs that only contain flows, entities or other resources, render mermaid diagrams in large catalogs, and keep highlighting and HTML compaction linear on unusual input.
