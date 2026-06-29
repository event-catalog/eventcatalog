# @eventcatalog/visualiser

## 4.0.0-beta.0

### Major Changes

- 728ca67: Add support for a new `systems` collection. Systems are a versioned resource that can be defined in any folder (including inside domains), rendered as documentation pages, and listed in the sidebar with their own icon and color. Systems can group services, flows, entities, data stores (containers), and diagrams, have their own architecture overview page (`/architecture/systems/[id]`) listing their entities, services, external integrations, data stores, and flows, be visualised as an architecture map, be browsed and filtered on a dedicated discover page (`/discover/systems`), and be targeted by architecture decision records (`appliesTo: [{ type: 'system' }]`). Domains can reference one or more systems, which are listed in the domain sidebar, rendered as expandable sections on the domain's architecture page (listing the system's services, like subdomains, with external services shown under "External Integrations"), and merged into the domain's architecture map (each referenced system's services are grouped within the domain graph). Teams and users can own systems, which are surfaced on their profile pages.

  Systems can also declare `relationships` to other systems (each with an optional `version` and `label`), which power a new **Context Diagram** visualiser (`/visualiser/systems/[id]/[version]/context`, linked from the system sidebar under Architecture). Starting from a system, the diagram walks its relationships outward to build the reachable neighbourhood of systems, rendering each as a node (showing its service, entity, and data store counts) connected by labelled edges. Clicking a system node opens that system's architecture map.

  Systems support a `scope` of `internal` (default) or `external`. External systems represent third-party/SaaS systems you integrate with (e.g. "Resend", "Stripe") and are shaded and badged as "External System" in the Context Diagram.

  Systems can also declare `actors` — people or roles that interact with the system (e.g. a Customer or Support Agent). Each actor has an `id` (used to de-duplicate the same actor across systems), an optional `name`/`label`, and a `direction` (`inbound` = actor → system, e.g. "logs into"; `outbound` = system → actor, e.g. "sends notifications to"). Actors are rendered as nodes on the Context Diagram connected to their system by a labelled, directional edge.

## 3.22.1

### Patch Changes

- c3b0958: fix node graph styling when rendered inside prose containers and prevent prose styles from affecting visualiser images

## 3.22.0

### Minor Changes

- 50b38f6: Add agents as a first-class resource type. Agents can now be documented alongside services, with support for AI model metadata, tools (MCP servers, APIs), and rendered as distinct nodes in the visualiser. Closes #2564.

## 3.21.1

### Patch Changes

- 8db08c5: Visualiser nodes now show a tooltip with the full resource name on hover when the name is truncated.

## 3.21.0

### Minor Changes

- 6d7151b: Unify resource reference colors across tables, MDX components, and the sidebar via a shared collection-colors utility. Add data-product support to ResourceRef with rich tooltip styling, custom icon support, and updated visualiser data node palette.

## 3.20.3

### Patch Changes

- 3fd03c0: Improve `<Flow />` and `<NodeGraph />` MDX embeds: support boolean MDX props for `search`, `legend`, and `walkthrough`; avoid duplicate page node graph when a `<Flow />` or `<NodeGraph />` is already embedded; use unique portal IDs per flow embed; render a compact NodeGraph menu button when no title is provided.

## 3.20.2

### Patch Changes

- 1c9c217: Add support for `container` and `dataProduct` steps in flows. Flows can now reference data stores (containers) and data products directly as steps, rendered in the flow node graph and sidebar. SDK adds `addDataStoreStep`, `addContainerStep`, and `addDataProductStep` builders.

## 3.20.1

### Patch Changes

- 8f32dc1: Enhance custom flow nodes with richer styling and metadata: color palettes, icons, type badges, summary text, key/value properties, and optional context menu links.

## 3.20.0

### Minor Changes

- 313388f: feat(visualiser): expandable message groups and improved search for large catalogs

  Visualiser now supports expanding grouped message nodes inline so producers/consumers with many messages stay readable on domain and service diagrams. Surrounding nodes are packed around the expanded group so they no longer overlap, and search has been overhauled with icons, resource-type filtering, and better keyboard navigation. Addresses #2079.

## 3.19.0

### Minor Changes

- 3ba10fd: Sub-flow references inside a flow can now be expanded inline. Clicking a sub-flow node in the visualiser inlines the referenced flow's steps in place (mirroring the message-group expand/collapse pattern), with the Collapse button in the header restoring the single-node view. Expanded sub-flow children participate in the business-flow walkthrough, and the graph recentres via `fitView` on both expand and collapse.

## 3.18.4

### Patch Changes

- 1f6fc59: fix: restore custom right-click context menu for message and service nodes in flow diagrams. `flows-node-graph` now populates `contextMenu` on step nodes (previously only non-flow graphs did, so flow pages fell through to the browser default menu). Context-menu items also get explicit colour and no-underline styling so they no longer inherit browser-default purple/underlined link styling when the host page has no link resets.

## 3.18.3

### Patch Changes

- 8c4bee8: Auto-disable message animation when the graph has more than 30 nodes and the user has no stored preference. Explicit `animated` prop, `?animate=` URL param, and localStorage choice still take precedence.

## 3.18.2

### Patch Changes

- 792458e: Add custom icon support to resources via `styles.icon`. Icons render on visualiser nodes, in the sidebar, on documentation page headers, and in the search modal. Accepts a path under the catalog's `public/` folder or an absolute URL. When no custom icon is set, resources now fall back to collection-appropriate default icons. Also maps container `container_type` to a human-readable label on data nodes.

## 3.18.1

### Patch Changes

- 7dee222: fix(visualiser): center multi-line edge labels, add backgrounds to data-store edges, and make the "Layout changed" Save button theme-safe

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
