# @eventcatalog/cli

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
