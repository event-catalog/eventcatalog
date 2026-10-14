# Verifying and measuring Studio on the web

Studio on the web (`apps/studio-web`) is checked like EventCatalog's Studio ([verification.md](verification.md)), with
its own tools and test canvases, since it runs on its own server (no catalog) and its live sessions go through an
encrypted relay rather than Hocuspocus.

## Running it

- `pnpm start:studio` from the repo root builds the visualiser and serves the app from source at
  http://localhost:8787 (`/` the canvas, `/mcp` the MCP endpoint). For production numbers:
  `pnpm --filter @eventcatalog/studio-web build`, then `node --enable-source-maps build/server.js` in the app
  (`PORT=…` for another port).
- **Restart the server after every build**: it reads the page (`dist/view.html`) once, when it starts. A server
  started earlier keeps serving the old page; if a restart seems to change nothing, check what's listening on the port
  (`lsof -ti tcp:8787 -sTCP:LISTEN`) is the server you started.
- **After changing the shared canvas, build the visualiser first** (`pnpm --filter @eventcatalog/visualiser build`):
  the app uses its `dist`. If React Flow says "you have not used ReactFlowProvider as an ancestor" (error 001), two
  copies of React Flow are in the bundle: `scripts/build-view.mjs` dedupes React, React Flow, Radix's dropdown and yjs
  with the visualiser's (pnpm gives a workspace package its own copies); add whatever else is duplicated there.
- A diagram to open: call `render_architecture` on `/mcp` (JSON-RPC `tools/call`) with a small model and open the
  `viewUrl` it returns.

## Browser tests (`pnpm test:e2e`)

- `pnpm --filter @eventcatalog/studio-web test:e2e` builds the app and runs Playwright (`tests/e2e/*.e2e.ts`, config
  `playwright.config.ts`, its own server on port 8797, Chromium). Run it after changing the canvas, containers, levels
  or the node card; add a test with any fix there. Vitest's unit tests are `*.test.ts`, so neither picks up the other.
- Tests open a fixture as a link (`openDiagram`), work it with the real mouse and keyboard (`select` is click then
  shift-click, `dragOnto` drags with `page.mouse`), and read the canvas through `window.__studioTest` (`level()`,
  `nodes()` with parents and canvas rects), which StudioCanvas only fills in when a test sets it before the page loads.
  Don't dig React Flow's store out of React's fiber, or dispatch synthetic mouse events: both broke in ways real input
  doesn't.
- Gotchas: a link opens with the agent's build playing **over** the canvas (the canvas under it is already still, so
  wait until a node is what's under the pointer; `openDiagram` does); after a layout or level change nodes **glide**
  (`.is-layout-transition`) while the canvas already has them where they end up, so `settled` waits for what's drawn
  to stop too; headless Chromium on macOS doesn't deliver ⌘ shortcuts, so press `Control+z` (Studio takes both).
- Core's Studio has no browser tests yet (it needs a catalog running).

## Two people in a live session

Open the session link (`/#room=<id>,<key>`) in two isolated browser contexts (separate storage, as two people), or one
tab plus `scripts/perf/fake-peer.mjs`. To skip the join dialog, set the room as started or joined before the page
loads (an `initScript`): `eventcatalog-studio-started-rooms` or `eventcatalog-studio-joined-rooms` (JSON arrays of room
ids) and `eventcatalog-studio-me` (`{ name, color }`) in local storage.

Checks worth keeping:

| Scenario | Expect |
|----------|--------|
| One drags a node, a comment pin or a hotspot marker | The other sees it glide along (every frame, not stepping), on the same level; no flick back on the drop |
| One types on a note or text, scales or turns text | The other sees it as it happens; it stays when they're done |
| Both reload, one at a time and together | Nothing is duplicated (notes and text included), and nobody's newer change goes back |
| One locks the canvas | It's locked for both (document state) |
| Someone joins a session of several, or a few join at once | Each joiner is sent the canvas once; the people already there are sent only the joiner's hello and presence (count the `/rooms/` WebSocket frames per page). 14 Oct 2026, 100-node canvas: a 6th person joining received 45 KB and the others ~0.2 KB each (before: 215 KB and 171 KB each); three at once 45 KB each and ~0.6 KB (before: ~1.9 MB and ~1.7 MB) |

## Tools (`apps/studio-web/scripts/perf/`)

Ported from core's `references/measure/`, with scenarios for this app:

