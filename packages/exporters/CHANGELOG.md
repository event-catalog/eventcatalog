# @eventcatalog/exporters

## 0.1.2

### Patch Changes

- Updated dependencies [20f3ed3]
  - @eventcatalog/sdk@2.31.2

## 0.1.1

### Patch Changes

- ec9d224: Remove the `hidden` frontmatter field from resources, resource docs, users and teams. Resources that set `hidden: true` are now shown in the catalog, MCP server, API catalog, search and exports; the linter reports `hidden` as an unknown field.
- Updated dependencies [ec9d224]
  - @eventcatalog/sdk@2.31.1

## 0.1.0

### Minor Changes

- 234b262: feat: custom exports, parts of the catalog for people outside the team. Each is a file in `exports/` whose frontmatter chooses what's in it (include and exclude, by id or by custom property such as `x-public: true`; references; hide) and whose body is its introduction. `eventcatalog build` writes them to `exports/<id>.html`, and `eventcatalog export <id> [--check]` writes one or reports what's in it and what was left out

### Patch Changes

- Updated dependencies [234b262]
  - @eventcatalog/sdk@2.31.0

## 0.0.3

### Patch Changes

- 5c54ae4: feat(exporters): add Open Graph and Twitter tags to the architecture reference (title, description and the EventCatalog card image) so shared links preview properly, and stop a catalog without a name of its own reading "the EventCatalog EventCatalog".

## 0.0.2

### Patch Changes

- 9bd631c: fix(exporters): leave hidden resources out of the architecture reference, only link resources (messages, channels, data stores, system and domain members, flow steps) to the versions they point at (exact versions, semver ranges and number-like versions such as `v1`), only link repository and Slack URLs that use http or https, keep numeric and boolean enum values as literals and arrays (including Avro arrays) as arrays in generated TypeScript, give resources whose ids only differ by punctuation their own anchors, link channels to the channels they route to and from, export catalogs that only contain flows, entities or other resources, render mermaid diagrams in large catalogs, and keep highlighting and HTML compaction linear on unusual input.
