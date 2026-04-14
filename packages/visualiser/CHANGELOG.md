# @eventcatalog/visualiser

## 3.18.0

### Minor Changes

- 8f724a7: feat: add `externalSystem` flag to services for modelling third-party integrations

  Services can now set `externalSystem: true` in their frontmatter to be rendered as external systems. This changes their presentation without changing their capabilities — they still send and receive messages, have owners, and support specifications like any other service.

  - Visualiser: external services render purple with a Globe icon and an "External System" badge
  - Sidebar (root): a dedicated "External Systems" section lists externals; the regular "Services" section excludes them
  - Sidebar (domain): externals appear under a new "External Integrations" group, separate from "Services In Domain"
  - Per-service nav badge reads "External System" instead of "Service"
  - `/discover`: a new "External Systems" tab alongside the "Services" tab
  - SDK: the `Service` type now accepts `externalSystem?: boolean`

## 3.17.1

### Patch Changes

- 80ff83d: fix security vulnerabilities by upgrading mermaid to 11.12.3 and @astrojs/rss to 4.0.18
- 4d5a01b: Migrate deprecated useHandleConnections to useNodeConnections across all node components

## 3.17.0

### Minor Changes

- 748c528: Expanding a message group node now renders the full downstream graph (channels, consumers, producers) matching the ungrouped view

## 3.16.1

### Patch Changes

- 038e402: Fix SSR compatibility: remove CSS import from NodeGraph that breaks server-side rendering, add proper type assertion for lazy-loaded component, and export NodeGraphProps type

## 3.16.0

### Minor Changes

- 1539e71: add schema fields explorer with field traceability, conflict detection, and node graph visualization

## 3.15.4

### Patch Changes

- ed1bfdf: Add entity map visualiser for services, matching the existing domain entity map. Services with entities now show an "Entity Map" link in the sidebar under Architecture. Also fix entity map edge arrows not visible in dark mode.

## 3.15.3

### Patch Changes

- d41c8c3: Re-enable hide/show channels toggle in the visualiser

## 3.15.2

### Patch Changes

- a43021e: Refactor language server, playground, and visualiser: extract shared helpers to reduce duplication, add browser entrypoint, definition/hover/formatter providers, resource index, catalog resolver, restructure docs, simplify layout utils, and add VSCode extension scaffold

## 3.15.1

### Patch Changes

- 304c5cb: Scope all visualiser CSS under `.eventcatalog-visualizer` so the package is fully self-contained. Fixes broken styles when installed from npm by including Tailwind utilities in the scoped output. Portals now render inside the scoped container (or document.body for full-screen modals) so styles apply correctly. Dark mode background and focus mode modal z-index fixes included.

## 3.15.0

### Minor Changes

- e11249b: Refine UI theme: improve sidebar active states with accent colors, brighten dark mode text, add subtle gradients, update homepage layout, and add dark mode icon invert support

### Patch Changes

- a67f051: fix visualiser URL builder to support configurable base paths via setBuildUrlFn
- 31b931c: Use relative content paths in tailwind config and lazy-load visualizer styles to prevent CSS conflicts

## 3.14.1

### Patch Changes

- f435078: Canvas playground UX overhaul: consistent notes indicator across all node types

## 3.14.0

### Minor Changes

- c178b75: core(feat): updated visualiser support for dark mode, new layout engine
- c178b75: Remove `catalog` object from collection getters, deriving values on-demand instead of pre-computing them for every resource
- c178b75: Redesign visualiser nodes with post-it note style UI

  - New post-it note design for all message and service nodes
  - Folded corner effect and gradient backgrounds
  - Glow handles with pulse animations
  - Owner indicators on nodes
  - Notes indicators for annotated resources
  - Dark mode support via CSS variables
  - Shared styles extracted to shared-styles.ts
  - Group node support

### Patch Changes

- 28fe2d5: fix(visualiser): make focus mode modal styling self-contained

## 3.13.0

### Minor Changes

- 3dc6938: Release stable version from beta

### Patch Changes

- 7d0203c: fix(visualiser): resolve header visibility conflict with tailwind utilities
- c05874a: Beta release of @eventcatalog/visualiser package

  - Fix node icon positioning: icon at top, label at bottom of left bar
  - Color-matched connection handles for all node types
  - Fix animated edge line color (gray-300)
  - Fix FlowEdge label width for multi-word labels
  - Bundle Tailwind CSS utilities in dist/styles.css for consumers
  - Add dynamic color safelist for Flow and Custom nodes
  - Fix StepWalkthrough panel padding and positioning
  - Fix Focus Mode initial render centering

- 579c9e2: Fix visualiser node icon spacing in full mode

## 3.13.0-beta.2

### Patch Changes

- 7d0203c: fix(visualiser): resolve header visibility conflict with tailwind utilities

## 3.12.9-beta.1

### Patch Changes

- 579c9e2: Fix visualiser node icon spacing in full mode

## 0.0.2-beta.0

### Patch Changes

- c05874a: Beta release of @eventcatalog/visualiser package

  - Fix node icon positioning: icon at top, label at bottom of left bar
  - Color-matched connection handles for all node types
  - Fix animated edge line color (gray-300)
  - Fix FlowEdge label width for multi-word labels
  - Bundle Tailwind CSS utilities in dist/styles.css for consumers
  - Add dynamic color safelist for Flow and Custom nodes
  - Fix StepWalkthrough panel padding and positioning
  - Fix Focus Mode initial render centering
