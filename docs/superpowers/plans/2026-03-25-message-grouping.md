# Message Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse grouped messages into a single `MessageGroupNode` in the visualiser, with Focus Mode drill-down for full detail.

**Architecture:** Add `group` field to `sendsPointer`/`receivesPointer` schemas. A shared `partitionMessagesByGroup` utility splits messages into grouped/ungrouped before the node graph builders render them. Grouped messages emit a `MessageGroupNode` instead of individual message nodes. Clicking the group opens Focus Mode with a computed sub-graph.

**Tech Stack:** Astro Content Collections (Zod schemas), React + ReactFlow (visualiser), Vitest (tests), dagre (layout)

**Spec:** `docs/superpowers/specs/2026-03-25-message-grouping-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `packages/core/eventcatalog/src/content.config.ts` | Modify | Add `group` to sendsPointer + receivesPointer |
| `packages/core/eventcatalog/src/utils/node-graphs/utils/utils.ts` | Modify | Add `partitionMessagesByGroup` utility |
| `packages/core/eventcatalog/src/utils/node-graphs/services-node-graph.ts` | Modify | Use partition, emit group nodes, filter bothSentAndReceived |
| `packages/visualiser/src/nodes/message-group/MessageGroupNode.tsx` | Create | New MessageGroupNode component |
| `packages/visualiser/src/nodes/message-group/index.ts` | Create | Barrel export |
| `packages/visualiser/src/nodes/index.ts` | Modify | Register in nodeComponents |
| `packages/visualiser/src/components/NodeGraph.tsx` | Modify | Register in nodeTypes + colorClasses |
| `packages/visualiser/src/components/FocusMode/utils.ts` | Modify | Add color, label, displayInfo, docUrl handling |
| `packages/visualiser/src/utils/export-mermaid.ts` | Modify | Add shape, style, label handling |
| `packages/visualiser/src/components/VisualiserSearch.tsx` | Modify | Add color + displayName handling |
| `packages/core/eventcatalog/src/utils/__tests__/services/mocks.ts` | Modify | Add mock services with grouped messages |
| `packages/core/eventcatalog/src/utils/__tests__/services/node-graph.spec.ts` | Modify | Add grouping tests |
| `packages/core/eventcatalog/src/utils/node-graphs/utils/__tests__/partition.test.ts` | Create | Tests for partitionMessagesByGroup |

---

## Task 1: Schema — Add `group` field to sendsPointer and receivesPointer

**Files:**
- Modify: `packages/core/eventcatalog/src/content.config.ts:67-93`

- [ ] **Step 1: Add `group` to `sendsPointer`**

In `packages/core/eventcatalog/src/content.config.ts`, add `group: z.string().optional()` to the `sendsPointer` z.object (after the `to` field, around line 79):

```typescript
const sendsPointer = z.object({
  id: z.string(),
  version: z.string().optional().default('latest'),
  fields: z.array(z.string()).optional(),
  group: z.string().optional(),
  to: z
    .array(
      z.object({
        ...channelPointer.shape,
        delivery_mode: z.enum(['push', 'pull', 'push-pull']).optional().default('push'),
      })
    )
    .optional(),
});
```

- [ ] **Step 2: Add `group` to `receivesPointer`**

Same file, add `group: z.string().optional()` to the `receivesPointer` z.object (after the `fields` field, around line 84):

```typescript
const receivesPointer = z.object({
  id: z.string(),
  version: z.string().optional().default('latest'),
  fields: z.array(z.string()).optional(),
  group: z.string().optional(),
  from: z
    .array(
      z.object({
        ...channelPointer.shape,
        delivery_mode: z.enum(['push', 'pull', 'push-pull']).optional().default('push'),
      })
    )
    .optional(),
});
```

- [ ] **Step 3: Verify no build errors**

Run: `pnpm run build --filter @eventcatalog/core 2>&1 | tail -20`

Expected: Build succeeds. The `group` field is optional so existing catalogs are unaffected.

- [ ] **Step 4: Commit**

```bash
git add packages/core/eventcatalog/src/content.config.ts
git commit -m "feat: add group field to sendsPointer and receivesPointer schemas (#2079)"
```

---

## Task 2: Shared utility — `partitionMessagesByGroup`

**Files:**
- Modify: `packages/core/eventcatalog/src/utils/node-graphs/utils/utils.ts`
- Create: `packages/core/eventcatalog/src/utils/node-graphs/utils/__tests__/partition.test.ts`

- [ ] **Step 1: Write failing tests for `partitionMessagesByGroup`**

Create `packages/core/eventcatalog/src/utils/node-graphs/utils/__tests__/partition.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { partitionMessagesByGroup } from '../utils';

// Minimal mock types matching what the function needs
const makePointer = (id: string, version: string, group?: string) => ({
  id,
  version,
  ...(group ? { group } : {}),
});

