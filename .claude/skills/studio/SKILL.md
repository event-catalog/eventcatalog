---
name: studio
description: Constraints, performance rules and conventions for EventCatalog Studio, the collaborative canvas at /studio where people and AI agents design together (Yjs + Hocuspocus + React Flow, MCP and WebMCP agents). Automatically applies when changing anything under packages/core/eventcatalog/src/features/studio/, the canvas MCP App, or the Studio routes and nav item. Use it to implement, review or debug Studio code without regressing real-time collaboration or rendering performance.
globs:
  - packages/core/eventcatalog/src/features/studio/**
  - packages/core/eventcatalog/src/features/mcp/apps/canvas/**
  - packages/core/eventcatalog/integrations/studio-server.mjs
---

# EventCatalog Studio

Studio is a live canvas: every change one person makes reaches everyone else, and AI agents work on it like
people (their own pointer, one step at a time). Most code here runs on every pointer move, every drag frame or
every incoming update from someone else, so small mistakes multiply across everyone on the canvas. Read this
before changing Studio, and check the rules that apply to your change.

Also follow the `visualiser-performance` skill: Studio renders the visualiser's nodes and edges with React Flow,
and the same rules apply (stable `<ReactFlow>` props, memoised nodes, no `nodes`/`edges` in dependency arrays).

How to measure and verify a change: [references/verification.md](references/verification.md).

## Where things are

`packages/core/eventcatalog/src/features/studio/`:

| Area | Files |
|------|-------|
| Shared document (Yjs maps, reading and writing nodes, edges, comments, meta) | `canvas-doc.ts` |
| Syncing the document into React Flow | `hooks/use-studio-flow.ts`, `flow-state.ts` |
| Presence (pointers, selections, drags, views) | `hooks/presence-sender.ts`, `hooks/presence-store.ts`, `components/Presence.tsx` |
| The canvas page component | `components/StudioDesigner.tsx` (with `LeftPanel`, `PropertiesPanel`, `CanvasHeader`, `CanvasControls`, `Comments`) |
| Node types, sizes and containers | `node-types.ts`, `grouping.ts`, `components/canvas-nodes.tsx` |
| Catalog resources on the canvas | `catalog-resources.ts` (server), `catalog.ts` |
| Levels L1, L2, L3 | `levels.ts`, `layout.ts` |
| What agents can do (shared by MCP and WebMCP) | `canvas-actions.ts`, `placement.ts`, `agent-choreography.ts` |
| MCP tools and the server runtime | `server/canvas-mcp.ts`, `server/runtime.ts`, `server/tool-icons.ts` |
| WebMCP (agents in the browser) | `hooks/use-canvas-webmcp.ts`, `pages/webmcp-relay.ts`, `components/ConnectAgentDialog.tsx` |
| Views that can't open the WebSocket (chat sandboxes) | `tool-sync.ts` |
| Routes | `pages/index.astro` (`/studio` starts a canvas), `pages/[id].astro` (`/studio/<id>`) |

Outside the folder: the WebSocket server is `integrations/studio-server.mjs`, routes are injected in
`features/integrations/eventcatalog-features.ts`, the nav item is in `layouts/VerticalSideBarLayout.astro`, and
the canvas MCP App is `features/mcp/apps/canvas/` (built by `packages/core/scripts/build-mcp-apps.mjs`, which
bundles Studio's components: rebuild it after changing them).

## Constraints

- **Experimental and dev only.** Everything is behind `isCanvasEnabled()` (`@utils/feature`): the dev server with
  authentication off. The routes, the WebSocket server, the canvas MCP tools and the sidebar item all check it.
  Keep new entry points behind it.
- **Canvases live in memory** (`server/runtime.ts` keeps a snapshot per canvas) and are lost on restart. If you
  add persistence, store the full binary state (`Y.encodeStateAsUpdate`), never JSON, and flush pending stores on
  shutdown (`hocuspocus.flushPendingStores()`).
- **Hocuspocus 4.7 is attached to Astro's HTTP server** (`runtime.attach`), not `listen()`ed, so `quiet` and
  `stopOnSignals` do nothing. Leave WebSocket compression off (small binary frames; `ws` warns about memory
  fragmentation). Keep `onLoadDocument` from throwing (hocuspocus#1156 leaves the document half loaded).
- **Naming:** the feature is Studio (`/studio`, `features/studio`, `StudioDesigner`, `useStudioFlow`,
  `/_eventcatalog/studio`). Don't reintroduce "collab" names; "collaboration" in prose is fine.
- **Theming:** `ec-*` CSS variables only, no `dark:` variants. Status colours (success, danger, connection dots)
  come from `components/status.ts`.
- **One implementation of agent actions.** MCP tools (server) and WebMCP tools (browser) share
  `canvas-actions.ts` and `agent-choreography.ts`. Change behaviour there, not in one of the tool files.

## The shared document

- Top level Y.Maps: `nodes`, `edges`, `threads` (comments), `meta`. Each node or edge is one plain object per key,
  so a write replaces the whole object: concurrent writes to the same node are last-writer-wins for the whole
  node. That's acceptable because each write starts from the latest copy (read with `nodes.get(id)` inside the
  transaction), so only edits within one network round trip of each other conflict.
- **Never sync local-only state.** `selected`, `dragging`, `resizing` and `measured` (`LOCAL_NODE_KEYS`) stay in
  each browser; `patchShared` keeps them when shared changes arrive.
- **One user action is one `doc.transact`** (one update to send, one undo step, observers run once). Multi-node
  changes (layout, multi-select drops, a container with its contents) go in a single transaction.
- **Transaction origins mean something:**
  - `LOCAL_ORIGIN`: changes already shown here (drags, resizes). Observers skip them; undo tracks them.
  - `null`: other local changes (adds, deletes, renames). Observers apply them; undo tracks them.
  - `BROWSER_AGENT_ORIGIN`: a WebMCP agent in this tab. Synced, not in the user's undo.
  - Anything else (the provider, other people, server agents): applied, never undone by this user.
  Undo is per person: `trackedOrigins: new Set([null, LOCAL_ORIGIN])`. Keep it that way.
- **Observers patch, never rebuild.** Use `event.keysChanged` with `patchShared`: unchanged nodes keep their
  object identity so React Flow doesn't re-render them, and it returns the same array when nothing changed.
  Never call `toJSON()` or rebuild all nodes in an observer.
- **Containers** (`domain-group`, `system-group`) hold their children through `parentId`; child positions are
  relative to the container. `fitGroupToChildren` grows a container to fit and, when it grows up or left, moves
  the children the other way so nothing moves on the canvas. Plan positions in canvas coordinates and convert to
  relative at the moment you add a node (see `playAddToCanvas`).

## Real-time rules

1. **Never write the document on every drag frame.** Nodes being dragged travel in presence (`moving`, with the
   pointer, in one awareness message) and only the drop is saved, in one transaction, after
   `undoManager.stopCapturing()` so each drag is its own undo step. Writing per frame grows the document forever
   (every overwrite leaves a tombstone) and the undo manager keeps every intermediate copy in memory.
   Server agents do the same (`AgentStage.sharesMoves`). Container resizes still write per tick: fine while
   rare, move them to presence if that changes.
2. **All presence goes through the presence sender** (`createPresenceSender`, about 30 updates a second, leading
   and trailing, so the last position always goes out). Never call `awareness.setLocalStateField` per event:
   awareness re-sends the whole local state on every change, so separate calls mean separate messages.
3. **Keep presence small.** Every message carries the whole state (user, pointer, selection, viewport, moving).
   Don't put large or growing data in it.
4. **Don't null your presence on idle.** Hocuspocus closes clients that send nothing (hocuspocus#1171); awareness
   renews non-null state every 15s. Clearing just the pointer (hidden tab) is fine.
5. **A node you're dragging keeps your position** when someone else's change for it arrives (`keepDragged`).
   Someone else's drag is shown from their presence (`withPositions`) until their drop arrives in the document;
   if it never does (they left mid-drag), it goes back to the saved position after `DROP_SETTLE_MS`.
6. **Server agent presence expires** after `AGENT_PRESENCE_TTL_MS` (25s, below awareness's 30s timeout) with
   `removeAwarenessStates`. Agent animation frames are presence only; a direct connection is opened per document
   change, so don't add per-frame `stage.change` calls.
7. **Hidden tabs** send `pointer: null`; coming back (or `online`) calls `provider.connect()` to skip the retry
   backoff.

## Rendering rules

1. **Presence never goes through React state at the canvas level.** `presence-store` wraps awareness for
   `useSyncExternalStore`. Use `usePeople` (changes only on join, leave, rename, or an agent's activity) for lists
   of who's here; subscribe per peer for anything that moves.
2. **Remote pointers move outside React.** `PeerPointer` subscribes to the store and writes
   `transform: translate() scale()` itself, gliding to each update over the time since the previous one. Don't
   render pointers from React state, don't use `left/top`, and don't add CSS transitions to them.
3. **Overlays follow one node, not the nodes array.** Selection outlines and comment pins use
   `useInternalNode(id)` and `internals.positionAbsolute`. Never pass `nodes` to an overlay, panel or header: they
   would re-render on every drag frame. Panels get only what they show (e.g. `PropertiesPanel` takes
   `Pick<Node, 'id' | 'type' | 'data'>`, memoised).
4. **Derive structure with string keys.** Things that depend on which nodes exist (hierarchy order, which catalog
   resources are on the canvas, level graphs) memo on keys like `structureOf(nodes)` or a joined id string, not
   on `nodes`.
5. **Animated message edges cost every frame** (SMIL `animateMotion` forces style and layout), even when hidden
   with CSS. Only edges of a selected node or a selected edge animate; the rest are swapped for a static copy
   (`withoutEnvelope`, cached in a WeakMap so identity is stable). Keep that when adding edge types or levels.
6. **WebMCP's polyfill is opt-in.** `@mcp-b/webmcp-polyfill` watches the whole DOM with a MutationObserver, which
   costs on every drag and pan. It's only installed after "Turn on for this tab" in Connect agent (browsers with
   native WebMCP get the tools straight away). Don't install it by default.
7. **Stable `<ReactFlow>` props.** Constants (keys, pan buttons, fit options) live outside components; callbacks go
   through `useStableCallback` or `useCallback`. React Flow's `NodeWrapper` isn't memoised: a node re-renders
   whenever its object changes, so keep node objects identical unless they really changed.
8. **Interaction model is a design tool's:** drag on empty canvas draws a selection box (`selectionOnDrag`),
   panning is space + drag, the middle button or scrolling (`panOnScroll`), cmd/ctrl + scroll or pinch zooms,
   right click is the context menu. Containers let the pointer through their body (`studio.css`) and are moved,
   selected and resized by their header grip and handles, so you can box-select inside them. Read-only levels
   pan on drag.

## Agents

- **Agents work like a person** (`agent-choreography.ts`): the pointer glides to where they're going, nodes are
  dropped one at a time and connections are dragged, at a pace that speeds up for big changes so tool calls stay
  within client timeouts. Return error objects, don't throw (repo convention).
- **Placement** (`placement.ts`): nodes added without x/y go where an architect would put them: next to what they
  connect to (edges asked for, and catalog relations), flowing left to right, lined up and stacked around a shared
  neighbour, never moving what's already there. Containers are filled first so what's around them leaves room.
  Unconnected nodes go in a row below. Tune with `GAP` and `CLEARANCE`, and keep `placement.spec.ts` passing.
- **`layoutCanvas` / `layout_canvas` moves everything** (including what people placed): tool descriptions tell
  agents to use it only when asked. Keep it that way.
- Tool descriptions are the agent's documentation: when behaviour changes, update `ADD_TO_CANVAS_DESCRIPTION`,
  the MCP tool descriptions and the WebMCP ones together.

## Levels

`levels.ts` derives read-only views; L3 is the canvas people edit.

- **L1** matches EventCatalog's domain diagrams (`utils/node-graphs/domain-levels-node-graph.ts`): systems shown
  as `system` cards (same ids, so switching levels glides) with their service count; services fold into their
  system or domain; messages and channels outside a system carry the connection through to the systems either
  side; edges between a node and the container it's in are dropped; plain `default` edges labelled with the
  messages they carry. When changing it, compare with the visualiser's L1.
- **L2** hides messages and channels, connecting the nodes either side.
- Levels are laid out with the visualiser's ELK layout and re-laid out (debounced) as the canvas changes.

## Before you finish a change

- Run the Studio tests: `pnpm run test packages/core/eventcatalog/src/features/studio --run` (and `features/mcp`,
  `features/integrations` if you touched tools or routes). Add tests for pure logic in `__tests__/`.
- Type-check with the app's tsconfig (`packages/core/eventcatalog/tsconfig.json`) and run `pnpm run format`.
- Rebuild the canvas MCP App if you changed anything it bundles.
- For anything touching sync, presence, rendering or interaction, verify in two browsers and, for performance,
  profile: see [references/verification.md](references/verification.md).
- Check whether `eventcatalog/eventcatalog-editor` needs a matching change (Studio itself doesn't; visualiser node
  exports or props might).
