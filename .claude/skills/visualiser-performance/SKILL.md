---
name: visualiser-performance
description: React Flow performance rules and review checklist for the @eventcatalog/visualiser package. Automatically applies when making changes to any file under packages/visualiser/. Use this skill to audit, review, or implement visualiser code with performance in mind.
globs:
  - packages/visualiser/**/*.tsx
  - packages/visualiser/**/*.ts
---

# Visualiser Performance Rules

Studio (the editable canvas, `features/studio` in core) renders the visualiser's nodes and edges and must look the
same: when you change how the visualiser draws or derives anything, follow the `visualiser-studio-parity` skill too.

When modifying any code in `packages/visualiser/`, follow these rules to avoid React Flow performance regressions. A single unoptimized line can cause all nodes to re-render on every drag tick, dropping FPS from 60 to 2.

Two kinds of cost matter, and they need different checks: **renders** (React work, Rules 1–5 and 7–9) and
**animations** (style, layout and paint on every frame, Rule 6), which no render count shows. Animations were the
bigger cost when this was last measured: on a 32-node domain, constant CSS and SMIL animations took about half the
main thread while nothing was happening. Measure both, as Studio's
[verification guide](../studio/references/verification.md) describes.

## Rule 1: Never pass unstable references to `<ReactFlow>` props

All props on `<ReactFlow>` must be referentially stable:

- **Objects/arrays**: Define outside the component or wrap in `useMemo` with stable deps
- **Functions**: Wrap in `useCallback` with stable deps
- **NEVER** pass anonymous functions (`onClick={() => {}}`) or inline objects directly

```tsx
// BAD - anonymous function causes ALL nodes to re-render on every state change
<ReactFlow onNodeClick={() => {}} />

// GOOD
const handleNodeClick = useCallback(() => {}, []);
<ReactFlow onNodeClick={handleNodeClick} />
```

`nodeTypes` and `edgeTypes` must be memoized with `useMemo(() => ..., [])` or defined outside the component. These are currently correct in `NodeGraph.tsx`.

## Rule 2: Never depend on `nodes`/`edges` arrays for structural data

The `nodes` and `edges` arrays from `useNodesState`/`useEdgesState` get new references on every position change (drag). If you put them in a `useMemo`/`useEffect` dependency array, that code runs on every drag tick.

**Pattern: Use stable structural keys**

When you only care about which nodes exist (not their positions), derive a stable key using `useRef`:

```tsx
// Stable key - only changes when nodes are added/removed
const nodeIdsKeyRef = useRef("");
const computedKey = nodes.map((n) => n.id).join(",");
if (computedKey !== nodeIdsKeyRef.current) {
  nodeIdsKeyRef.current = computedKey;
}
const nodeIdsKey = nodeIdsKeyRef.current;

// Now use nodeIdsKey instead of nodes in deps
const searchNodes = useMemo(() => nodes, [nodeIdsKey]);
```

For edges, include source/target in the key:
```tsx
const edgeKey = edges.map((e) => `${e.source}-${e.target}`).join(",");
```

**Never do this:**
```tsx
// BAD - runs on every drag tick
useEffect(() => { /* expensive work */ }, [nodes, edges]);

// BAD - filter runs on every position change
const selected = useMemo(() => nodes.filter(n => n.selected), [nodes]);
```

Building a key is itself O(n) on every render (every drag frame). Build each key once, reuse it (Studio's legend
reuses `structure` instead of building another), and only build it where it's needed. When per-frame state wraps
something stable, depend on the stable part (e.g. `levelShown.edges`, which keeps its identity while the level's
nodes are dragged), not on the wrapper.

## Rule 3: Always wrap custom nodes and edges in `memo()`

Every custom node and edge component MUST be wrapped in `React.memo`. This is the single most impactful optimization — it prevents node content from re-rendering during drag even if parent state changes.

```tsx
// GOOD
export default memo(function MyNode(props: NodeProps) {
  return <div>...</div>;
});
```

All current node components (`ServiceNode`, `EventNode`, `CommandNode`, `QueryNode`, `ChannelNode`, `DataNode`, `ViewNode`, `ActorNode`, `NoteNode`, `ExternalSystem`, `Custom`, `Entity`, `Step`, `Domain`, `Flow`, `DataProduct`, `User`) are correctly wrapped.