- `measure.mjs` attaches to one tab of your Chrome over CDP (remote debugging on, see the file's header):
  - `node scripts/perf/measure.mjs scenarios <tab> idle,mouse,pan,zoom,drag,drops,levels,l2drag`: renders, commits,
    JS and main-thread time per scenario. Pipe into `node scripts/perf/per-frame.mjs` for renders per frame by
    component (`TOP=40` for more).
  - `node scripts/perf/measure.mjs idle <tab>`: main-thread time doing nothing, and what's animating.
  - `node scripts/perf/measure.mjs heap <tab> [rounds]`: the heap after GC across rounds (`HEAP_SCENARIO=drag|pan`
    for one kind). It should level off.
  - `node scripts/perf/measure.mjs load <tab> [runs]`: when the first node shows on opening, and the long tasks.
- `node scripts/perf/measure.mjs profile <tab> [scenario]`: self time by function (see verification.md). The page is
  one inline script, so profile lines are from the top of `dist/view.html`: the function is about 14 lines above
  (build with `VIEW_MINIFY=0` for names).
- A team of 8: `node ../../.claude/skills/studio/references/measure/fake-team.mjs '<session link>' --people 7
  --dragging 3` (from the app), with your tab in the session (start one from Share, in an isolated context).
- `fake-peer.mjs '<session link>' [seconds] [drag=<node id>@<x>,<y>[@L2] | listen]`: someone else in the session
  moving their pointer about 30 times a second (more than a real canvas sends), optionally dragging a node in circles;
  `listen` prints what the others' presence says they're dragging. A canvas resends its presence only every 10 seconds
  when nothing changes, so listen for longer than that.
- Test canvases: `benchmark-link.txt` (100 nodes: 50 services, 50 events, 50 message edges) and
  `benchmark-hotspots-link.txt` (the same with 10 hotspots). Open them in an isolated browser context (so they don't
  replace your own canvas in local storage), with `?bench=…` in the URL to find the tab.
- `VIEW_MINIFY=0 pnpm build:view` keeps component names in the bundle, so renders are attributed to components;
  measure final numbers on the normal (minified) build.

## Gotchas

- **Driving the page from DevTools:** keyboard shortcuts need real key presses (chrome-devtools `press_key`); a
  `KeyboardEvent` dispatched from a script doesn't switch tools. A click on the empty canvas needs the whole
  sequence (`pointerdown`, `mousedown`, `pointerup`, `mouseup`, `click` on `.react-flow__pane`).
- **Check which tab you're acting on** before every step (its URL and title): page ids change when the browser
  reconnects, and other tabs (people's own sessions) may be open on the same app.
- Background tabs don't draw frames (`measure.mjs` brings the tab to the front; a peer in a background tab is
  throttled to a timer a second, which is why `fake-peer.mjs` exists). Frame counts depend on the screen (60 or
  120 Hz), so compare per-frame numbers.
- The page saves to local storage on `pagehide`, so clearing it and reloading brings the canvas back.

## A team of 8 (11 October 2026, production build, 100 nodes, 3 seconds each)

Your tab and 7 others (`fake-team.mjs`): moving pointers, 0 renders, ~13 ms JS and ~230 ms main thread (cursor paint;
~50 ms alone). 3 dragging and everyone dropping a node every 4 seconds: ~32 renders a frame (~10 per person dragging),
~2 commits a frame, ~230 ms JS, ~600 ms main thread; your own drag meanwhile ~45 renders a frame. The relay server uses
1–3% CPU for it (each person sends ~20 messages a second and receives ~120, ~32 KB/s). In a session the canvas is
saved to local storage after every change (~2 a second in a busy session): its document is base64'd with the
browser's `toBase64` (0.004 ms for 46 KB; the hand-written loop it replaced took 0.9 ms and was ~14 ms of every 3
seconds of a busy session).

## Baselines (11 October 2026, production build, 100 nodes, 3 seconds each)

