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
| Who you are (your name, kept in this browser, and its colour; shared by the Studio page and canvases), or who you signed in as | `identity.ts`, `components/JoinForm.tsx`, `components/Picture.tsx`, `server/sign-in.ts` |
| Routes | `pages/index.astro` (`/studio` lists the canvases, styled like the catalog's tables; `/studio?new=1` opens New canvas), `pages/[id].astro` (`/studio/<id>`) |
| The Studio API (`/api/studio/canvases`: list, create, get, copy, delete) | `api/canvases-api.ts` (the Hono app), `api/canvases.ts` (its route), `api/client.ts` (used by Studio's pages) |
| Storage (Studio's queries; the database, migrations and SQL helpers are the catalog's, in `features/storage/`) | `server/storage.ts`, `server/sql/storage.sql` |

Outside the folder: the WebSocket server is `integrations/studio-server.mjs`, routes are injected in
`features/integrations/eventcatalog-features.ts`, the nav item is in `layouts/VerticalSideBarLayout.astro`, and
the canvas MCP App is `features/mcp/apps/canvas/` (built by `packages/core/scripts/build-mcp-apps.mjs`, which
bundles Studio's components: rebuild it after changing them).

## Constraints

- **Experimental: dev server, or production with `studio.enabled`.** Everything is behind `isCanvasEnabled()`
  (`@utils/feature`): the dev server, or `output: 'server'` with `studio.enabled: true`; `studio.enabled: false` turns it
  off everywhere. The routes, the WebSocket server, the canvas MCP tools and the sidebar item all check it. Keep new
  entry points behind it.
- **Sign-in (SSO).** With authentication on, the pages are behind the sign-in middleware, and the collaboration socket
  (which the middleware never sees) refuses anyone without a session in Hocuspocus's `onConnect`. The check is handed to
  the runtime by the pages (`startStudio({ isSignedIn })`, `server/sign-in.ts`), since Auth.js's config doesn't load in
  the dev server's integration; until then, connections are refused. Signed-in people are shown by their SSO name and
  picture (`getSignedInUser`, the `signedInAs` prop) and can't rename themselves; pictures are URLs from the provider
  (only `https://`), carried in presence and kept on comments and status changes (`Author.picture`), with initials
  shown when one doesn't load. New entry points that open canvases must pass `isSignedIn` too.
  A socket counts as connected once the server lets it in (`onAuthenticated`), not when it opens: a chat's view
  (MCP App) opens it without the person's session and is refused, then syncs through its MCP tools
  (`onAuthenticationFailed`), which the MCP server's own auth (`mcp.auth`) covers. A refused page shows it's offline.
- **Starting Studio:** pages and the MCP endpoint call `startStudio()` before using canvases (loads storage once). In
  dev, `integrations/studio-server.mjs` attaches the WebSocket to Astro's dev server. In production, `eventcatalog
  start` runs the Node adapter's entry with `ASTRO_NODE_AUTOSTART=disabled`, starts it itself and leaves the HTTP server
  on `globalThis[Symbol.for('eventcatalog.http-server')]`, where `start()` attaches; it then requests
  `/_eventcatalog/start` once (`features/server/start.ts`: opens and migrates the storage, then starts Studio) so
  Studio is listening before reconnecting tabs arrive (see `SERVER_BOOTSTRAP` in `src/eventcatalog.ts`). Running
  `dist/server/entry.mjs` directly serves the catalog without Studio's WebSocket.
- **Canvases are stored in the catalog's storage** (`storage` in eventcatalog.config.js, `server/storage.ts`): `memory`
  (the default) or `sqlite` (one database for the whole catalog, shared with other features; Node's built-in
  `node:sqlite`, Node 22.13+; in a container, on a volume). The runtime keeps every canvas's latest snapshot
  in memory (loaded in `useStorage` before the WebSocket is attached) and writes through to storage in
  `onStoreDocument`, so listing and opening canvases never wait on storage. Writes are synchronous so open canvases
  are saved as the process exits (`exit`, `SIGINT`, `SIGTERM`). Canvases aren't written into the catalog's files:
  in production the server's copy is the only one, and it outlives deploys. New storage types implement
  `CanvasStorage` (`loadAll`, `save`, `remove`).
- **The database's schema changes through the catalog's migrations only** (`features/storage/sql/migrations/`, one
  numbered order for every feature, `0001-what-it-does.sql`; Studio's tables are prefixed `studio_`). They run when the
  dev server and `eventcatalog start` start (not on build) and are recorded in the `migrations` table. Add a new file
  for any change; never edit one that has shipped (databases out there have run it). They're built into the server code
  with `import.meta.glob`, so there are no files to find at runtime. Every other statement lives in a `.sql` file,
  named by a `-- name:` line and looked up by that name (`namedStatements`); keep SQL out of the TypeScript.
- **The Studio API is a public, stable contract** (`api/canvases-api.ts`): canvases as a whole, in JSON, errors as
  `{ error }` with the HTTP status, timestamps in ISO 8601, cursor pagination. Add fields rather than change or remove
  them. It never edits what's on a canvas: that goes over the socket (people) or the MCP tools (agents). With sign-in
  on, the auth middleware answers it with a JSON 401 rather than redirecting.
- **Deleted canvases stay deleted** (`runtime.deleteCanvas`): storage removes the canvas and records its name
  (`studio_deleted_canvases`), and the runtime refuses it everywhere (`onConnect` with `CANVAS_DELETED_REASON`, `exists`,
  `saveSnapshot`), because any browser that had it open holds a full copy and would sync it back. Open tabs are closed
  with that reason and show "This canvas was deleted"; its link shows the same (410).
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
- **Fit containers with rendered sizes in the browser.** The document doesn't know how big cards render, so
  `fitGroupToChildren` / `fitContainersAround` / `setNodeParent` take `RenderedSizes` (`renderedSizes()` in
  `use-studio-flow`); without them (server agents) containers are fitted to each type's largest size and overshoot.

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

## Editing interactions

- **Containers grow while something's dragged in them**, on every side (`previewContainerGrowth`; growing up or
  left moves the container and what else is in it the other way), shown here only (`showDragPreview`) and saved in
  the drop's own transaction. React Flow places the dragged nodes themselves. A container stops growing once the
  dragged node's middle is `KEEP_IN_CONTAINER_MARGIN` past where it was, so you can still drag things out. Resizing a
  node grows the containers around it on resize end; a container can't be resized smaller than what's in it
  (`shouldResize` in `GroupNode`).
- **Container size changes animate** through the `is-container-resize` class, set on the canvas element (not React
  state) whenever a container's size arrives from the document. Your own live resize isn't animated (it would lag the
  pointer).
- **Copy, cut and paste** use the browser's clipboard events (`clipboard.ts`): Studio's own type plus a plain text
  list, no permission prompts, and they work between canvases. A paste is one `insertNodes` transaction (one undo
  step) and selects what was pasted. Right-click "Copy" goes through `document.execCommand('copy')` so it's the same
  path; "Paste here" uses what was last copied in this tab (reading the clipboard from a click would prompt).
- **Reconnecting an edge** (`onReconnect` → `reconnectEdge`) keeps the edge's id, relabels it for its new ends unless
  someone wrote the label, and won't make self or duplicate connections. Dropped anywhere else, it stays put.
- **The details panel opens on demand**: double clicking a node (or inside a container), or "Edit details" in its
  menu. Selecting doesn't open it; Escape or its close button closes it. Notes and text are written on the canvas
  instead (`isWrittenOnCanvas`): their data is their text, agents read and write it as `text`, and L1 drops them.
  Text only has a width (`autoHeight`): its height follows what's written, and its side handles resize its width.
  Sticky notes (Studio's own, not the visualiser's) are about square and grow with their text, and never go in a
  container (`canGoInContainer`): dropping, dragging, pasting and agents all leave them on the canvas.
- **Comments are part of the selection**: ⌘A selects them, Delete deletes them, and dragging the selection moves the
  ones not on a node (saved on drop). Selected comments are local state, like selected nodes.
- **Dragging from the left panel shows the real node** (`DragGhost.tsx`): the browser's drag image is hidden (a
  transparent pixel: browsers shrink, fade and back it), and a ghost follows the pointer on `dragover`, drawn in a
  small React Flow of its own (nodes need React Flow around them) at the canvas's zoom, exactly where the drop puts
  the node. Scope DOM queries to `.studio-canvas`: `.react-flow__node` also matches the ghost.
- **Feedback is CSS** (`studio.css`): selected and hovered nodes get an outline from the node wrapper's `::after`,
  containers draw their own, and the drop target (`.ec-drop-target`) uses the theme's button colours, which stay
  strong in light and dark themes (the accent can be pale).

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

- **L1 and L2 match the visualiser's levels** (`utils/node-graphs/domain-levels-node-graph.ts`, the visualiser's
  `hide-messages.ts`); compare with them when changing either:
  - Edges joined through hidden messages or channels are "bridged": dashed, muted, `bridged-<from>-<to>`, labelled
    only with the messages they carry (`getMessagesLabel`, no truncation), no label through channels alone.
  - L1 edges between folded nodes are plain (solid, 20px arrow, `level-<from>-<to>`), labelled with messages only;
    actors' edges keep their labels (like the visualiser's relationships).
  - L1 systems are `system` cards (same ids, so switching levels glides) with services (and agents), data stores and
    messages counted; domains with no system in them are `context-domain` cards. L2 keeps the canvas's own edges
    between what it shows. Containers are sized by the layout (empty ones as the visualiser lays them out).
  - L1 needs a system, or more than one domain; L2 is always there. Levels fit with `maxZoom: 1`.
  - One deliberate difference: messages sitting in a domain (not a system) connect the systems either side (the
    visualiser folds them into the domain), because catalog domains on a canvas hold their messages.
- Levels are laid out with the visualiser's ELK layout and re-laid out (debounced) as the canvas changes.
- **Sticky notes belong to a level** (`data.level`, absent means L3; `getNoteLevel` / `isOnLevel` in
  `node-types.ts`). A note is only shown on its level. On L1 and L2 notes are drawn over the level's layout and are
  the only thing you can change there: they're draggable/selectable per node (`asLevelNote`), and
  `onLevelNodesChange` passes only their changes to the canvas (the level's cards aren't canvas nodes). Notes never
  go into `getLevelGraph`, `levelKey`, `getLayoutPositions` or agent placement, so they don't re-lay out a level and
  aren't moved by L3's layout. Anything else added while L1 or L2 is shown switches to L3 and goes there.

## Canvas status

- A canvas is `draft` (default), `proposed`, `accepted` or `rejected`: `meta.status` plus `meta.statusHistory` (who,
  when, optional note), changed with `setCanvasStatus` (`canvas-doc.ts`).
- Decided canvases (accepted, rejected) stay editable, but a change to nodes or edges makes them a draft again,
  recorded against whoever changed it. Comments don't count. Browsers do it for their own (local) transactions in
  `useStudioFlow`; server agents do it in `asAgent`'s `stage.change` with `reopeningIfEdited`, which checks the
  transaction it's in (Hocuspocus direct connections wrap the change in one, so `afterTransaction` would be too late).
  Anything new that writes nodes or edges outside these paths must reopen too.
- Status changes use `STATUS_ORIGIN`, which undo doesn't track: undo takes back edits, never decisions.

## Before you finish a change

- Run the Studio tests: `pnpm run test packages/core/eventcatalog/src/features/studio --run` (and `features/mcp`,
  `features/integrations` if you touched tools or routes). Add tests for pure logic in `__tests__/`.
- Type-check with the app's tsconfig (`packages/core/eventcatalog/tsconfig.json`) and run `pnpm run format`.
- Rebuild the canvas MCP App if you changed anything it bundles.
- For anything touching sync, presence, rendering or interaction, verify in two browsers and, for performance,
  profile: see [references/verification.md](references/verification.md).
- Check whether `eventcatalog/eventcatalog-editor` needs a matching change (Studio itself doesn't; visualiser node
  exports or props might).
