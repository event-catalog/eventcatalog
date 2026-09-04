# @eventcatalog/diff

## 0.1.0

### Minor Changes

- b0b0b11: feat(diff): new `@eventcatalog/diff` package that compares two catalog indexes and returns an `ArchitectureDiff`

  - Compares two SDK `Index` documents (from `buildIndex`) and reports resources added / removed / changed, edges added / removed across every direction the SDK resolves, schema changes with a compatibility verdict, and impact naming the producers and consumers hurt by each breaking change, with owners.
  - JSON Schema compatibility under `backward`, `forward`, `full` (default) and `none` strategies, following Confluent Schema Registry semantics: properties and required (with `default`), types, enums and const, min/max constraints, pattern, format, multipleOf, uniqueItems, open and closed content models, arrays and tuples, oneOf / anyOf / allOf, local `$ref`, boolean schemas. Keywords it cannot reason about are reported as breaking rather than silently passed.
  - Unknown verdicts (unsupported formats, missing content, added or removed schema files) are counted in `summary.schemaUnknown` so they are never silent.
  - `buildIndex` in `@eventcatalog/sdk` gains an `includeSchemaContent` option that embeds raw schema text alongside its hash. Off by default.

### Patch Changes

- Updated dependencies [b0b0b11]
  - @eventcatalog/sdk@2.29.0