| Scenario | Before | After |
|---|---|---|
| Idle | 0 renders, 2 ms main thread | 0 renders, ~2 ms |
| Idle with 10 hotspots | ~200 ms main thread (10 pulsing glows) | ~1 ms, nothing animating |
| Mouse move | 0 renders | 0 renders |
| Pan | 2 renders a frame (background) | 2 a frame |
| Zoom (with hotspots) | | 3 a frame (background, zoom level) |
| Drag one node | ~177 renders a frame | ~20 a frame |
| Drag, with hotspots | ~40 a frame (every glowing node, every marker) | ~20 a frame |
| Drag on L2 | | ~12 a frame |
| A drop (after any earlier change) | ~1,550 renders (the page re-rendered every frame) | ~260 |
| Someone else moving their pointer | ~73 renders a frame, ~210 ms JS | 0 renders, ~5 ms JS |
| Someone else dragging a node (live, ~30 updates a second) | | ~9 renders a frame, ~110 ms JS (only that node and its edges) |
| The same, glided every frame (120 Hz, one text node) | | moves every frame; ~270 ms main thread, ~135 ms JS |
| Heap, 10 rounds of 5 drags | 37.5 → 40.7 MB, levels off by round 4 | |
| Opening (first node, warm cache) | ~335 ms, ~300–390 ms of long tasks | |

What's left in a drag frame is React Flow's own work for the dragged node and its edges. If a change brings back
renders of every node, presence re-rendering the page, or animations at idle, it's a regression.

## Product analytics (PostHog)

Studio on the web reports how it's used to EventCatalog's PostHog project (the editor's key and relay, in
`src/lib/posthog.ts`): `view/analytics.ts` in the page, `src/analytics.ts` on the MCP server. Every event has
`product: studio_web` and `environment` (`production` or `development`): dashboards filter on both.

- **Never what's on the canvas.** Events carry kinds, counts and buckets (`src/lib/stats.ts`: `sizeBucket`,
  `modelStats`) only: no names, ids, titles, text, code, file names or links. The page's address is sent without its
  query or fragment (`#m=` is the diagram, `#room=` a room's key). `tests/analytics.test.ts` checks a model's names
  and text never reach a report; add a case when adding properties.
- **A small sender, not posthog-js** (~4.5 KB gzipped against ~150): batched to `/batch/` every 5 s and on page hide
  (`text/plain`, so no preflight; `keepalive`). Chat hosts allow the relay's origin through the MCP App's
  `connectDomains` (`src/mcp/server.ts`).
- **Off** on localhost, with Global Privacy Control or Do Not Track, and with the menu's "Usage analytics" switch.
  To see events locally: `localStorage['eventcatalog-studio-analytics'] = 'debug'` in the page (logs them with
  `console.debug`, and sends them marked `development`), and `ANALYTICS=debug` for the server (logs `[analytics] …`).
  The page is cached for 5 minutes: reload without the cache after a rebuild.
- **Frequent things are counted, not sent**: `bump()` adds to the visit's `canvas_session_summary` (sent on page
  hide: duration, `edits`, `peak_people`, `count_*`); `track()` sends an event (and is counted too). Drags, node
  opens, undo and deletes are bumps; adding things, comments, hotspots, levels, sharing, exports and files are events.
- **Server**: `mcp_request` for every request (by method), and `mcp_client_connected` (client, capabilities, MCP
  Apps), `mcp_tool_called` (tool, the diagram's shape and mix, a walkthrough's scenes) and `mcp_view_loaded`. Read
  from the transport's parsed messages both ways (`noteMessage` in, `noteResponse` out: an error, or a tool's error
  result such as arguments that didn't validate, which never reach our handlers) and what the tools `report()`. Tool
  names outside our five are `unknown`. Refused requests: `mcp_rejected` (rate limit, size). Callers are a
  daily-salted hash of address and user agent; `$geoip_disable` (PostHog would locate the server, not them).
- **Diagram mix** (`modelMix` in `src/lib/stats.ts`): counts per resource type and relation kind (bucketed), the lists
  of types and kinds (`resource_types`, for "diagrams with channels" via `arrayJoin(splitByChar(','))` in SQL), container
  and schema kinds, and how complete it is (`with_summary`, `with_evidence`, `with_link`, `messages_with_schema`).
  Our vocabulary only: never names, ids, technologies or text.
- **Relay** (`src/rooms.ts`): `live_room_closed` (peak people, duration, messages and dropped messages, bucketed) under
  a random id per room, never the room's; `live_room_refused` (room full, too many rooms, another site).
- **Errors** (`app_error`): the error's name (`no_error_object` when the browser gives none), `error_source` (`studio`,
  `extension`, `other`) and, with no error object, `notice` (`resize_observer`, `script_error`): never the message.
  Scripted test clicks need `view: window` on the events (React Flow's drag reads `event.view.document`), or they throw
  and show up here.
- **Link sources**: links carry `s=agent|share|chat` in the fragment (`viewLink({ from })`), so `canvas_opened` can say
  whether people arrived from an agent, a shared link or a chat.
