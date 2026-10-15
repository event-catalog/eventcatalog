# @eventcatalog/exporters

## 0.0.3

### Patch Changes

- 5c54ae4: feat(exporters): add Open Graph and Twitter tags to the architecture reference (title, description and the EventCatalog card image) so shared links preview properly, and stop a catalog without a name of its own reading "the EventCatalog EventCatalog".

## 0.0.2

### Patch Changes

- 9bd631c: fix(exporters): leave hidden resources out of the architecture reference, only link resources (messages, channels, data stores, system and domain members, flow steps) to the versions they point at (exact versions, semver ranges and number-like versions such as `v1`), only link repository and Slack URLs that use http or https, keep numeric and boolean enum values as literals and arrays (including Avro arrays) as arrays in generated TypeScript, give resources whose ids only differ by punctuation their own anchors, link channels to the channels they route to and from, export catalogs that only contain flows, entities or other resources, render mermaid diagrams in large catalogs, and keep highlighting and HTML compaction linear on unusual input.
