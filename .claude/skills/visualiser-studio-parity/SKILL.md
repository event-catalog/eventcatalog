---
name: visualiser-studio-parity
description: Studio and the visualiser must look and behave the same. Automatically applies when changing EventCatalog's visualiser (packages/visualiser), the diagrams core builds for it (utils/node-graphs, the NodeGraph components) or Studio (features/studio). Use it to keep a diagram and the Studio canvas opened from it ("Open in Studio") matching at every level, and to know what to compare before finishing.
globs:
  - packages/visualiser/src/**
  - packages/core/eventcatalog/src/utils/node-graphs/**
  - packages/core/eventcatalog/src/components/MDX/NodeGraph/**
  - packages/core/eventcatalog/src/features/studio/**
---

# Visualiser and Studio parity

A Studio canvas is a diagram people can edit. Someone who opens a diagram in Studio ("Open in Studio" in the
visualiser's menu) must see the same picture: the same nodes, in the same places, nested the same way, joined by
the same edges with the same labels and styles, at every level. Differences read as bugs. When you change how either
one draws or derives something, change the other to match (or record the difference below, with why).

## What must match

| | Visualiser | Studio |
|---|---|---|
| Node and edge components | `diagramNodeComponents` (`nodes/diagram-nodes.ts`, every type a diagram draws), `edgeTypes` | the same map (`components/canvas-nodes.tsx`), overriding only its own types (notes, text, containers); Studio's actor is the visualiser's `context-actor` |
| Legend | `LegendPanel` + `getLegend` (`components/Legend.tsx`): each kind of node and how many, click to hide or show | the same, for what's shown (the canvas, or the level), not counting notes or text; hiding is only for that person |
| Fitting to the screen | `DIAGRAM_FIT_VIEW_OPTIONS` (`utils/fit-view.ts`): fixed margins (clear of the title, menus and bar), never past 100% | the same, for fit view, levels, reorder and a canvas's first fit |
| Canvas background | `DiagramBackground` (dots, `--ec-bg-dots`, on the `.react-flow` colour from `styles-core.css`) | the same component |
| Top left menu | The diagram's title and ⋮ in a bordered button, 16px in from the corner, opening its menu (`DIAGRAM_MENU_*` in `components/diagram-menu.ts`) | `CanvasHeader`'s bars and menus (and the status menu) built from the same `DIAGRAM_MENU_*` styles: the title (editable), its status, ⋮ |
| Bottom bar | `CanvasToolbar`, built from `Toolbar`, `ToolbarButton`, `ToolbarDivider`, `ZoomLevel` (and `Tip` tooltips): fit view, zoom out / zoom % / zoom in, then the levels, then the resource's tools, then simulate messages and the minimap | `CanvasControls`, built from the same pieces in the same order: reorder, fit view and zoom, then the levels, then undo, comments and notes (unavailable controls say why) |
| Layout | ELK, `layoutWithElk` (`utils/elk-layout.ts`) | the same (`layout.ts`): Reorder, `layout_canvas`, levels |
| Edge routes | `data.route` from ELK, drawn by `useRoute` (`edges/route.ts`) | kept in `data.route`: copied from the diagram and set by every layout (`applyLayout`) |
| L1 (domains, systems, relationships) | `collapseSystems` + `hideMessageNodes` (`utils/node-graphs/domain-levels-node-graph.ts`) | opened from a diagram: the diagram's own L1 (`meta.diagramLevels`); otherwise `level1` (`levels.ts`) |
| L2 (services, data stores) | the page's `hiddenMessagesGraph`, or `hideMessageNodes` + ELK in the browser | opened from a diagram: the diagram's own L2; otherwise `level2` (`levels.ts`) |
| Which catalog resource a node shows | `getNodeCatalogResource` (`utils/node-graphs/node-resource.ts`), shared | the same |
| Opening a diagram in Studio | `onOpenInStudio` (`NodeGraph.tsx`) hands Studio the title and `getSnapshot`, taken once the canvas is named: the full L3 graph, its routes, the level shown, and L1/L2 laid out with their edges as drawn (`prepareEdges`) | `from-visualiser.ts` + `POST /api/studio/canvases` with nodes, edges and levels; opens at `?level=` |

## Rules both follow

- **A canvas opened from a diagram shows the diagram's own levels.** Its L1 and L2 are the visualiser's graphs,
  laid out and drawn as it drew them, mapped onto the canvas's nodes (same ids, so switching levels glides), kept in
  `meta.diagramLevels` with the canvas's structure (`getStructureKey`). Studio shows them while the structure is the
  same (moving nodes keeps them) and works its levels out itself once it changes (`getDiagramLevel`). Levels the
  diagram doesn't have are unavailable on the canvas too, with the diagram's reason (`getDiagramLevelUnavailable`),
  e.g. L1 of a domain without systems or subdomains. Don't recompute what the visualiser already gives you.

- **Same place:** a copied card keeps the diagram's top-left corner, containers their size; edges keep their routes.
- **Nesting:** domains and systems are containers holding what's in them. A domain inside another is a subdomain
  (badged "Subdomain"). On L1 a domain container stays a container while something is shown in it (a system or a
  subdomain card), and becomes a domain card only when nothing is.
- **External systems** keep `scope: 'external'` (dashed "External system" style) everywhere, containers included.
- **Relationships win:** an edge drawn straight between two systems (or actors, domains) is a relationship: on L1
  it keeps its label and replaces the message-derived edges between the same pair, either way.
- **Actors** are copied from diagrams as Studio actors (by name), with their labelled relationships, and drawn with
  the visualiser's actor card.
- **Edges through hidden messages:** labelled with the messages they carry (`getMessagesLabel`). On L1 messages are
  folded into the domain or system they're in, so edges to and from domains and systems are plain (solid); only
  edges through messages between nodes outside them are "bridged" (dashed, muted). L2 bridges every edge through a
  message or channel.
- **Counts on cards** (services, messages, data stores) are counted the same way.
- **Edge layers:** an edge sits at the layer of the deepest node it joins; routes keep it off other cards.

## Known differences (keep this list short, and say why)

- After the canvas's structure changes, Studio works out what L1 and L2 show itself (`levels.ts`), so labels and
  counts can differ from the diagram's from then on. Where things are doesn't change: levels keep their layouts
  (the diagram's to start with, and the diagram's edge routes for the same connections).
- The diagram's "Viewing" mark (the resource whose page it's on) isn't kept: a canvas isn't on anyone's page.
- Message edges aren't animated on a canvas unless selected (Studio's performance rule), where the visualiser
  animates them all with "Simulate messages" on (by default only for graphs of up to 30 nodes). Both pause them
  while the canvas moves (`pauseEdgeAnimations`), and both pulse handles' glow only on the hovered or selected node:
  keep those the same (the CSS is the visualiser's).

- Users, flow steps, entities and other nodes that are neither catalog resources nor actors aren't copied to
  Studio.
- The visualiser's L1 counts a channel from another domain as inside the first domain that consumes from it, so it
  can show an edge from that domain to the channel's other consumers (e.g. Customer Notifications -> Loyalty System
  on the Customer domain, from Ordering's `order-events`). Studio doesn't: that edge isn't a real connection. Fix it
  in the visualiser (`collapseSystems`) rather than copying it.
- Studio's L1 can only use what's on the canvas: catalog knowledge the visualiser looks up (e.g. a domain's
  subdomains it doesn't show) has to be on the canvas (in node data, or as nodes and edges) to be shown.
- Messages sitting in a domain (not a system) connect the systems either side on Studio's L1, because catalog
  domains on a canvas hold their messages.

## Before you finish

1. Run both test suites: `pnpm run test packages/core/eventcatalog/src/features/studio --run` and the visualiser's
   (`cd packages/visualiser && npx vitest --run`). Add a test in `__tests__/levels.spec.ts` or
   `__tests__/from-visualiser.spec.ts` for any rule you add or change.
2. Compare in the browser, side by side. On the dev server, for a domain (e.g. `/visualiser/domains/payments/1.0.0`),
   a system and a service: at each of L1, L2 and L3, use "Open in Studio" and check Studio shows the same nodes,
   nesting, badges, edges, labels and edge styles. Check Studio's L1 and L2 again after switching from L3. Delete
   the test canvases afterwards (`DELETE /api/studio/canvases/<id>`).
3. After changing the visualiser package, rebuild it (`pnpm run build` in `packages/visualiser`), restart the dev
   server with its dependency cache cleared (`examples/default/.astro/eventcatalog/vite/deps`), and rebuild the MCP
   Apps (`node packages/core/scripts/build-mcp-apps.mjs`), which bundle both.
