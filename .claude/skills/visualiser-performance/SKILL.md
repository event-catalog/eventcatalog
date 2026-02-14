---
name: visualiser-performance
description: React Flow performance rules and review checklist for the @eventcatalog/visualiser package. Automatically applies when making changes to any file under packages/visualiser/. Use this skill to audit, review, or implement visualiser code with performance in mind.
globs:
  - packages/visualiser/**/*.tsx
  - packages/visualiser/**/*.ts
---

# Visualiser Performance Rules

When modifying any code in `packages/visualiser/`, follow these rules to avoid React Flow performance regressions. A single unoptimized line can cause all nodes to re-render on every drag tick, dropping FPS from 60 to 2.

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

## Rule 3: Always wrap custom nodes and edges in `memo()`

Every custom node and edge component MUST be wrapped in `React.memo`. This is the single most impactful optimization — it prevents node content from re-rendering during drag even if parent state changes.

```tsx
// GOOD
export default memo(function MyNode(props: NodeProps) {
  return <div>...</div>;
});
```

All current node components (`ServiceNode`, `EventNode`, `CommandNode`, `QueryNode`, `ChannelNode`, `DataNode`, `ViewNode`, `ActorNode`, `NoteNode`, `ExternalSystem`, `Custom`, `Entity`, `Step`, `Domain`, `Flow`, `DataProduct`, `User`) are correctly wrapped.

All edge components (`AnimatedMessageEdge`, `MultilineEdgeLabel`, `FlowEdge`) are correctly wrapped.

**Do not break this pattern when adding new node or edge types.**

## Rule 4: Memoize heavy sub-components inside nodes

If a node renders complex sub-components (data grids, forms, SVG animations), wrap those in `memo()` too. This prevents the inner content from re-rendering even when the node itself re-renders.

```tsx
// Sub-components with static or rarely-changing props should be memoized
const GlowHandle = memo(function GlowHandle({ side }: { side: "left" | "right" }) {
  return <div style={{...}} />;
});
```

Currently memoized sub-components: `GlowHandle` (in ServiceNode, EventNode, CommandNode, QueryNode), `MiniEnvelope`, `ServiceMessageFlow` (in ServiceNode).

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

## Checklist for PR review

When reviewing visualiser changes, verify:

- [ ] No anonymous functions or inline objects passed to `<ReactFlow>` props
- [ ] No `useMemo`/`useEffect`/`useCallback` with `nodes` or `edges` in deps (use structural keys instead)
- [ ] New custom nodes/edges are wrapped in `memo()`
- [ ] Heavy sub-components inside nodes are wrapped in `memo()`
- [ ] No `useStore` selectors returning unstable references
- [ ] `nodeTypes`/`edgeTypes` remain memoized with empty deps

## Key files

| File | What to check |
|------|--------------|
| `src/components/NodeGraph.tsx` | ReactFlow props, structural keys, legend computation |
| `src/components/StepWalkthrough.tsx` | Effect dependencies use stable keys |
| `src/components/VisualiserSearch.tsx` | Search filtering uses stable node snapshot |
| `src/components/FocusMode/FocusModeContent.tsx` | Focus graph calculation deps |
| `src/nodes/*/` | All node components wrapped in memo() |
| `src/edges/*/` | All edge components wrapped in memo() |

## Reference

Based on: "The Ultimate Guide to Optimize React Flow Project Performance" by Lukasz Jazwa. Key benchmarks from that article (100 nodes):
- Anonymous function on ReactFlow prop: 60 FPS -> 10 FPS (default), 2 FPS (heavy)
- Node depending on full nodes array via useStore: 60 FPS -> 12 FPS
- Adding React.memo to nodes: recovers to 50-60 FPS even with non-optimal parent
- Memoizing heavy node content: recovers to 60 FPS stable
