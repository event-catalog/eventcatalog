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

Profile with 100 nodes and 50 message edges (seeded with a Yjs client), on a canvas with nothing else open.
Run each scenario twice: once counting renders (a fake `__REACT_DEVTOOLS_GLOBAL_HOOK__` whose
`onCommitFiberRoot` walks the fiber tree), once with the CDP Profiler (`Profiler.start` / `stop`, 200µs
sampling) for CPU. Also count WebSocket frames sent and received (`Network.webSocketFrameSent` / `Received`).

Scenarios, about 3 seconds each: idle, mouse move over the canvas, drag one node, pan, a remote peer moving
their pointer, a remote peer dragging a node (through presence, like the canvas does), and mouse move with the
Catalog tab open.

**Compare JS time and commit counts, not frame rates.** JS time is the profile's busy time minus `(program)`.
Headless Chromium's frame timing is unreliable (a rAF recorder forces frames; runs vary between 9ms and 25ms p95
for the same code), and a headed window's frame rate depends on the screen it lands on (60 or 120Hz). Run noisy
scenarios several times, alternating old and new code, before calling a regression.

## Baselines

100 nodes, 50 message edges, about 3 seconds per scenario (JS time on the main thread, React commits):

| Scenario | JS time | Commits | Notes |
|----------|---------|---------|-------|
| Idle | ~10–16 ms | 0 | No animating edges unless something is selected |
| Mouse move | ~60 ms | 0 | Presence only |
| Drag one node | ~420–670 ms (noisy) | ~250–340 | Dominated by React Flow's own drag work |
| Pan | ~180–190 ms | ~120–170 | Only the background re-renders |
| Remote pointer | ~50 ms | 3 | Pointers move outside React |
| Remote drag | ~200–245 ms | ~240 | Through presence, saved on drop |
| Catalog tab + mouse move | ~75–105 ms | 2 | |

Where these came from (before the current design): mouse move 495 ms with 80 commits and 8,000 node renders;
remote drag 1,878 ms; remote pointer 710 ms with 114 commits; idle with 50 animated edges 1,737 ms per 4 seconds.
If a change brings any of those patterns back (renders of every node on pointer moves, every edge animating,
presence re-rendering the canvas), it's a regression.

The document stays small with presence-based drags: about 31 KB for 100 nodes and 50 edges after the profile.
