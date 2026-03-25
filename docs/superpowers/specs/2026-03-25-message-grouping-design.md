# Message Grouping in Visualiser

**Issue**: [#2079](https://github.com/event-catalog/eventcatalog/issues/2079)
**Date**: 2026-03-25
**Status**: Approved

## Problem

Services with many messages (50+) produce bloated node graphs at both service and domain levels. Users need a way to logically group messages so the graph stays readable while still allowing drill-down.

## Solution

Add an optional `group` field to `sends`/`receives` pointers in service frontmatter. Messages sharing a group value collapse into a single `MessageGroupNode` in the visualiser. Clicking the group opens Focus Mode showing the full detail (individual messages, channels, routing).

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where groups are defined | Service frontmatter only (on `sends`/`receives` pointers) | Same event can belong to different groups per service |
| Click behavior | Opens Focus Mode | Keeps main graph clean, reuses existing infrastructure |
| Auto-grouping threshold | Not included (explicit only) | Simpler, predictable, no surprises. Can add later |
| Graph views affected | Service + Domain | Both called out as pain points in the issue |
| Visual style | Compact pill (like message nodes) | Reduces clutter — a container card would defeat the purpose |
| Domain frontmatter groups | Out of scope | Domains also use sendsPointer/receivesPointer; the schema change adds `group` there too, but domain-level grouping is silently ignored for this iteration |

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Same message in multiple groups | Each pointer is independent — message appears in both group nodes |
| Message both sent AND received, one/both grouped | Grouping operates on sends and receives independently. The `bothSentAndReceived` special edge is skipped for messages that are in a group; they appear only in their respective group nodes |
| Group with only one message | Still renders as a group node (user explicitly chose to group it) |
| Group name with special characters | Group name is sanitized/hashed in the node ID to avoid dagre/ReactFlow issues |

## 1. Schema Change

Add `group: z.string().optional()` to both `sendsPointer` and `receivesPointer` in `content.config.ts`.

```yaml
# Example service frontmatter
sends:
  - id: ProgramCreated
    version: 1.0.0
    group: Academic Structure
  - id: ProgramUpdated
    group: Academic Structure
  - id: StudentEnrolled
    group: Student Lifecycle
  - id: GradeRecorded  # no group — renders as individual node
```

Messages without a `group` continue to render as individual nodes. Zero breaking changes.

Note: Since `sendsPointer`/`receivesPointer` are shared schemas, the `group` field will also be available on domain frontmatter. For this iteration, domain-level `group` values are silently ignored (only service graph builders consume them).

**File**: `packages/core/eventcatalog/src/content.config.ts`

## 2. Shared Grouping Utility

Extract a `partitionMessagesByGroup` function into `packages/core/eventcatalog/src/utils/node-graphs/utils/utils.ts`:

```typescript
function partitionMessagesByGroup(
  rawPointers: (SendsPointer | ReceivesPointer)[],
  hydratedMessages: CollectionEntry<CollectionMessageTypes>[]
): {
  grouped: Map<string, { messages: CollectionEntry[], pointers: (SendsPointer | ReceivesPointer)[] }>,
  ungrouped: { messages: CollectionEntry[], pointers: (SendsPointer | ReceivesPointer)[] }
}
```

**Matching strategy**: Iterates raw pointers (not hydrated messages). For each pointer, checks the `group` field. Uses `findInMap` to resolve the hydrated message (handling `latest` → concrete version). Each pointer-message pair stays associated, so channel config (`to`/`from`) is preserved alongside its hydrated message.

Returns:
- `grouped`: Map keyed by group name, each value has paired pointers + hydrated messages
- `ungrouped`: pointers + messages with no group field

**File**: `packages/core/eventcatalog/src/utils/node-graphs/utils/utils.ts`

## 3. Service Node Graph Changes

In `services-node-graph.ts`, modify the `renderMessages` block:

1. Before the existing `receives.forEach` / `sends.forEach` loops, call `partitionMessagesByGroup` on both sends and receives
2. Filter `bothSentAndReceived` to exclude messages that appear in any group — grouped messages are handled solely by their group nodes
3. For each group, emit a single `messageGroup` typed node:
   ```typescript
   nodes.push({
     id: `message-group-${serviceId}-${serviceVersion}-${sanitize(groupName)}-${direction}`,
     type: 'messageGroup',
     data: {
       mode,
       groupName,
       direction,       // 'sends' | 'receives'
       messageCount,
       messageTypes,    // distinct collection types in group
       messages: [...], // hydrated messages + their channel pointers
       service: { id, version },
     },
   });
   ```
4. Create a single edge from service to group node (sends) or group node to service (receives), with label like "5 messages"
5. Pass only ungrouped messages through the existing `getNodesAndEdgesForProducedMessage` / `getNodesAndEdgesForConsumedMessage` paths

**File**: `packages/core/eventcatalog/src/utils/node-graphs/services-node-graph.ts`

## 4. Domain Node Graph Changes

The domain graph's `getNodesAndEdges` function delegates to the service graph builder (`getServicesNodeAndEdges`) for each service. Grouping behavior is **inherited automatically** from the service graph changes in Section 3 — no separate grouping implementation is needed in `domains-node-graph.ts`.

The domain context map function (`getNodesAndEdgesForDomainContextMap`) builds cross-domain edges but does not render individual message nodes, so grouping does not apply there.

**File**: `packages/core/eventcatalog/src/utils/node-graphs/domains-node-graph.ts` — may need minor changes to pass through the `group` field if not already available, but no independent grouping logic.

## 5. MessageGroupNode Component

New node component at `packages/visualiser/src/nodes/message-group/MessageGroupNode.tsx`.

**Why `messageGroup` not `group`**: The `group` key in `nodeTypes` is already taken by the domain `GroupNode` (`type: 'group'`). Using `messageGroup` avoids collision.

**Visual design**:
- Compact pill/card, similar dimensions to message nodes (~`min-w-48 max-w-60`)
- Violet accent color (e.g. `bg-violet-600 text-white` for badge, `border-violet-500` for card) — distinct from `data-products` which uses `bg-indigo-600`
- Top-left badge: "Message Group"
- Body: group name (bold), count badge (e.g. "5 messages"), small type breakdown icons (event/command/query icons with counts)
- Subtle "click to explore" affordance icon (e.g. expand/magnify icon)
- Left + right Handle components (hidden style, same as other nodes)
- `memo`-wrapped
- Not a navigable resource — `getNodeDocUrl` returns null for group nodes (intentional)

**Registration touchpoints** (all required):
- `packages/visualiser/src/nodes/message-group/index.ts` — export component + type
- `packages/visualiser/src/nodes/index.ts` — add to `nodeComponents` and re-exports. No `nodeConfig` entry needed (standard sizing). Only `messageGroup` key (no plural variant — this is a synthetic type, not a collection).
- `packages/visualiser/src/components/NodeGraph.tsx` — add to `nodeTypes` useMemo + `colorClasses`
- `packages/visualiser/src/components/FocusMode/utils.ts` — add to `NODE_COLOR_CLASSES` (`violet`), `NODE_TYPE_LABELS` (`Message Group`), `getNodeDisplayInfo()` with custom extraction:
  ```typescript
  if (nodeType === "messageGroup") {
    return {
      id: node.id,
      name: data?.groupName || node.id,
      type: "messageGroup",
      version: undefined,
      description: `${data?.messageCount || 0} messages (${data?.direction})`,
    };
  }
  ```
- `packages/visualiser/src/utils/export-mermaid.ts` — add to `NODE_SHAPE_MAP` + `NODE_STYLE_CLASSES` + add `getNodeLabel` branch for `messageGroup` returning `"groupName (N messages)"`. Exports as a single mermaid node.
- `packages/visualiser/src/components/VisualiserSearch.tsx` — add `"bg-violet-600 text-white"` color mapping + add `getNodeDisplayName` branch returning `data?.groupName`

**File**: `packages/visualiser/src/nodes/message-group/MessageGroupNode.tsx`

## 6. Focus Mode Integration

**How Focus Mode works today**: It takes the full existing graph (all nodes and edges already in the parent `NodeGraph`) and a `centerNodeId`, then uses `getConnectedNodes()` to find neighbors within the already-computed graph. It does NOT compute new nodes at runtime.

**Problem**: When messages are collapsed into a group node, the individual message nodes and their channel edges do not exist in the graph. Focus Mode cannot show them because they were never computed.

**Solution**: Compute the individual nodes at graph-build time but keep them hidden. When a `MessageGroupNode` is clicked:

1. The group node's `data.messages` contains hydrated messages + channel pointers
2. The click handler computes the expanded sub-graph by calling `getNodesAndEdgesForProducedMessage` / `getNodesAndEdgesForConsumedMessage` for each message in the group (these are the same functions used for ungrouped messages)
3. The computed nodes and edges are injected into Focus Mode's state alongside the service node
4. Focus Mode opens with the group's service node as center, showing the full expanded view: service → channels → individual messages → consumer/producer services

**This requires a custom Focus Mode entry point** for group nodes — a helper function that:
- Takes the group node data
- Builds the sub-graph from the stored message + channel data
- Opens Focus Mode with these injected nodes/edges

This is new infrastructure, but it's a thin wrapper around existing `getNodesAndEdgesFor*` functions. The bulk of the logic is already written.

**Data stored on `MessageGroupNode`**:
```typescript
data: {
  groupName: string,
  direction: 'sends' | 'receives',
  messageCount: number,
  messageTypes: string[],
  messages: Array<{
    message: CollectionEntry,
    channels: ChannelPointer[],  // to/from config from raw pointer
  }>,
  service: { id, version },
}
```

**File**: New helper in `packages/visualiser/src/components/FocusMode/` + click handler in `MessageGroupNode`

## 7. Testing

**Unit tests**:
- Schema: `group` field accepted as optional string, omitting it works
- `partitionMessagesByGroup`: mixed grouped/ungrouped, multiple groups, single group, all ungrouped (identity), same message in multiple groups, pointer with `latest` version
- `services-node-graph.ts`: grouped messages produce single `messageGroup` node with correct data; ungrouped messages produce individual nodes as before; `bothSentAndReceived` correctly excludes grouped messages
- Domain graph: verify grouping behavior inherited from service graph

**Test locations**:
- `packages/core/eventcatalog/src/utils/__tests__/services/` — service graph tests
- `packages/core/eventcatalog/src/utils/node-graphs/utils/__tests__/` — partition utility tests
- New mock data in `mocks.ts` with services that have grouped sends/receives

**Not tested** (out of scope):
- MessageGroupNode React component in isolation (visual)
- Focus Mode sub-graph injection (integration — verified manually)

## Files Changed

| File | Change |
|------|--------|
| `packages/core/eventcatalog/src/content.config.ts` | Add `group` to sendsPointer + receivesPointer |
| `packages/core/eventcatalog/src/utils/node-graphs/utils/utils.ts` | Add `partitionMessagesByGroup` |
| `packages/core/eventcatalog/src/utils/node-graphs/services-node-graph.ts` | Use partition, emit group nodes, filter bothSentAndReceived |
| `packages/core/eventcatalog/src/utils/node-graphs/domains-node-graph.ts` | Minor pass-through changes if needed |
| `packages/visualiser/src/nodes/message-group/MessageGroupNode.tsx` | New component |
| `packages/visualiser/src/nodes/message-group/index.ts` | New barrel export |
| `packages/visualiser/src/nodes/index.ts` | Register new node in nodeComponents |
| `packages/visualiser/src/components/NodeGraph.tsx` | Register nodeType + colorClass |
| `packages/visualiser/src/components/FocusMode/utils.ts` | Add group node config |
| `packages/visualiser/src/components/FocusMode/` | New helper for group expansion sub-graph |
| `packages/visualiser/src/utils/export-mermaid.ts` | Add group to mermaid export (single node) |
| `packages/visualiser/src/components/VisualiserSearch.tsx` | Add indigo color mapping |
| Test files (new + modified mocks) | Schema, partition, graph output, bothSentAndReceived tests |
