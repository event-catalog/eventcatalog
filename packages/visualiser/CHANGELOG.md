# @eventcatalog/visualiser

## 5.0.0-beta.3

### Patch Changes

- eae18f0: Export `DomainCardNode`, add a `navigable` option to the domain card and system nodes (set it to `false` to render them without links), and type the note node's props as React Flow `NodeProps`.

## 5.0.0-beta.2

### Patch Changes

- b5f4d00: Switching between levels in the visualiser is faster: nodes no longer render again on every frame of the layout animation, keep their measured size while they move, and name labels no longer force a layout recalculation as they mount.

## 5.0.0-beta.1

### Patch Changes

- f55c13f: Bump `@xyflow/react` from 12.8.6 to 12.12.0.

## 5.0.0-beta.0

### Major Changes

- f754d22: EventCatalog v5: new visualiser diagrams with levels.

  Diagrams are now laid out with ELK instead of dagre. Edges are routed at right angles around nodes, each with its own connection point so they no longer run on top of each other, and edge labels sit on their edge. Nested groups (subdomains and systems in a domain) are laid out in one pass, and relayouts in the browser load ELK on demand.

  Every diagram uses the same three levels, shown as L1, L2 and L3 in the canvas toolbar (and `?level=1|2|3` in the URL): L1 for domains, systems and their relationships, L2 for services and data stores, and L3 adding messages and channels. Domain and system pages have a single Diagram page with all three levels.

  Breaking changes:
  - Domain and system diagrams live at `/visualiser/domains/:id/:version` and `/visualiser/systems/:id/:version`, with levels. The domain System Diagram (`/systems-context`), the system Context Diagram (`/context`) and the service Data Dependency Graph (`/data`) pages now redirect to the matching level. The old domain and system Resource Diagram pages are replaced by the Diagram page.
  - Sidebar links are renamed: "System Diagram", "Resource Diagram" and "Context Diagram" become "Diagram", "Map" becomes "Diagram", "Entity Map" becomes "Entity Diagram" and "System Context Map" becomes "System Context Diagram". The "Data Dependency Graph" link is removed.
  - `?level=` values follow the new levels (`1` overview, `2` services and data stores, `3` messages and channels).
  - Diagrams are laid out differently, so layouts saved in dev mode for old Resource Diagrams don't carry over to the new pages.
  - `@eventcatalog/visualiser`: `layoutGraph` now returns a promise, the dagre helpers (`createDagreGraph`, `layoutDagreGraph`, `getNodesAndEdgesFromDagre`, `calculatedNodes`) are removed, and edges are drawn along the route in `data.route` when there is one. A new `@eventcatalog/visualiser/layout` entry (no React) exports `layoutWithElk`, `getNodeSize`, `hideMessageNodes`, `hideNodes`, `getMessagesLabel`, `isCarrier` and `isMessageNode`.

### Minor Changes

