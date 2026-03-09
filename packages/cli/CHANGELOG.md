# @eventcatalog/cli

## 0.5.5

### Patch Changes

- 21c8095: Add `type: fail` governance action to block CI/CD pipelines when rules trigger. Supports optional `message` field with `$ENV_VAR` interpolation. Rules without a fail action continue to exit 0 (backward compatible).

## 0.5.4

### Patch Changes

- Updated dependencies [46a2292]
  - @eventcatalog/sdk@2.17.3
  - @eventcatalog/language-server@0.8.5

## 0.5.3

### Patch Changes

- Updated dependencies [0514bb1]
  - @eventcatalog/sdk@2.17.2
  - @eventcatalog/language-server@0.8.4

## 0.5.2

### Patch Changes

- Updated dependencies [6456054]
  - @eventcatalog/sdk@2.17.1
  - @eventcatalog/language-server@0.8.3

## 0.5.1

### Patch Changes

- 78bf2d4: Support governance.yml in addition to governance.yaml
- bcef8cc: add message_deprecated governance trigger to notify teams when a producing service deprecates a message

## 0.5.0

### Minor Changes

- af2d4f4: add architecture change detection with governance rules, catalog snapshots, and webhook notifications

### Patch Changes

- Updated dependencies [af2d4f4]
  - @eventcatalog/sdk@2.17.0
  - @eventcatalog/language-server@0.8.2

## 0.4.11

### Patch Changes

- Updated dependencies [283c147]
  - @eventcatalog/sdk@2.16.0
  - @eventcatalog/language-server@0.8.1

## 0.4.10

### Patch Changes

- Updated dependencies [a461a9b]
  - @eventcatalog/language-server@0.8.0

## 0.4.9

### Patch Changes

- Updated dependencies [b86daae]
  - @eventcatalog/language-server@0.7.0

## 0.4.8

### Patch Changes

- cb0235a: Replace playground.eventcatalog.dev URLs with compass.eventcatalog.dev
- Updated dependencies [cb0235a]
  - @eventcatalog/language-server@0.6.2

## 0.4.7

### Patch Changes

- Updated dependencies [a43021e]
  - @eventcatalog/language-server@0.6.1

## 0.4.6

### Patch Changes

- Updated dependencies [b5bbb3d]
  - @eventcatalog/sdk@2.15.1

## 0.4.5

### Patch Changes

- Updated dependencies [2663850]
  - @eventcatalog/language-server@0.6.0

## 0.4.4

### Patch Changes

- Updated dependencies [a85a4d7]
  - @eventcatalog/language-server@0.5.0

## 0.4.3

### Patch Changes

- Updated dependencies [6122f93]
  - @eventcatalog/language-server@0.4.1

## 0.4.2

### Patch Changes

- e6a759e: Default container_type to 'database' when not specified in .ec file imports

## 0.4.1

### Patch Changes

- Updated dependencies [7531be8]
- Updated dependencies [a1c5012]
- Updated dependencies [25acfdd]
  - @eventcatalog/sdk@2.15.0
  - @eventcatalog/language-server@0.4.0

## 0.4.0

### Minor Changes

- cf7fcac: add DSL-managed key merging for import to preserve non-DSL frontmatter, fix deprecated/draft falsy value handling in compiler

### Patch Changes

- Updated dependencies [cf7fcac]
- Updated dependencies [c4104a1]
  - @eventcatalog/language-server@0.3.0

## 0.3.4

### Patch Changes

- Updated dependencies [f3685b6]
  - @eventcatalog/sdk@2.14.3

## 0.3.3

### Patch Changes

- 6a4e582: Improve DSL import with container ref support, resource stubs, and cache upsert; add writes-to and reads-from compilation in the language server.
- Updated dependencies [6a4e582]
  - @eventcatalog/language-server@0.2.3
  - @eventcatalog/sdk@2.14.2

## 0.3.2

### Patch Changes

- d703923: Replace base64 logo blob with actual logo.png asset, add import DSL command, and improve compiler with nested output support and domain/subdomain service pointer generation
- Updated dependencies [d703923]
  - @eventcatalog/language-server@0.2.2

## 0.3.1

### Patch Changes

- 69cb966: add in-memory file index cache to SDK for faster lookups, fix playground URL in CLI export
- Updated dependencies [69cb966]
  - @eventcatalog/sdk@2.14.1

## 0.3.0

### Minor Changes

- c782129: Add CLI export command for exporting catalog resources to EventCatalog DSL (.ec) format. Supports single resource, bulk, and full catalog export with hydration, section grouping, and visualizer blocks. Fix getServices to ignore nested channels, containers, data-products, data-stores, and flows.
- c782129: feat(cli): add export command for DSL (.ec) format

### Patch Changes

- Updated dependencies [c782129]
- Updated dependencies [c782129]
  - @eventcatalog/sdk@2.14.0

## 0.2.1

### Patch Changes

- Updated dependencies [b466daf]
  - @eventcatalog/sdk@2.13.2

## 0.2.0

### Minor Changes

- 0b35904: Extract CLI into new @eventcatalog/cli package for cleaner separation of concerns. The SDK no longer bundles the CLI binary.

### Patch Changes

- Updated dependencies [0b35904]
  - @eventcatalog/sdk@2.13.1
