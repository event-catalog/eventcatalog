# @eventcatalog/diff

## 0.1.3-beta.0

### Patch Changes

- 3b46a41: `@eventcatalog/core` 5.0.0 (including its pre-releases) and later is licensed under the Business Source License 1.1 (`BUSL-1.1`), replacing the MIT License and the separate EventCatalog Commercial License for the enterprise and federation code. Releases up to and including 4.x remain available under the MIT License, and their notice is kept in `NOTICE`.

  The ecosystem packages, including `@eventcatalog/create-eventcatalog`, stay MIT and now ship their own `LICENSE` file. New catalogs get a License section in their README that links to the Business Source License and notes that the catalog's own content belongs to its authors. `@eventcatalog/breaking-changes` moves from ISC to MIT.

- Updated dependencies [3b46a41]
- Updated dependencies [62d08d4]
- Updated dependencies [4561180]
  - @eventcatalog/sdk@2.30.0-beta.0

## 0.1.2

### Patch Changes

- Updated dependencies [f2fd5b7]
  - @eventcatalog/sdk@2.29.2

## 0.1.1

### Patch Changes

- Updated dependencies [fcb955a]
  - @eventcatalog/sdk@2.29.1

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