All edge components (`AnimatedMessageEdge`, `MultilineEdgeLabel`, `FlowEdge`, and `LabelledEdge`'s
`LabelledDefaultEdge` / `LabelledSmoothStepEdge` / `LabelledStepEdge`, which draw every message edge when messages
aren't simulated) are correctly wrapped. React Flow's own `EdgeWrapper` re-renders an edge whenever its edge object
(or its `data`) is a new object, so memo only helps if edge objects keep their identity (Rule 7).

**Do not break this pattern when adding new node or edge types.**

On top of that, every type registered in `nodeTypes` in `NodeGraph.tsx` is wrapped by `memoNode` (`src/utils/node-memo.ts`). It ignores `positionAbsoluteX`/`positionAbsoluteY`, which change on every frame of a layout animation (e.g. switching levels), so nodes don't re-render while they move. This means:

- Register new node types inside that `nodeTypes` map so they get `memoNode` too.
- A node must not render from `positionAbsoluteX`/`positionAbsoluteY`: it would show a stale position. React Flow already places nodes with its wrapper's transform; read React Flow's internals (`useInternalNode`) if a node really needs its position.
- **Anything else that registers these nodes needs `memoNode` too.** Studio's `nodeTypes`
  (`features/studio/components/canvas-nodes.tsx`) wraps every type with it (exported from the package). A plain
  `memo` isn't enough: the dragged node, and every node inside a dragged container, re-renders on every frame.

## Rule 3b: Keep `measured` when replacing nodes

React Flow keeps a node's measured size only when the node passed to `setNodes` has `measured`. Building nodes from scratch (e.g. from a layout) drops it, so every node is measured and rendered again. When setting nodes repeatedly (animations), carry `measured` over from the current nodes, as `animateLayout` does.

## Rule 4: Memoize heavy sub-components inside nodes

If a node renders complex sub-components (data grids, forms, SVG animations), wrap those in `memo()` too. This prevents the inner content from re-rendering even when the node itself re-renders.

```tsx
// Sub-components with static or rarely-changing props should be memoized
const GlowHandle = memo(function GlowHandle({ side }: { side: "left" | "right" }) {
  return <div style={{...}} />;
});
```

Currently memoized sub-components: `GlowHandle` (in ServiceNode, EventNode, CommandNode, QueryNode) and `MiniEnvelope`.

## Rule 5: Avoid `useStore` selectors that return new references

If using ReactFlow's `useStore` (or any Zustand store), never return arrays/objects that get recreated on every state change:

```tsx
// BAD - new array reference on every state update
const selected = useStore(state => state.nodes.filter(n => n.selected));

// GOOD - extract primitive values, or use useShallow
const selectedIds = useStore(
  state => state.nodes.filter(n => n.selected).map(n => n.id)
);
// With useShallow for object/array returns
import { useShallow } from 'zustand/react/shallow';
const [a, b] = useStore(useShallow(state => [state.a, state.b]));
```

`useViewport()` and `useNodes()` / `useEdges()` re-render their component on every pan, zoom or drag frame. In
anything rendered per node (toolbars, overlays), select just the primitive you need, e.g. the clamped zoom in
`FocusModeNodeActions` (`useStore(selectScaleFactor)`), so panning doesn't re-render them.

## Rule 6: Nothing animates forever unless it's being looked at

A running CSS or SMIL animation costs a style recalc and paint on **every frame**, whether or not anything else
happens, and the cost multiplies with every node or edge that has it. Chrome did **not** composite the handle glow
(a `transform` + `opacity` pulse on a pseudo-element), even with `will-change`, so don't assume "transform and
opacity only" makes an animation free. Measure it.

- **Per-node or per-edge animations only run where someone is looking**: hovered, selected, or part of a feature
  that was turned on. The handle glow pulses on `.react-flow__node:hover` / `.selected` only (`styles-core.css`).
- **Hidden doesn't mean stopped.** An element hidden with `opacity: 0`, `visibility: hidden` or moved off screen
  keeps animating. Pause it (`animation-play-state: paused`) until it's shown, as `NavigationProgress.astro` and
  the closed chat panel (`.ec-chat-surface[aria-hidden='true']`) do. These run on every page of the catalog.
- **SMIL can't be paused with CSS.** `visibility: hidden` doesn't stop `animateMotion`. Pause each edge's SVG
  timeline with `pauseEdgeAnimations(canvas, paused)` (`utils/edge-animations.ts`; each edge is its own `<svg>`).
  NodeGraph and Studio call it when panning, zooming or dragging starts and ends (`.ec-interaction-active`).
- **`edge.animated = true` brings React Flow's `dashdraw` animation onto every `<path>` in the edge**, including
  custom SVG inside it (the envelopes' flaps were dashed and repainted until `.ec-animated-msg path` opted out).
  Only set it for edges that should march, and opt any decoration paths out.
- **Large graphs don't simulate messages unless asked** (`shouldAnimateMessages`, `LARGE_GRAPH_NODE_THRESHOLD`): a
  choice saved on a small graph must not turn it on for every large one. Keep per-graph safeguards above
  saved preferences.
- Infinite hover effects (the edge "electricity" on `.ec-node-hover-edge`, with a `filter`) apply to every edge of
  the hovered node: keep them to hover, and avoid `filter` and `stroke-dashoffset` animations on sets of elements.

Find what's running with `document.getAnimations()` (CSS) and `document.querySelectorAll('animateMotion')`
(SMIL), with nothing hovered or selected. On an idle diagram that doesn't simulate messages, both should be empty.

## Rule 7: Keep objects the same when nothing changed

React Flow re-renders a node or edge (and rebuilds its internals) whenever its object is new. Code that maps over
all nodes or edges must return **the same object** for items that don't change, and **the same array** when none
did (`mapChanged`, `unpickedNode`, `unpickedEdge` in `NodeGraph.tsx`). For example, clicking the canvas used to
rebuild every node and edge with `opacity: 1` even when nothing was dimmed. Never mutate a node's or edge's
`style` in place either: React Flow holds those objects.

The same goes for empty defaults passed down: `?? []` in render is a new array every time, which reruns effects
that depend on it (NodeGraph's `NO_NODES` / `NO_EDGES`).

## Rule 8: Decide initial state before the first render, and prepare every edge

- State that changes what's drawn (e.g. whether messages animate) is decided in a lazy `useState(() => ...)`, not
  corrected by an effect after mount: an edge whose `type` changes is unmounted and mounted again, so every edge
  would mount twice.
- **Every edge set with `setEdges` goes through `prepareEdges`** (`applyMessageAnimation`): the graph's edges at
  first, edges from new props, and edges added when nodes are shown or message groups are expanded. Edges that
  skip it animate even with Simulate messages off.

## Rule 9: One subscription for everyone, not one per node

Hooks inside node components run once per node. Subscriptions there (observers, `useOnSelectionChange`, store
listeners) multiply with the graph. Share one (`useDarkMode` keeps a single `MutationObserver` for every node),
and have per-node handlers bail out when nothing changed for them (Domain keeps its highlighted set when it's the
same, rather than setting a new `Set`).

## Checklist for PR review

When reviewing visualiser changes, verify:

- [ ] No anonymous functions or inline objects passed to `<ReactFlow>` props
- [ ] No `useMemo`/`useEffect`/`useCallback` with `nodes` or `edges` in deps (use structural keys instead)
- [ ] New custom nodes/edges are wrapped in `memo()`, and new node types are registered in `nodeTypes` (so `memoNode` wraps them)
- [ ] No node renders from `positionAbsoluteX`/`positionAbsoluteY`
- [ ] Code that sets nodes repeatedly keeps their `measured` size
- [ ] Heavy sub-components inside nodes are wrapped in `memo()`
- [ ] No `useStore` selectors returning unstable references, and no `useViewport` in per-node components
- [ ] `nodeTypes`/`edgeTypes` remain memoized with empty deps
- [ ] No infinite CSS/SMIL animation runs on every node or edge, or on hidden elements (`document.getAnimations()`
      is empty on an idle diagram); SMIL is paused with `pauseEdgeAnimations` while the canvas moves
- [ ] Maps over nodes/edges keep unchanged objects (and return the same array when nothing changed); no in-place
      mutation of `style`
- [ ] Every `setEdges` goes through `prepareEdges`; initial state is decided before the first render
- [ ] No per-node subscriptions that could be one shared subscription

## Key files

| File | What to check |
|------|--------------|
| `src/components/NodeGraph.tsx` | ReactFlow props, structural keys, legend computation |
| `src/components/StepWalkthrough.tsx` | Effect dependencies use stable keys |
| `src/components/VisualiserSearch.tsx` | Search filtering uses stable node snapshot |
| `src/components/FocusMode/FocusModeContent.tsx` | Focus graph calculation deps |
| `src/utils/message-animation.ts`, `src/utils/edge-animations.ts` | When messages animate, and pausing them |
| `src/styles-core.css`, `src/styles.css` | Infinite animations (glow, dashes, hover effects): keep both files in step |
| `src/nodes/*/` | All node components wrapped in memo() |
| `src/edges/*/` | All edge components wrapped in memo() |

## Reference

Based on: "The Ultimate Guide to Optimize React Flow Project Performance" by Lukasz Jazwa. Key benchmarks from that article (100 nodes):
- Anonymous function on ReactFlow prop: 60 FPS -> 10 FPS (default), 2 FPS (heavy)
- Node depending on full nodes array via useStore: 60 FPS -> 12 FPS
- Adding React.memo to nodes: recovers to 50-60 FPS even with non-optimal parent
- Memoizing heavy node content: recovers to 60 FPS stable
