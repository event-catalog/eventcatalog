# @eventcatalog/cli

## 0.6.10

### Patch Changes

- Updated dependencies [3334ab1]
  - @eventcatalog/sdk@2.24.1
  - @eventcatalog/language-server@0.8.21

## 0.6.9

### Patch Changes

- Updated dependencies [6b7fc3c]
  - @eventcatalog/sdk@2.24.0
  - @eventcatalog/language-server@0.8.20

## 0.6.8

### Patch Changes

- Updated dependencies [2801b3e]
  - @eventcatalog/sdk@2.23.1
  - @eventcatalog/language-server@0.8.19

## 0.6.7

### Patch Changes

- Updated dependencies [3ad00ad]
  - @eventcatalog/sdk@2.23.0
  - @eventcatalog/language-server@0.8.18

## 0.6.6

### Patch Changes

- Updated dependencies [50b38f6]
  - @eventcatalog/sdk@2.22.0
  - @eventcatalog/language-server@0.8.17

## 0.6.5

### Patch Changes

- Updated dependencies [67940c4]
  - @eventcatalog/sdk@2.21.2
  - @eventcatalog/language-server@0.8.16

## 0.6.4

### Patch Changes

- Updated dependencies [1c9c217]
  - @eventcatalog/sdk@2.21.1
  - @eventcatalog/language-server@0.8.15

## 0.6.3

### Patch Changes

- Updated dependencies [3a7b096]
  - @eventcatalog/sdk@2.21.0
  - @eventcatalog/language-server@0.8.14

## 0.6.2

### Patch Changes

- Updated dependencies [8f724a7]
  - @eventcatalog/sdk@2.20.0
  - @eventcatalog/language-server@0.8.13

## 0.6.1

### Patch Changes

- Updated dependencies [52b4f24]
  - @eventcatalog/sdk@2.19.0
  - @eventcatalog/language-server@0.8.12

## 0.6.0

### Minor Changes

- a3313f6: feat: add breaking schema change detection with governance webhooks

  New `schema_breaking_change` governance trigger that detects breaking JSON Schema changes per compatibility strategy (BACKWARD, FORWARD, FULL, NONE). Users configure `compatibility.strategy` in governance.yaml and subscribe to breaking change webhooks with detailed diff information.

### Patch Changes

- Updated dependencies [a3313f6]
  - @eventcatalog/breaking-changes@0.2.0

## 0.5.11

### Patch Changes

- Updated dependencies [ee142e4]
  - @eventcatalog/sdk@2.18.4
  - @eventcatalog/language-server@0.8.11

## 0.5.10

### Patch Changes

- Updated dependencies [88795d0]
  - @eventcatalog/sdk@2.18.3
  - @eventcatalog/language-server@0.8.10

## 0.5.9

### Patch Changes

- Updated dependencies [4639ec3]
  - @eventcatalog/sdk@2.18.2
  - @eventcatalog/language-server@0.8.9

## 0.5.8

### Patch Changes

- Updated dependencies [e2b0460]
  - @eventcatalog/sdk@2.18.1
  - @eventcatalog/language-server@0.8.8

## 0.5.7

### Patch Changes

- Updated dependencies [913ca20]
  - @eventcatalog/sdk@2.18.0
  - @eventcatalog/language-server@0.8.7

## 0.5.6

### Patch Changes

- Updated dependencies [83aca74]
  - @eventcatalog/sdk@2.17.4
  - @eventcatalog/language-server@0.8.6

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
