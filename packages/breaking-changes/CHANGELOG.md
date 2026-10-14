# @eventcatalog/breaking-changes

## 0.2.1-beta.0

### Patch Changes

- 3b46a41: `@eventcatalog/core` 5.0.0 (including its pre-releases) and later is licensed under the Business Source License 1.1 (`BUSL-1.1`), replacing the MIT License and the separate EventCatalog Commercial License for the enterprise and federation code. Releases up to and including 4.x remain available under the MIT License, and their notice is kept in `NOTICE`.

  The ecosystem packages, including `@eventcatalog/create-eventcatalog`, stay MIT and now ship their own `LICENSE` file. New catalogs get a License section in their README that links to the Business Source License and notes that the catalog's own content belongs to its authors. `@eventcatalog/breaking-changes` moves from ISC to MIT.

## 0.2.0

### Minor Changes

- a3313f6: feat: add breaking schema change detection with governance webhooks

  New `schema_breaking_change` governance trigger that detects breaking JSON Schema changes per compatibility strategy (BACKWARD, FORWARD, FULL, NONE). Users configure `compatibility.strategy` in governance.yaml and subscribe to breaking change webhooks with detailed diff information.