- f754d22: A domain's visualiser page (`/visualiser/domains/:id/:version`) now has levels, like a system's. The domain sidebar has a single "Diagram" link in place of "System Diagram" and "Resource Diagram", and the System Diagram page (`/visualiser/domains/:id/:version/systems-context`) now redirects to level 1. Layouts saved in dev mode for a domain's old Resource Diagram don't carry over to the new page, as its graph is laid out differently (nested in the domain's boxes); save the layout again if needed. L1 shows the domain with its systems and the other domains they send messages to or receive them from. L2 expands the systems into their services and data stores, and L3 adds messages and channels. Subdomains are shown as domains inside the domain, with their own systems and services (at L1, a subdomain without systems is a single card). Other domains' subdomains are shown inside a box for their parent domain. Services not in a system are shown with what they connect to, and a domain without systems or subdomains opens at L2 with L1 greyed out. Services inside a subdomain's systems (`domains/*/subdomains/*/systems/*/services/*`) are now loaded. The visualiser lays out nested groups (systems inside a domain), adds a domain group node, and animates several systems expanding at once. Messages and channels that only other domains send through are placed outside the domain. The canvas toolbar has a section for tools specific to the resource shown; on a domain's diagram it has "Highlight cross-domain communication", which picks out the edges to and from other domains on the level shown (it doesn't change the level). A domain's `<NodeGraph />` on its docs page now shows its Diagram (opening at level 1), rather than an empty graph when its services are in systems. Empty domains are drawn at a proper size, domains with `visualiser: false` get no Diagram page, a service a domain lists itself is shown in it even when another domain's system has it, messages are placed with the service publishing them, and a subdomain's own page labels it as a subdomain.
- 5bc87e1: Group a flow's steps by domain, system or team, or by domain with its systems nested inside. A "Group by" menu (top right, or press G) shows how many groups each option makes and whether to draw them as boxes around their steps or as full-width lanes. Groups come from the catalog (each step's domain, system and owning team), so flows need no changes; messages and custom steps sit with the step before them, and actors and external systems get a group of their own. The choice is kept in the URL (`?group=system&groupStyle=boxes`), and `<Flow lanes="team" />` / `<NodeGraph lanes="domain" />` start a flow grouped. Flows no longer show the L1/L2/L3 levels. The step-by-step walkthrough is smaller and starts at the first step: it numbers the steps walked so far, rings the current step, offers a dropdown at branches, expands long summaries, and carries on from the same step when the flow is regrouped. Saving a layout is hidden while a flow is grouped, and the Mermaid export leaves the groups out. Handle animations now run on the compositor and flow pages send less data to the browser, so large flows pan and animate more smoothly.
- f754d22: Add a floating canvas toolbar to the visualiser with levels of detail, simulate messages, minimap and fit to view. The levels are the same on every diagram: L1 for domains, systems and their relationships, L2 for services and data stores, and L3 adding messages and channels. Levels a diagram doesn't have are greyed out (e.g. L1 on a service's diagram). The level is kept in the URL (`?level=2` / `?level=3`) so shared links open at the same level. Adds a "Hide messages" option to the canvas menu, makes the toolbar follow the catalog theme colour, and removes the "Open in EventCatalog Studio" menu item. Clicking a legend entry now hides (or shows again) those nodes rather than highlighting them, re-laying out the graph with an animation and fading the entry while hidden; hidden messages and channels keep the nodes either side connected. Nodes leaving the graph when switching levels now fade out. The level is remembered for each kind of diagram (e.g. services and flows separately), legend entries hidden stay hidden when switching levels, and diagrams levels don't apply to (e.g. entity maps) don't show them.
- f754d22: A system's visualiser page (`/visualiser/systems/:id/:version`) now has levels. L1 shows the system context diagram. L2 keeps the context but expands the system into its services and how they connect, with its relationships and actors connected to the expanded system. L3 adds messages and channels. Switching levels animates, and `?level=1|2|3` opens a level directly (the page opens at level 1 otherwise, as it does for domains). Layouts saved in dev mode for the system context carry over to level 1, but those saved for a system's old Resource Diagram don't carry over to levels 2 and 3, as they're laid out differently (inside the system's box). The separate System Context page now redirects to level 1, and the system sidebar has a single "Diagram" link in place of "Context Diagram" and "Resource Diagram". The system being viewed is marked "Viewing" on the context diagram, context layouts leave room for edge labels, and the visualiser `NodeGraph` accepts an `overviewGraph` to show as level 1.
- 2d6e53b: Add `showMenu`, `compactSearch` and `hideAttribution` props to `NodeGraph`, for hosts that embed the visualiser in small spaces (e.g. EventCatalog's MCP App view). They default to the current behaviour.

### Patch Changes

- 3b46a41: `@eventcatalog/core` 5.0.0 (including its pre-releases) and later is licensed under the Business Source License 1.1 (`BUSL-1.1`), replacing the MIT License and the separate EventCatalog Commercial License for the enterprise and federation code. Releases up to and including 4.x remain available under the MIT License, and their notice is kept in `NOTICE`.

  The ecosystem packages, including `@eventcatalog/create-eventcatalog`, stay MIT and now ship their own `LICENSE` file. New catalogs get a License section in their README that links to the Business Source License and notes that the catalog's own content belongs to its authors. `@eventcatalog/breaking-changes` moves from ISC to MIT.

## 4.1.5

### Patch Changes

- f2fd5b7: Render flow steps that reference a catalog system as System nodes, including their docs link, instead of generic Step boxes.

## 4.1.4

### Patch Changes

- d2a6402: Use dagre's tight-tree ranker for large node graphs so domain and architecture maps layout in hundreds of milliseconds instead of several seconds.

## 4.1.3

### Patch Changes

- cd55298: feat(core): render node graphs for channels

  Channel nodes offer a "Focus node" link to `/visualiser/channels/{id}/{version}`, but that
  route was never generated, so the link 404'd. For the same reason `<NodeGraph />` on a channel
  documentation page rendered empty.

  Channels are now registered as a graph root in both places, and have their own graph showing the
  producers and messages that publish into the channel, the services and agents that consume from
  it, and any channels it routes to or is routed from. Channel documentation sidebars now also
  include an **Architecture → Map** link to the channel graph when the visualiser is enabled, and
  every channel in a routed chain exposes the standard resource context menu. Navigating between a
  channel's map and documentation now also keeps the channel sidebar selected.
  The focused channel is highlighted with the same persistent viewing border as other resource nodes.
  Channel maps resolve complete routing chains, so messages enter through their producer channel,
  pass through intermediate channels, and reach consumers through their configured channel without
  incorrect direct edges to the focused channel.

## 4.1.2

### Patch Changes

- 3395e8c: fix: bump vulnerable dependencies flagged by npm audit (hono, mermaid, react-syntax-highlighter, uuid)

## 4.1.1

### Patch Changes

- 5dd9f5d: Add recursive embedded entity properties and opt-in whole-entity relationship targets, render embedded properties in entity documentation and visualiser nodes, and keep generated entity maps more compact.

## 4.1.0

### Minor Changes

- 6bd170f: Allow services, domains, and agents to document messages triggered by any received message and show both sides of those relationships in message sidebars and node graphs. Messages with documented trigger relationships include a dedicated Trigger paths page with one visual row per path and its optional scenarios; messages without paths do not generate the page. The SDK supports trigger pointers and includes domains when resolving message producers and consumers. Message, service, and data store visualizers now keep the currently viewed resource visibly marked as the graph's focus, and resource context menus can focus another node in its own map. Edge labels now render above graph edges so intersecting paths do not obscure their text.

## 4.0.1

### Patch Changes

- f963964: Fix visualiser image export (download visual) so grouped graphs are no longer cropped and SVG edges/labels keep their colors in the exported PNG

## 4.0.0

### Major Changes

- 728ca67: Add support for a new `systems` collection. Systems are a versioned resource that can be defined in any folder (including inside domains), rendered as documentation pages, and listed in the sidebar with their own icon and color. Systems can group services, flows, entities, data stores (containers), and diagrams, have their own architecture overview page (`/architecture/systems/[id]`) listing their entities, services, external integrations, data stores, and flows, be visualised as an architecture map, be browsed and filtered on a dedicated discover page (`/discover/systems`), and be targeted by architecture decision records (`appliesTo: [{ type: 'system' }]`). Domains can reference one or more systems, which are listed in the domain sidebar, rendered as expandable sections on the domain's architecture page (listing the system's services, like subdomains, with external services shown under "External Integrations"), and merged into the domain's architecture map (each referenced system's services are grouped within the domain graph). Teams and users can own systems, which are surfaced on their profile pages.

  Systems can also declare `relationships` to other systems (each with an optional `version` and `label`), which power a new **Context Diagram** visualiser (`/visualiser/systems/[id]/[version]/context`, linked from the system sidebar under Architecture). Starting from a system, the diagram walks its relationships outward to build the reachable neighbourhood of systems, rendering each as a node (showing its service, entity, and data store counts) connected by labelled edges. Clicking a system node opens that system's architecture map.

  Systems support a `scope` of `internal` (default) or `external`. External systems represent third-party/SaaS systems you integrate with (e.g. "Resend", "Stripe") and are shaded and badged as "External System" in the Context Diagram.

  Systems can also declare `actors` — people or roles that interact with the system (e.g. a Customer or Support Agent). Each actor has an `id` (used to de-duplicate the same actor across systems), an optional `name`/`label`, and a `direction` (`inbound` = actor → system, e.g. "logs into"; `outbound` = system → actor, e.g. "sends notifications to"). Actors are rendered as nodes on the Context Diagram connected to their system by a labelled, directional edge.

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
