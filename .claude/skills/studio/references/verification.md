# Verifying Studio changes

Unit tests cover the pure logic (document helpers, placement, levels, presence sender and store, choreography).
Sync, presence, rendering and interaction need a real browser, and performance needs a profile. This is how
Studio's changes so far were checked, and the numbers to compare against.

## Two people (and an agent) on one canvas

Use Playwright (`playwright-core`) with two browser contexts on the dev server, plus a plain Yjs client as a
watcher. Set each page's name before it loads so it skips the join form:
`localStorage.setItem('eventcatalog-studio-name', 'Alice')`.

The watcher connects like the canvas does and counts document updates:

```js
const provider = new HocuspocusProvider({
  url: 'ws://localhost:3000/_eventcatalog/studio',
  name: `design:${canvasId}`,
  document: doc,
});
doc.on('update', () => updates++);
```

Read where a node is shown from its React Flow transform
(`.react-flow__node[data-id="…"]`, `style.transform` `translate(x, y)`), and where it's saved from the watcher's
`nodes` map. Seed canvases through the MCP endpoint (`POST /docs/mcp`, `tools/call` with `createCanvas`,
`addToCanvas`, …) or by writing nodes with a Yjs client.

Checks worth keeping:

| Scenario | Expect |
|----------|--------|
| Alice drags a node slowly | No document updates while dragging; Bob sees it move mid-drag |
| Alice drops it | One document update; Alice and Bob show the saved position |
| Alice presses mod+Z | The whole drag is undone, for both |
| Alice moves her mouse | Bob sees her pointer with her name |
| Alice hides her tab (`visibilityState` hidden + `visibilitychange`) | Her pointer goes from Bob's canvas |
| An agent moves a node (`updateCanvasNode` with x/y, called without blocking) | Bob sees it carried while the document still has the old position; one update when it lands |
| Box select on empty canvas, and inside a container | Selects what's fully inside, not the container |
| Container dragged by its header | It moves and is selected |
| Scroll, cmd + scroll, space + drag | Pan, zoom, pan |

Gotchas: Playwright's `has-text` is case-insensitive (`"A"` matches "Domain"); an `execFileSync` call blocks the
event loop, so sample "during" an agent's move from an async call; pick click targets with
`document.elementFromPoint` to be sure they're on the empty canvas; React Flow's drag threshold eats the first
mouse step, so allow a few pixels.

## Profiling

Profile with 100 nodes and 50 message edges, on a canvas with nothing else open. Seed one through the Studio API
from a signed-in tab (`POST /api/studio/canvases` with `nodes` and `edges`, e.g. 50 services and 50 events in a
grid, each service connected to its event). For the visualiser, use a domain at L3 with message edges (the default
catalog's `/visualiser/domains/ordering/1.0.0?level=3`, 32 nodes and 31 message edges).

Measure two different costs; a change can be fine on one and terrible on the other:

- **Renders and JS** (React commits, components rendered, the page's own JS time), per scenario.
- **Everything else on the main thread** (style recalc, layout, paint), which animations cause and no render count
  shows. On the last check this was the bigger cost: constant CSS and SMIL animations took about a third of the
  main thread on an idle diagram, and about half with messages simulated.

### Tools ([measure/](measure/))

- [`page-counters.js`](measure/page-counters.js) goes in the page before it loads. It counts React commits and
  renders with a stand-in DevTools hook, which skips subtrees React didn't clone, as DevTools does (otherwise
  bailed-out subtrees count again with stale flags). It times the page's own callbacks (scheduler tasks,
  microtasks, frames, timers, events), and adds `__scenarios.idle/mouse/pan/drag` (about 3 seconds each).
- [`measure.mjs`](measure/measure.mjs) attaches to **one tab** over CDP and runs them, with that tab's main-thread
  breakdown from `Performance.getMetrics`:
  - `node measure.mjs scenarios <tab>`: renders, JS and main-thread time per scenario.
  - `node measure.mjs idle <tab>`: 3 seconds of doing nothing, and every animation still running
    (`document.getAnimations()`, plus SMIL elements).
  - `node measure.mjs heap <tab> [rounds]`: the heap after garbage collection across rounds of dragging and panning.
    It should level off; steady growth is a leak.

