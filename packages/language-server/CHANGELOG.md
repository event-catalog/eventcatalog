# @eventcatalog/language-server

## 0.8.5

### Patch Changes

- Updated dependencies [46a2292]
  - @eventcatalog/sdk@2.17.3

## 0.8.4

### Patch Changes

- Updated dependencies [0514bb1]
  - @eventcatalog/sdk@2.17.2

## 0.8.3

### Patch Changes

- Updated dependencies [6456054]
  - @eventcatalog/sdk@2.17.1

## 0.8.2

### Patch Changes

- Updated dependencies [af2d4f4]
  - @eventcatalog/sdk@2.17.0

## 0.8.1

### Patch Changes

- Updated dependencies [283c147]
  - @eventcatalog/sdk@2.16.0

## 0.8.0

### Minor Changes

- a461a9b: Add cross-file resource name completions, improve spec resolver path handling for nested folders, and support workspace-aware multi-file parsing in VS Code extension preview

## 0.7.0

### Minor Changes

- b86daae: Support inline flow definitions inside domain blocks in the DSL

## 0.6.2

### Patch Changes

- cb0235a: Replace playground.eventcatalog.dev URLs with compass.eventcatalog.dev

## 0.6.1

### Patch Changes

- a43021e: Refactor language server, playground, and visualiser: extract shared helpers to reduce duplication, add browser entrypoint, definition/hover/formatter providers, resource index, catalog resolver, restructure docs, simplify layout utils, and add VSCode extension scaffold

## 0.6.0

### Minor Changes

- 2663850: Add OpenAPI spec import support to the DSL language server. Parses OpenAPI v3.0/v3.1 specs and maps GET operations to queries and POST/PUT/PATCH/DELETE to commands. Auto-detects AsyncAPI vs OpenAPI from file content. Supports local and remote imports, JSON and YAML formats. Includes playground examples for OpenAPI import, service import, remote import, and mixed AsyncAPI+OpenAPI usage.

## 0.5.0

### Minor Changes

- a85a4d7: Add AsyncAPI service import resolution and playground autocompletion for sends/receives and channel references

## 0.4.1

### Patch Changes

- 6122f93: Add "Download as Catalog" export option to the playground that generates a ready-to-run EventCatalog project zip with package.json, config, and compiled content files

## 0.4.0

### Minor Changes

- a1c5012: Add versioned message references (event, command, query) in visualizer blocks and hydrate related services in domain DSL export

## 0.3.0

### Minor Changes

- c4104a1: Support template parameters in channel names (e.g. `inventory.{env}.events`) in the DSL grammar

### Patch Changes

- cf7fcac: add DSL-managed key merging for import to preserve non-DSL frontmatter, fix deprecated/draft falsy value handling in compiler

## 0.2.3

### Patch Changes

- 6a4e582: Improve DSL import with container ref support, resource stubs, and cache upsert; add writes-to and reads-from compilation in the language server.

## 0.2.2

### Patch Changes

- d703923: Replace base64 logo blob with actual logo.png asset, add import DSL command, and improve compiler with nested output support and domain/subdomain service pointer generation

## 0.2.1

### Patch Changes

- ca5c1d8: Remove redundant direct message-to-channel routes-to edges when an indirect path exists through channel routing chains, and simplify user/team DSL spec by removing owns statement

## 0.2.0

### Minor Changes

- c782129: feat(cli): add export command for DSL (.ec) format

## 0.1.1

### Patch Changes

- c178b75: Beta release of @eventcatalog/language-server package
  - Langium-based DSL parser for EventCatalog DSL
  - Language server protocol (LSP) implementation
  - Syntax validation and diagnostics
  - DSL graph builder for visualiser integration
  - Code formatting support