const makeMessage = (id: string, version: string, collection: string) => ({
  data: { id, version },
  collection,
});

describe('partitionMessagesByGroup', () => {
  it('returns all messages as ungrouped when no pointers have group', () => {
    const pointers = [makePointer('Evt1', '1.0.0'), makePointer('Evt2', '2.0.0')];
    const messages = [makeMessage('Evt1', '1.0.0', 'events'), makeMessage('Evt2', '2.0.0', 'events')];

    const result = partitionMessagesByGroup(pointers, messages);

    expect(result.grouped.size).toBe(0);
    expect(result.ungrouped.messages).toHaveLength(2);
    expect(result.ungrouped.pointers).toHaveLength(2);
  });

  it('groups messages by group name', () => {
    const pointers = [
      makePointer('Evt1', '1.0.0', 'GroupA'),
      makePointer('Evt2', '2.0.0', 'GroupA'),
      makePointer('Evt3', '1.0.0', 'GroupB'),
    ];
    const messages = [
      makeMessage('Evt1', '1.0.0', 'events'),
      makeMessage('Evt2', '2.0.0', 'events'),
      makeMessage('Evt3', '1.0.0', 'commands'),
    ];

    const result = partitionMessagesByGroup(pointers, messages);

    expect(result.grouped.size).toBe(2);
    expect(result.grouped.get('GroupA')!.messages).toHaveLength(2);
    expect(result.grouped.get('GroupA')!.pointers).toHaveLength(2);
    expect(result.grouped.get('GroupB')!.messages).toHaveLength(1);
    expect(result.ungrouped.messages).toHaveLength(0);
  });

  it('handles mix of grouped and ungrouped', () => {
    const pointers = [
      makePointer('Evt1', '1.0.0', 'GroupA'),
      makePointer('Evt2', '2.0.0'),
    ];
    const messages = [
      makeMessage('Evt1', '1.0.0', 'events'),
      makeMessage('Evt2', '2.0.0', 'events'),
    ];

    const result = partitionMessagesByGroup(pointers, messages);

    expect(result.grouped.size).toBe(1);
    expect(result.grouped.get('GroupA')!.messages).toHaveLength(1);
    expect(result.ungrouped.messages).toHaveLength(1);
  });

  it('same message in multiple groups creates entries in both groups', () => {
    const pointers = [
      makePointer('Evt1', '1.0.0', 'GroupA'),
      makePointer('Evt1', '1.0.0', 'GroupB'),
    ];
    const messages = [
      makeMessage('Evt1', '1.0.0', 'events'),
      makeMessage('Evt1', '1.0.0', 'events'),
    ];

    const result = partitionMessagesByGroup(pointers, messages);

    expect(result.grouped.get('GroupA')!.messages).toHaveLength(1);
    expect(result.grouped.get('GroupB')!.messages).toHaveLength(1);
  });

  it('skips pointers whose message cannot be found (hydration miss)', () => {
    const pointers = [makePointer('Missing', '1.0.0', 'GroupA')];
    const messages: any[] = [];

    const result = partitionMessagesByGroup(pointers, messages);

    expect(result.grouped.get('GroupA')!.messages).toHaveLength(0);
    expect(result.grouped.get('GroupA')!.pointers).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm run test packages/core/eventcatalog/src/utils/node-graphs/utils/__tests__/partition.test.ts --run`

Expected: FAIL — `partitionMessagesByGroup` is not exported from utils.

- [ ] **Step 3: Implement `partitionMessagesByGroup`**

Add to end of `packages/core/eventcatalog/src/utils/node-graphs/utils/utils.ts`:

```typescript
interface PointerWithGroup {
  id: string;
  version?: string;
  group?: string;
  [key: string]: any;
}

interface PartitionResult {
  grouped: Map<string, { messages: CollectionItem[]; pointers: PointerWithGroup[] }>;
  ungrouped: { messages: CollectionItem[]; pointers: PointerWithGroup[] };
}

/**
 * Partition raw message pointers and their hydrated messages by group.
 * Pointers with a `group` field are bucketed by group name.
 * Pointers without a `group` go into the ungrouped bucket.
 *
 * IMPORTANT: Does NOT use positional matching — matches each pointer to its
 * hydrated message by id + version, since `.filter(undefined)` in the caller
 * can cause the hydrated array to be shorter than the raw pointer array.
 */
export const partitionMessagesByGroup = (
  rawPointers: PointerWithGroup[],
  hydratedMessages: CollectionItem[]
): PartitionResult => {
  const grouped = new Map<string, { messages: CollectionItem[]; pointers: PointerWithGroup[] }>();
  const ungrouped: { messages: CollectionItem[]; pointers: PointerWithGroup[] } = {
    messages: [],
    pointers: [],
  };

  rawPointers.forEach((pointer) => {
    // Find the hydrated message matching this pointer by id + version
    const message = hydratedMessages.find(
      (m) => m.data.id === pointer.id && versionMatches(pointer.version, m.data.version)
    );

    if (pointer.group) {
      if (!grouped.has(pointer.group)) {
        grouped.set(pointer.group, { messages: [], pointers: [] });
      }
      const group = grouped.get(pointer.group)!;
      group.pointers.push(pointer);
      if (message) {
        group.messages.push(message);
      }
    } else {
      ungrouped.pointers.push(pointer);
      if (message) {
        ungrouped.messages.push(message);
      }
    }
  });

  return { grouped, ungrouped };
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm run test packages/core/eventcatalog/src/utils/node-graphs/utils/__tests__/partition.test.ts --run`

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/eventcatalog/src/utils/node-graphs/utils/utils.ts packages/core/eventcatalog/src/utils/node-graphs/utils/__tests__/partition.test.ts
git commit -m "feat: add partitionMessagesByGroup utility (#2079)"
```

---

## Task 3: Service node graph — emit MessageGroupNode for grouped messages

**Files:**
- Modify: `packages/core/eventcatalog/src/utils/node-graphs/services-node-graph.ts`
- Modify: `packages/core/eventcatalog/src/utils/__tests__/services/mocks.ts`
- Modify: `packages/core/eventcatalog/src/utils/__tests__/services/node-graph.spec.ts`

- [ ] **Step 1: Add mock data for grouped services**

Add to end of `packages/core/eventcatalog/src/utils/__tests__/services/mocks.ts`:

```typescript
export const mockGroupedService = {
  id: 'services/Student/StudentInfoService/index.mdx',
  slug: 'services/Student/StudentInfoService',
  collection: 'services',
  data: {
    id: 'StudentInfoService',
    version: '1.0.0',
    sends: [
      { id: 'ProgramCreated', version: '1.0.0', group: 'Academic Structure' },
      { id: 'ProgramUpdated', version: '1.0.0', group: 'Academic Structure' },
      { id: 'StudentEnrolled', version: '1.0.0', group: 'Student Lifecycle' },
      { id: 'GradeRecorded', version: '1.0.0' }, // ungrouped
    ],
    receives: [
      { id: 'EnrolmentRequested', version: '1.0.0', group: 'Student Lifecycle' },
      { id: 'PaymentProcessed', version: '0.0.1' }, // ungrouped
    ],
  },
};

export const mockGroupedEvents = [
  { data: { id: 'ProgramCreated', version: '1.0.0', name: 'ProgramCreated' }, collection: 'events' },
  { data: { id: 'ProgramUpdated', version: '1.0.0', name: 'ProgramUpdated' }, collection: 'events' },
  { data: { id: 'StudentEnrolled', version: '1.0.0', name: 'StudentEnrolled' }, collection: 'events' },
  { data: { id: 'GradeRecorded', version: '1.0.0', name: 'GradeRecorded' }, collection: 'events' },
];

export const mockGroupedCommands = [
  { data: { id: 'EnrolmentRequested', version: '1.0.0', name: 'EnrolmentRequested' }, collection: 'commands' },
];
```

- [ ] **Step 2: Write failing tests for grouped message behavior**

Add to `packages/core/eventcatalog/src/utils/__tests__/services/node-graph.spec.ts` — a new `describe('message grouping')` block. This test needs the mock to return the grouped service data. Add a new test using a dynamic mock override:

```typescript
describe('message grouping', () => {
  it('should collapse grouped sends into messageGroup nodes', async () => {
    // Override mocks for this test
    // These are imported at top of file alongside existing mocks
    vi.mocked(getCollection).mockImplementation(((key: CollectionKey) => {
      switch (key) {
        case 'services': return Promise.resolve([mockGroupedService]);
        case 'events': return Promise.resolve([...mockGroupedEvents]);
        case 'commands': return Promise.resolve([...mockGroupedCommands]);
        case 'queries': return Promise.resolve([]);
        case 'channels': return Promise.resolve([]);
        default: return Promise.resolve([]);
      }
    }) as any);

    const { nodes, edges } = await getNodesAndEdges({ id: 'StudentInfoService', version: '1.0.0' });

    // Should have: service node + 2 group nodes (sends) + 1 ungrouped send + 1 group node (receives) + 1 ungrouped receive = 6 nodes
    const groupNodes = nodes.filter((n: any) => n.type === 'messageGroup');
    expect(groupNodes).toHaveLength(3); // 'Academic Structure' sends, 'Student Lifecycle' sends, 'Student Lifecycle' receives

    // Academic Structure group should have 2 messages
    const academicGroup = groupNodes.find((n: any) => n.data.groupName === 'Academic Structure');
    expect(academicGroup).toBeDefined();
    expect(academicGroup.data.messageCount).toBe(2);
    expect(academicGroup.data.direction).toBe('sends');

    // GradeRecorded should still be an individual event node (ungrouped)
    const gradeNode = nodes.find((n: any) => n.id === 'GradeRecorded-1.0.0');
    expect(gradeNode).toBeDefined();
    expect(gradeNode.type).toBe('events');

    // PaymentProcessed should still be an individual command node (ungrouped)
    const paymentNode = nodes.find((n: any) => n.id === 'PaymentProcessed-0.0.1');
    expect(paymentNode).toBeDefined();
  });

  it('should create edges from service to group nodes', async () => {
    // These are imported at top of file alongside existing mocks
    vi.mocked(getCollection).mockImplementation(((key: CollectionKey) => {
      switch (key) {
        case 'services': return Promise.resolve([mockGroupedService]);
        case 'events': return Promise.resolve([...mockGroupedEvents]);
        case 'commands': return Promise.resolve([...mockGroupedCommands]);
        case 'queries': return Promise.resolve([]);
        case 'channels': return Promise.resolve([]);
        default: return Promise.resolve([]);
      }
    }) as any);

    const { edges } = await getNodesAndEdges({ id: 'StudentInfoService', version: '1.0.0' });

    // Should have edges connecting service to group nodes
    const serviceId = 'StudentInfoService-1.0.0';
    const groupEdges = edges.filter((e: any) =>
      (e.source === serviceId || e.target === serviceId) &&
      (e.source.startsWith('message-group-') || e.target.startsWith('message-group-'))
    );
    expect(groupEdges.length).toBeGreaterThanOrEqual(2); // at least sends + receives groups
  });
});
```

  it('should skip bothSentAndReceived edge for grouped messages', async () => {
    // These are imported at top of file alongside existing mocks
    // Create a service where a message is both sent and received, and grouped
    const bothWayService = {
      ...mockGroupedService,
      data: {
        ...mockGroupedService.data,
        id: 'BothWayService',
        sends: [{ id: 'SharedEvent', version: '1.0.0', group: 'Shared' }],
        receives: [{ id: 'SharedEvent', version: '1.0.0', group: 'Shared' }],
      },
    };
    const sharedEvent = { data: { id: 'SharedEvent', version: '1.0.0', name: 'SharedEvent' }, collection: 'events' };

    vi.mocked(getCollection).mockImplementation(((key: CollectionKey) => {
      switch (key) {
        case 'services': return Promise.resolve([bothWayService]);
        case 'events': return Promise.resolve([sharedEvent]);
        default: return Promise.resolve([]);
      }
    }) as any);

    const { edges } = await getNodesAndEdges({ id: 'BothWayService', version: '1.0.0' });

    // Should NOT have a bothSentAndReceived edge
    const bothEdges = edges.filter((e: any) => e.id?.includes('-both'));
    expect(bothEdges).toHaveLength(0);
  });

  it('should render a group node even for a single-message group', async () => {
    // These are imported at top of file alongside existing mocks
    const singleGroupService = {
      ...mockGroupedService,
      data: {
        ...mockGroupedService.data,
        id: 'SingleGroupService',
        sends: [{ id: 'ProgramCreated', version: '1.0.0', group: 'Lonely Group' }],
        receives: [],
      },
    };

    vi.mocked(getCollection).mockImplementation(((key: CollectionKey) => {
      switch (key) {
        case 'services': return Promise.resolve([singleGroupService]);
        case 'events': return Promise.resolve([mockGroupedEvents[0]]);
        default: return Promise.resolve([]);
      }
    }) as any);

    const { nodes } = await getNodesAndEdges({ id: 'SingleGroupService', version: '1.0.0' });
    const groupNodes = nodes.filter((n: any) => n.type === 'messageGroup');
    expect(groupNodes).toHaveLength(1);
    expect(groupNodes[0].data.messageCount).toBe(1);
  });

Note: You will need to add the `getCollection` import at the top of the test file:
```typescript
import { getCollection } from 'astro:content';
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm run test packages/core/eventcatalog/src/utils/__tests__/services/node-graph.spec.ts --run`

Expected: FAIL — no `messageGroup` nodes exist yet.

- [ ] **Step 4: Implement grouping in services-node-graph.ts**

In `packages/core/eventcatalog/src/utils/node-graphs/services-node-graph.ts`:

**4a.** Add import at top:
```typescript
import { partitionMessagesByGroup } from '@utils/node-graphs/utils/utils';
```
(Add alongside existing imports from utils/utils)

**4b.** Add a sanitize helper near the top of the file (after the imports):
```typescript
const sanitizeGroupId = (name: string) => name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
```

**4c.** Modify both `renderMessages` blocks. There are TWO separate `if (renderMessages)` blocks:
- First block (line 127): contains `receives.forEach` (lines 129-147)
- Second block (line 241): contains `sends.forEach` (lines 242-261) and `bothSentAndReceived.forEach` (lines 263-284)

Add the partition calls BEFORE the first block, then modify both blocks to use ungrouped messages only. The logic:

1. Partitions receives and sends using `partitionMessagesByGroup(receivesRaw, receives)` and `partitionMessagesByGroup(sendsRaw, sends)`
2. For each grouped receives entry, pushes a `messageGroup` node and edge
3. For each ungrouped receive, calls existing `getNodesAndEdgesForConsumedMessage`
4. Same for sends: grouped → messageGroup node + edge, ungrouped → existing `getNodesAndEdgesForProducedMessage`
5. Filters `bothSentAndReceived` to exclude any messages whose pointer has a `group` field

The key code pattern for emitting a group node:
```typescript
const serviceNodeId = generateIdForNode(service);

// For each group in receives
for (const [groupName, groupData] of receivesPartition.grouped) {
  const groupNodeId = `message-group-${service.data.id}-${service.data.version}-${sanitizeGroupId(groupName)}-receives`;
  nodes.push({
    id: groupNodeId,
    sourcePosition: 'right',
    targetPosition: 'left',
    type: 'messageGroup',
    data: {
      mode,
      groupName,
      direction: 'receives',
      messageCount: groupData.messages.length,
      messageTypes: [...new Set(groupData.messages.map((m: any) => m.collection))],
      messages: groupData.messages.map((msg: any, i: number) => ({
        message: msg,
        channels: groupData.pointers[i]?.from || [],
      })),
      service: { id: service.data.id, version: service.data.version },
    },
  });

  edges.push(
    createEdge({
      id: `${groupNodeId}-to-${serviceNodeId}`,
      source: groupNodeId,
      target: serviceNodeId,
      label: `${groupData.messages.length} messages`,
      type: 'multiline',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#666',
        width: 20,
        height: 20,
      },
    })
  );
}

// Ungrouped receives go through existing path
receivesPartition.ungrouped.messages.forEach((receive, index) => {
  const pointer = receivesPartition.ungrouped.pointers[index];
  const targetChannels = pointer?.from;
  // ... existing getNodesAndEdgesForConsumedMessage call
});
```

Same pattern for sends but with `direction: 'sends'`, `channels: pointer?.to`, and reversed edge direction (source: serviceNodeId, target: groupNodeId).

**4d.** Filter `bothSentAndReceived` to exclude grouped messages:
```typescript
// Collect all message IDs that are in any group
const groupedMessageIds = new Set<string>();
for (const [, groupData] of receivesPartition.grouped) {
  groupData.messages.forEach((m: any) => groupedMessageIds.add(`${m.data.id}-${m.data.version}`));
}
for (const [, groupData] of sendsPartition.grouped) {
  groupData.messages.forEach((m: any) => groupedMessageIds.add(`${m.data.id}-${m.data.version}`));
}

const filteredBothSentAndReceived = bothSentAndReceived.filter(
  (m: any) => m && !groupedMessageIds.has(`${m.data.id}-${m.data.version}`)
);
```

Then use `filteredBothSentAndReceived` instead of `bothSentAndReceived` in the existing forEach loop.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm run test packages/core/eventcatalog/src/utils/__tests__/services/node-graph.spec.ts --run`

Expected: All tests PASS (both new grouping tests and existing tests).

- [ ] **Step 6: Run full service test suite to check for regressions**

Run: `pnpm run test packages/core/eventcatalog/src/utils/__tests__/services/ --run`

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/core/eventcatalog/src/utils/node-graphs/services-node-graph.ts packages/core/eventcatalog/src/utils/__tests__/services/mocks.ts packages/core/eventcatalog/src/utils/__tests__/services/node-graph.spec.ts
git commit -m "feat: emit messageGroup nodes for grouped messages in service graph (#2079)"
```

---

## Task 4: MessageGroupNode component + visualiser registration

**Files:**
- Create: `packages/visualiser/src/nodes/message-group/MessageGroupNode.tsx`
- Create: `packages/visualiser/src/nodes/message-group/index.ts`
- Modify: `packages/visualiser/src/nodes/index.ts`
- Modify: `packages/visualiser/src/components/NodeGraph.tsx`

**Skill reference:** @visualiser-performance — apply React Flow performance rules to the new component.

- [ ] **Step 1: Create MessageGroupNode component**

Create `packages/visualiser/src/nodes/message-group/MessageGroupNode.tsx`:

```tsx
import { memo, useMemo } from "react";
import { Layers, Zap, Terminal, HelpCircle, Maximize2 } from "lucide-react";
import { Node, Handle, Position, useHandleConnections } from "@xyflow/react";
import { HIDDEN_HANDLE_STYLE } from "../OwnerIndicator";
import { useDarkMode } from "../shared-styles";

export type MessageGroupNodeData = {
  mode?: string;
  groupName: string;
  direction: "sends" | "receives";
  messageCount: number;
  messageTypes: string[];
  messages: Array<{
    message: any;
    channels: any[];
  }>;
  service: { id: string; version: string };
};

export type MessageGroupNode = Node<MessageGroupNodeData, "messageGroup">;

// Icons for message types
const TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  events: Zap,
  commands: Terminal,
  queries: HelpCircle,
};

export default memo(function MessageGroupNode(props: MessageGroupNode) {
  const { groupName, messageCount, messageTypes, direction } = props.data;
  const isDark = useDarkMode();
  const targetConnections = useHandleConnections({ type: "target" });
  const sourceConnections = useHandleConnections({ type: "source" });

  const typeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    props.data.messages.forEach(({ message }) => {
      const type = message?.collection || "unknown";
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [props.data.messages]);

  return (
    <div
      className={`relative min-w-48 max-w-60 rounded-xl border-2 overflow-visible ${
        props.selected ? "ring-2 ring-violet-400/60 ring-offset-2" : ""
      } border-violet-500`}
      style={{
        background: isDark
          ? "var(--ec-message-group-node-bg, rgb(var(--ec-card-bg)))"
          : "var(--ec-message-group-node-bg, rgb(var(--ec-card-bg)))",
        boxShadow: "0 2px 12px rgba(139, 92, 246, 0.15)",
      }}
    >
      <Handle type="target" position={Position.Left} style={HIDDEN_HANDLE_STYLE} />
      <Handle type="source" position={Position.Right} style={HIDDEN_HANDLE_STYLE} />

      {/* Glow handles */}
      {targetConnections.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: -6,
            transform: "translateY(-50%)",
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
            border: "2px solid rgb(var(--ec-page-bg))",
            zIndex: 20,
            animation: "ec-handle-pulse 2s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
      )}
      {sourceConnections.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            right: -6,
            transform: "translateY(-50%)",
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
            border: "2px solid rgb(var(--ec-page-bg))",
            zIndex: 20,
            animation: "ec-handle-pulse 2s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Type badge */}
      <div className="absolute -top-2.5 left-2.5 z-10">
        <span className="inline-flex items-center gap-1 text-[7px] font-bold uppercase tracking-widest text-white px-1.5 py-0.5 rounded shadow-sm bg-violet-600">
          <Layers className="w-2.5 h-2.5" strokeWidth={2.5} />
          Message Group
        </span>
      </div>

      <div className="px-3 pt-3.5 pb-2.5">
        {/* Group name */}
        <div className="text-[13px] font-semibold leading-snug text-[rgb(var(--ec-page-text))]">
          {groupName}
        </div>

        {/* Count + type breakdown */}
        <div className="mt-1.5 flex items-center gap-2">
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{
              background: isDark ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.1)",
              color: isDark ? "#c4b5fd" : "#6d28d9",
            }}
          >
            {messageCount} {messageCount === 1 ? "message" : "messages"}
          </span>
          <div className="flex items-center gap-1">
            {Object.entries(typeBreakdown).map(([type, count]) => {
              const Icon = TYPE_ICONS[type] || HelpCircle;
              return (
                <span key={type} className="flex items-center gap-0.5 text-[9px] text-[rgb(var(--ec-page-text-muted))]">
                  <Icon className="w-2.5 h-2.5" strokeWidth={2} />
                  {count}
                </span>
              );
            })}
          </div>
        </div>

        {/* Click affordance */}
        <div className="mt-1.5 flex items-center gap-1 text-[8px] text-[rgb(var(--ec-page-text-muted))]">
          <Maximize2 className="w-2.5 h-2.5" />
          Click to explore
        </div>
      </div>
    </div>
  );
});
```

- [ ] **Step 2: Create barrel export**

Create `packages/visualiser/src/nodes/message-group/index.ts`:

```typescript
export { default as MessageGroupNode } from "./MessageGroupNode";
export type { MessageGroupNode as MessageGroupNodeType, MessageGroupNodeData } from "./MessageGroupNode";
```

- [ ] **Step 3: Register in nodes/index.ts**

In `packages/visualiser/src/nodes/index.ts`:

Add import after the existing core node imports (around line 64):
```typescript
import { MessageGroupNode } from "./message-group";
```

Add to re-exports (around line 77):
```typescript
export { MessageGroupNode };
export type { MessageGroupNodeType } from "./message-group";
```

Add `messageGroup: MessageGroupNode` to the `nodeComponents` object (around line 114).

- [ ] **Step 4: Register in NodeGraph.tsx nodeTypes**

In `packages/visualiser/src/components/NodeGraph.tsx`:

Add import:
```typescript
import { MessageGroupNode } from "../nodes/message-group";
```

Add to the `nodeTypes` useMemo return object (around line 266, before `field:`):
```typescript
messageGroup: MessageGroupNode,
```

Note: No context menu wrapping needed — group nodes are not navigable resources.

- [ ] **Step 5: Register in NodeGraph.tsx colorClasses**

In `packages/visualiser/src/components/NodeGraph.tsx`, add to the `colorClasses` object inside `getNodesByCollectionWithColors` (around line 890):
```typescript
messageGroup: "bg-violet-600",
```

- [ ] **Step 6: Verify build**

Run: `cd packages/visualiser && pnpm run build 2>&1 | tail -20`

Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add packages/visualiser/src/nodes/message-group/ packages/visualiser/src/nodes/index.ts packages/visualiser/src/components/NodeGraph.tsx
git commit -m "feat: add MessageGroupNode component and register in visualiser (#2079)"
```

---

## Task 5: Focus Mode, mermaid export, and search registration

**Files:**
- Modify: `packages/visualiser/src/components/FocusMode/utils.ts`
- Modify: `packages/visualiser/src/utils/export-mermaid.ts`
- Modify: `packages/visualiser/src/components/VisualiserSearch.tsx`

- [ ] **Step 1: Register in FocusMode/utils.ts**

**1a.** Add to `NODE_COLOR_CLASSES` (after line 30):
```typescript
messageGroup: "bg-violet-600",
```

**1b.** Add to `NODE_TYPE_LABELS` (after line 47):
```typescript
messageGroup: "Message Group",
```

**1c.** Add handler in `getNodeDisplayInfo` function (before the ENTITY_KEYS search, around line 106):
```typescript
// Handle message group nodes
if (nodeType === "messageGroup") {
  return {
    id: node.id,
    name: data?.groupName || node.id,
    type: "messageGroup",
    version: undefined,
    description: `${data?.messageCount || 0} messages (${data?.direction || "unknown"})`,
  };
}
```

**1d.** `getNodeDocUrl` already returns `null` for unknown entity types, so no changes needed there — messageGroup nodes will correctly return null.

- [ ] **Step 2: Register in export-mermaid.ts**

**2a.** Add to `NODE_SHAPE_MAP` (around line 48):
```typescript
messageGroup: ["[[", "]]"], // stadium shape (like service)
```

**2b.** Add to `NODE_STYLE_CLASSES` (around line 83):
```typescript
messageGroup: "fill:#7c3aed,stroke:#5b21b6,color:#fff",
```

**2c.** Add handler in `getNodeLabel` function (before the fallback, around line 217):
```typescript
if (type === "messageGroup") {
  const groupName = (data as any).groupName || node.id;
  const count = (data as any).messageCount || 0;
  return `${groupName} (${count} messages)`;
}
```

- [ ] **Step 3: Register in VisualiserSearch.tsx**

**3a.** Add to `getNodeTypeColorClass` callback's `colorClasses` object (around line 123):
```typescript
messageGroup: "bg-violet-600 text-white",
```

**3b.** Add handler in `getNodeDisplayName` callback (around line 90, before the existing name extraction chain):
```typescript
const getNodeDisplayName = useCallback((node: CustomNode) => {
  // Handle message group nodes
  if (node.type === "messageGroup") {
    return node.data?.groupName || node.id;
  }

  const name =
    node.data?.message?.data?.name ||
    // ... existing chain
```

- [ ] **Step 4: Verify build**

Run: `cd packages/visualiser && pnpm run build 2>&1 | tail -20`

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add packages/visualiser/src/components/FocusMode/utils.ts packages/visualiser/src/utils/export-mermaid.ts packages/visualiser/src/components/VisualiserSearch.tsx
git commit -m "feat: register messageGroup in Focus Mode, mermaid export, and search (#2079)"
```

---

## Task 6: Focus Mode click handler — compute sub-graph on click

**Files:**
- Modify: `packages/visualiser/src/components/NodeGraph.tsx`

This is the key integration piece. When a `messageGroup` node is clicked, we need to:
1. Compute the expanded sub-graph (individual messages + channels)
2. Inject those nodes/edges into the graph temporarily
3. Open Focus Mode centered on the service node

- [ ] **Step 1: Add messageGroup click handler in NodeGraph.tsx**

In the `handleNodeClick` callback (around line 520-551), add a check for messageGroup nodes before the existing focus mode logic:

```typescript
// Handle messageGroup click — open focus mode with expanded sub-graph
if (node.type === "messageGroup") {
  const groupData = node.data as any;
  const serviceId = `${groupData.service.id}-${groupData.service.version}`;

  // Build expanded nodes from group data
  const expandedNodes: Node[] = [];
  const expandedEdges: Edge[] = [];

  // Add the service node (already in the graph)
  const serviceNode = nodes.find((n) => n.id === serviceId);
  if (serviceNode) {
    expandedNodes.push(serviceNode);
  }

  // Add individual message nodes from the group
  groupData.messages.forEach((item: any, index: number) => {
    const msg = item.message;
    if (!msg) return;
    const msgId = `${msg.data.id}-${msg.data.version}`;
    expandedNodes.push({
      id: msgId,
      type: msg.collection,
      position: { x: 0, y: index * 100 },
      data: {
        mode: groupData.mode || "simple",
        message: { ...msg.data },
      },
    } as Node);

    // Create edge between service and message
    if (groupData.direction === "sends") {
      expandedEdges.push({
        id: `${serviceId}-to-${msgId}`,
        source: serviceId,
        target: msgId,
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
      } as Edge);
    } else {
      expandedEdges.push({
        id: `${msgId}-to-${serviceId}`,
        source: msgId,
        target: serviceId,
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
      } as Edge);
    }
  });

  // Temporarily inject expanded nodes/edges for focus mode
  setNodes((prev) => [...prev, ...expandedNodes.filter((n) => !prev.find((p) => p.id === n.id))]);
  setEdges((prev) => [...prev, ...expandedEdges]);

  setFocusedNodeId(serviceId);
  setFocusModeOpen(true);
  return;
}
```

Note: You need to import `MarkerType` from `@xyflow/react` if not already imported. Check the existing imports.

- [ ] **Step 2: Track injected nodes and clean up on Focus Mode close**

Add a ref near the top of the NodeGraph component (alongside other refs):
```typescript
const injectedGroupNodeIds = useRef<Set<string>>(new Set());
const injectedGroupEdgeIds = useRef<Set<string>>(new Set());
```

In the messageGroup click handler (Step 1), after injecting nodes/edges, track them:
```typescript
expandedNodes.forEach((n) => injectedGroupNodeIds.current.add(n.id));
expandedEdges.forEach((e) => injectedGroupEdgeIds.current.add(e.id));
```

In the `onClose` handler of `FocusModeModal` (around line 1415), clean up only the injected IDs:
```typescript
onClose={() => {
  setFocusModeOpen(false);
  // Remove only the temporarily injected message group expansion nodes/edges
  if (injectedGroupNodeIds.current.size > 0) {
    setNodes((prev) => prev.filter((n) => !injectedGroupNodeIds.current.has(n.id)));
    setEdges((prev) => prev.filter((e) => !injectedGroupEdgeIds.current.has(e.id)));
    injectedGroupNodeIds.current.clear();
    injectedGroupEdgeIds.current.clear();
  }
}}
```

This avoids removing nodes added by other interactions — only the group expansion nodes are cleaned up.

- [ ] **Step 3: Verify build**

Run: `cd packages/visualiser && pnpm run build 2>&1 | tail -20`

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add packages/visualiser/src/components/NodeGraph.tsx
git commit -m "feat: add Focus Mode click handler for messageGroup nodes (#2079)"
```

---

## Task 7: Example catalog + manual verification

**Files:**
- Modify: `examples/default/eventcatalog.config.js` (if needed)
- Modify: example service frontmatter files

- [ ] **Step 1: Add grouped messages to an example service**

Pick an existing service in `examples/default/` that has several sends. Add `group` fields to some of its sends/receives pointers. For example, edit one of the service `index.md` frontmatter files:

```yaml
sends:
  - id: OrderCreatedEvent
    version: 1.0.0
    group: Order Lifecycle
  - id: OrderUpdatedEvent
    version: 1.0.0
    group: Order Lifecycle
  - id: PaymentProcessed
    version: 0.0.1
```

- [ ] **Step 2: Start dev server and verify visually**

Run: `pnpm run start:catalog`

Check:
- Service page shows collapsed group nodes instead of individual messages
- Group node displays correct name, count, and type icons
- Clicking group node opens Focus Mode with expanded messages
- Closing Focus Mode returns to collapsed view
- Ungrouped messages still render individually
- Legend shows "messageGroup" entries if present
- Mermaid export includes group nodes

- [ ] **Step 3: Run full test suite**

Run: `pnpm run test --run`

Expected: All tests pass across all packages.

- [ ] **Step 4: Format code**

Run: `pnpm run format`

- [ ] **Step 5: Commit example changes**

```bash
git add examples/
git commit -m "docs: add message grouping example to default catalog (#2079)"
```

---

## Task 8: Final verification

- [ ] **Step 1: Run full test suite**

Run: `pnpm run test --run`

Expected: All tests pass.

- [ ] **Step 2: Verify build**

Run: `pnpm run verify-build:catalog`

Expected: Build succeeds.

- [ ] **Step 3: Format check**

Run: `pnpm run format:diff`

Expected: No formatting issues.