**A/B in the same session.** Machine load changes the numbers from one run to the next. Compare by simulating the
old behaviour in the page (inject the old CSS, stub `SVGSVGElement.prototype.pauseAnimations`, play paused
animations again), alternating runs, rather than against numbers from another day. To find which animation costs,
pause them one group at a time (`document.getAnimations().filter(...).forEach((a) => a.pause())`) and measure idle.

### Gotchas

- **Use the browser people use, but trace one tab only.** Chrome's performance traces cover the whole browser:
  with a working browser open, a 3 second trace was over 500 MB and took the DevTools MCP server down. It also
  records other tabs. Use `measure.mjs` (one tab's metrics) instead, and only trace if you need a flame chart.
- **Background tabs don't draw frames**, so `requestAnimationFrame` scenarios stall and paint costs disappear.
  `measure.mjs` brings the tab to the front.
- **Dragging near the canvas's edge auto-pans** (React Flow, within 40px). That's a second update every frame, and
  it moves the canvas until nodes are off screen. The drag scenario uses the node nearest the middle; a drag that
  shows about 3 commits a frame is probably auto-panning.
- **The dev server serves a pre-bundled copy of the visualiser's `dist`.** Vite's cache key doesn't include it,
  touching the Astro config doesn't restart the dev server (the `--config` path is relative), and the browser
  caches the bundle for good (`?v=`). After changing `packages/visualiser`: build it, stop the dev server, delete
  `examples/default/.astro/eventcatalog/vite/deps`, start it again, and reload ignoring the cache. Otherwise
  Studio fails to hydrate on a new export (`does not provide an export named ...`) or you measure the old code.
- **chrome-devtools `navigate_page`'s `initScript` only applies to the next navigation**: pass it on every reload.
- Headless Chromium's frame timing is unreliable, and a headed window's frame rate depends on its screen (60 or
  120Hz). Compare **per-frame** numbers (renders per frame, JS per frame) or totals over the same number of frames,
  not frame rates.

## Baselines

The default catalog in the dev server (development React, so absolute JS times run high), measured on 9 October
2026. Times are per 3 seconds.

**Studio** (100 nodes, 50 message edges, nothing selected unless dragging):

| Scenario | Renders | Main thread | Notes |
|----------|---------|-------------|-------|
| Idle | 0 | ~75 ms | No CSS animation running (`measure.mjs idle`); was ~870 ms with 100 handle glows pulsing |
| Mouse move | 0 commits | ~150 ms | Presence only |
| Pan | Background only (1 commit per frame) | ~500 ms | |
| Drag one node | ~20 renders per frame | ~1,000 ms at 60Hz | `Canvas`, React Flow's wrappers, the dragged node's wrapper and its edges; never the node's content (`memoNode`). Was ~25 renders per frame |
| Heap over 4 rounds of drags, level switches and pans | | 58.2 → 58.4 MB | Levels off; DOM unchanged |

Not measured again on 9 October (JS time only, from the previous baselines): a remote peer moving their pointer
~50 ms with 3 commits; a remote peer dragging a node ~200–245 ms with ~240 commits; the Catalog tab open with the
mouse moving ~75–105 ms with 2 commits.

**Visualiser** (Ordering domain at L3, 32 nodes, 31 message edges):

| Scenario | Main thread | Notes |
|----------|-------------|-------|
| Idle, default (no simulated messages: over 30 nodes) | ~2 ms | Nothing animating |
| Idle, `?animate=true` | ~1,100–1,300 ms | Envelopes (SMIL) and dashes; was ~1,750 ms with flaps dashed and glows pulsing |
| Pan, `?animate=true` | layout ~19 ms | Animations paused while it moves; was ~115 ms |

Where these came from (before the current design): mouse move 495 ms with 80 commits and 8,000 node renders;
remote drag 1,878 ms; remote pointer 710 ms with 114 commits; idle with 50 animated edges 1,737 ms per 4 seconds;
an idle diagram spending ~1,100 ms per 3 seconds on 35 always-running CSS animations (handle glows, and a hidden
loading bar and chat avatar on every page). If a change brings any of those patterns back (renders of every node on
pointer moves, every edge animating, presence re-rendering the canvas, animations running at idle), it's a
regression.

The document stays small with presence-based drags: about 31 KB for 100 nodes and 50 edges after the profile.
