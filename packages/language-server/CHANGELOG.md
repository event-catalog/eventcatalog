# @eventcatalog/language-server

## 0.8.24

### Patch Changes

- Updated dependencies [6bd170f]
  - @eventcatalog/sdk@2.26.0

## 0.8.23

### Patch Changes

- Updated dependencies [9949f9f]
- Updated dependencies [d64cfab]
  - @eventcatalog/sdk@2.25.0

## 0.8.23-beta.1

### Patch Changes

- Updated dependencies [9949f9f]
  - @eventcatalog/sdk@2.25.0-beta.1

## 0.8.23-beta.0

### Patch Changes

- Updated dependencies [d64cfab]
  - @eventcatalog/sdk@2.25.0-beta.0

## 0.8.22

### Patch Changes

- Updated dependencies [29dc055]
  - @eventcatalog/sdk@2.24.2

## 0.8.21

### Patch Changes

- Updated dependencies [3334ab1]
  - @eventcatalog/sdk@2.24.1

## 0.8.20

### Patch Changes

- Updated dependencies [6b7fc3c]
  - @eventcatalog/sdk@2.24.0

## 0.8.19

### Patch Changes

- Updated dependencies [2801b3e]
  - @eventcatalog/sdk@2.23.1

## 0.8.18

### Patch Changes

- Updated dependencies [3ad00ad]
  - @eventcatalog/sdk@2.23.0

## 0.8.17

### Patch Changes

- Updated dependencies [50b38f6]
  - @eventcatalog/sdk@2.22.0

## 0.8.16

### Patch Changes

- 67940c4: Add optional `url` support to badges so they can render as clickable links.
- Updated dependencies [67940c4]
  - @eventcatalog/sdk@2.21.2

## 0.8.15

### Patch Changes

- Updated dependencies [1c9c217]
  - @eventcatalog/sdk@2.21.1

## 0.8.14

### Patch Changes

- Updated dependencies [3a7b096]
  - @eventcatalog/sdk@2.21.0

## 0.8.13

### Patch Changes

- Updated dependencies [8f724a7]
  - @eventcatalog/sdk@2.20.0

## 0.8.12

### Patch Changes

- Updated dependencies [52b4f24]
  - @eventcatalog/sdk@2.19.0

## 0.8.11

### Patch Changes

- Updated dependencies [ee142e4]
  - @eventcatalog/sdk@2.18.4

## 0.8.10

### Patch Changes

- Updated dependencies [88795d0]
  - @eventcatalog/sdk@2.18.3

## 0.8.9

### Patch Changes

- Updated dependencies [4639ec3]
  - @eventcatalog/sdk@2.18.2

## 0.8.8

### Patch Changes

- Updated dependencies [e2b0460]
  - @eventcatalog/sdk@2.18.1

## 0.8.7

### Patch Changes

- Updated dependencies [913ca20]
  - @eventcatalog/sdk@2.18.0

## 0.8.6

### Patch Changes

- Updated dependencies [83aca74]
  - @eventcatalog/sdk@2.17.4

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
