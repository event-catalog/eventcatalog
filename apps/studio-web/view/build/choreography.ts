/**
 * Agents work on the diagram like a person would: their cursor travels to where they're going, they drop one node,
 * drag a connection from it to the next, carry nodes into the boxes they belong in, and tidy up, rather than
 * everything appearing at once. Played in the view from the layout (there's no shared canvas here): the first
 * diagram is built up from nothing, and each later one plays only what changed from the one before.
 * Adapted from event-catalog/eventcatalog@v5-beta:packages/core/eventcatalog/src/features/studio/agent-choreography.ts
 */
import type { Edge, Node, XYPosition } from '@xyflow/react';
import { getNodeSize } from '@eventcatalog/visualiser/layout';

/** What the view shows of the agent at work (as Studio's AgentPresence) */
export type AgentPresence = {
  pointer: XYPosition | null;
  selection: string[];
  activity?: string;
  /** Where a connection being dragged starts: drawn from there to the pointer */
  connecting?: XYPosition | null;
};

/** A node on the stage, in canvas coordinates (its position in its container is worked out when drawn) */
export type StageNode = { node: Node; parentId?: string; position: XYPosition; width: number; height: number; carried?: boolean };
export type StageState = { nodes: Map<string, StageNode>; edges: Map<string, Edge> };

export type Stage = {
  get: () => StageState;
  set: (state: StageState) => void;
  present: (presence: AgentPresence) => void;
  cancelled: () => boolean;
};

// Smooth (about 60 fps) and quick: the agent should look like it's working fast
const FRAME_MS = 16;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const distance = (a: XYPosition, b: XYPosition) => Math.hypot(a.x - b.x, a.y - b.y);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const isGroup = (node: Node) => node.type === 'domain-group' || node.type === 'system-group';
const GROUP_PADDING = { side: 40, top: 64, bottom: 32 };

/** A node's name, from the resource it shows */
export const nameOf = (node: Node) => {
  const data = (node.data ?? {}) as Record<string, any>;
  const resource = data.service ?? data.message ?? data.channel ?? data.data ?? data.domain ?? data.system;
  return String(resource?.name ?? node.id);
};

const sizeOf = (node: Node) => {
  const style = node.style as { width?: number; height?: number } | undefined;
  if (typeof style?.width === 'number' && typeof style?.height === 'number') return { width: style.width, height: style.height };
  const size = getNodeSize(node as any) as { width: number; height: number };
  return { width: size.width, height: size.height };
};

/** Every node of a laid out graph in canvas coordinates (layouts place nodes relative to their containers) */
export function toStage(graph: { nodes: Node[]; edges: Edge[] }): StageState {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const absolute = (node: Node): XYPosition => {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    const origin = parent ? absolute(parent) : { x: 0, y: 0 };
    return { x: origin.x + node.position.x, y: origin.y + node.position.y };
  };
  return {
    nodes: new Map(graph.nodes.map((node) => [node.id, { node, parentId: node.parentId, position: absolute(node), ...sizeOf(node) }])),
    edges: new Map(graph.edges.map((edge) => [edge.id, edge])),
  };
}

const copy = (state: StageState): StageState => ({
  nodes: new Map([...state.nodes].map(([id, n]) => [id, { ...n, position: { ...n.position } }])),
  edges: new Map(state.edges),
});

const center = (n: StageNode) => ({ x: n.position.x + n.width / 2, y: n.position.y + n.height / 2 });
// Where connections leave a node (its right side) and arrive (its left side)
const sourceHandle = (n: StageNode) => ({ x: n.position.x + n.width, y: n.position.y + n.height / 2 });
const targetHandle = (n: StageNode) => ({ x: n.position.x, y: n.position.y + n.height / 2 });

const depthOf = (id: string, nodes: Map<string, { parentId?: string }>): number => {
  const parentId = nodes.get(id)?.parentId;
  return parentId && nodes.has(parentId) ? 1 + depthOf(parentId, nodes) : 0;
};

/** Containers fit what's in them, so they grow as nodes are dropped in (deepest first) */
function fitGroups(state: StageState) {
  const groups = [...state.nodes.values()].filter((n) => isGroup(n.node));
  groups.sort((a, b) => depthOf(b.node.id, state.nodes) - depthOf(a.node.id, state.nodes));
  for (const group of groups) {
    const children = [...state.nodes.values()].filter((n) => n.parentId === group.node.id && !n.carried);
    if (!children.length) continue;
    const left = Math.min(...children.map((c) => c.position.x)) - GROUP_PADDING.side;
    const top = Math.min(...children.map((c) => c.position.y)) - GROUP_PADDING.top;
    const right = Math.max(...children.map((c) => c.position.x + c.width)) + GROUP_PADDING.side;
    const bottom = Math.max(...children.map((c) => c.position.y + c.height)) + GROUP_PADDING.bottom;
    Object.assign(group, { position: { x: left, y: top }, width: right - left, height: bottom - top });
  }
}

/**
 * The agent's hand: moves its pointer smoothly (in frames, so it glides) and shows what it's doing. `pace` slows
 * down or speeds up everything (big changes go faster, so a diagram doesn't take too long to appear).
 */
function createAgentHand(stage: Stage, pace: number) {
  const presence: AgentPresence = { pointer: null, selection: [] };
  const show = () => stage.present({ ...presence });
  return {
    async pause(ms: number) {
      if (!stage.cancelled()) await sleep(ms * pace);
    },
    say(activity: string) {
      presence.activity = activity;
      show();
    },
    select(ids: string[]) {
      presence.selection = ids;
      show();
    },
    /** Glide the pointer to a point, dragging a connection from `connecting`, or carrying nodes with `onFrame` */
    async moveTo(target: XYPosition, { connecting, onFrame }: { connecting?: XYPosition; onFrame?: (t: number) => void } = {}) {
      // The first time, come in from a little way off rather than appearing on the spot
      const from = presence.pointer ?? { x: target.x - 120, y: target.y - 90 };
      const duration = Math.min(220, Math.max(60, 50 + distance(from, target) * 0.12)) * pace;
      const frames = Math.max(1, Math.round(duration / FRAME_MS));
      presence.connecting = connecting ?? null;
      for (let frame = 1; frame <= frames && !stage.cancelled(); frame++) {
        const t = easeInOut(frame / frames);
        presence.pointer = { x: lerp(from.x, target.x, t), y: lerp(from.y, target.y, t) };
        onFrame?.(t);
        show();
        await sleep(FRAME_MS);
      }
      presence.pointer = target;
      onFrame?.(1);
    },
    release() {
      presence.connecting = null;
      show();
    },
    leave() {
      Object.assign(presence, { pointer: null, selection: [], activity: undefined, connecting: null });
      show();
    },
  };
}

/** Faster still for bigger changes */
const paceFor = (steps: number) => Math.max(0.3, Math.min(0.7, 15 / Math.max(steps, 1)));

/**
 * Plays the diagram changing from `from` (nothing, the first time) to `to`: removals, nodes carried to the box
 * they now belong in, a tidy of the layout, then new nodes dropped one by one, each connected as soon as it can be.
 */
export async function playDiagram(stage: Stage, from: StageState | undefined, to: StageState) {
  const state = from ? copy(from) : { nodes: new Map(), edges: new Map() };
  const commit = () => stage.set(copy(state));
  const removed = [...state.nodes.keys()].filter((id) => !to.nodes.has(id));
  const added = [...to.nodes.keys()].filter((id) => !state.nodes.has(id));
  const reparented = [...state.nodes.values()].filter((n) => to.nodes.has(n.node.id) && to.nodes.get(n.node.id)!.parentId !== n.parentId);
  const newEdges = [...to.edges.keys()].filter((id) => !state.edges.has(id));
  const hand = createAgentHand(stage, paceFor(removed.length + added.length + reparented.length + newEdges.length / 2));

  // Connections that go, then nodes that go: point at each, then remove it
  [...state.edges.keys()].filter((id) => !to.edges.has(id)).forEach((id) => state.edges.delete(id));
  commit();
  for (const id of removed.sort((a, b) => depthOf(b, state.nodes) - depthOf(a, state.nodes))) {
    const n = state.nodes.get(id);
    if (!n || stage.cancelled()) continue;
    hand.say(`Removing ${nameOf(n.node)}`);
    await hand.moveTo(center(n));
    hand.select([id]);
    await hand.pause(60);
    state.nodes.delete(id);
    state.edges.forEach((edge, edgeId) => (edge.source === id || edge.target === id) && state.edges.delete(edgeId));
    hand.select([]);
    commit();
  }

  // Nodes that belong somewhere else now: grab each and carry it into its new box
  for (const n of reparented) {
    if (stage.cancelled()) break;
    const target = to.nodes.get(n.node.id)!;
    const parent = target.parentId && to.nodes.get(target.parentId);
    hand.say(parent ? `Moving ${nameOf(n.node)} into ${nameOf(parent.node)}` : `Moving ${nameOf(n.node)}`);
    const grab = { x: n.width / 2, y: 20 };
    await hand.moveTo({ x: n.position.x + grab.x, y: n.position.y + grab.y });
    hand.select([n.node.id]);
    await hand.pause(30);
    const start = { ...n.position };
    n.carried = true;
    await hand.moveTo(
      { x: target.position.x + grab.x, y: target.position.y + grab.y },
      {
        onFrame: (t) => {
          n.position = { x: lerp(start.x, target.position.x, t), y: lerp(start.y, target.position.y, t) };
          commit();
        },
      }
    );
    // Drop it in: boxes it joins may not be there yet, so it waits outside them until they are
    n.carried = false;
    n.parentId = target.parentId && state.nodes.has(target.parentId) ? target.parentId : undefined;
    fitGroups(state);
    commit();
    hand.select([]);
    await hand.pause(30);
  }

  // Everything that's staying glides to where the layout puts it
  if (from && !stage.cancelled()) await tidy(stage, hand, state, to, commit, 'Tidying the layout', (id) => state.nodes.has(id));

  // New nodes, left to right (the way messages flow), each in its boxes (added just before it)
  const order = added
    .filter((id) => !isGroup(to.nodes.get(id)!.node))
    .sort((a, b) => to.nodes.get(a)!.position.x - to.nodes.get(b)!.position.x || to.nodes.get(a)!.position.y - to.nodes.get(b)!.position.y);
  const ancestors = (id: string): string[] => {
    const parentId = to.nodes.get(id)?.parentId;
    return parentId ? [...ancestors(parentId), parentId] : [];
  };
  for (const id of order) {
    if (stage.cancelled()) break;
    const target = to.nodes.get(id)!;
    for (const groupId of ancestors(id).filter((g) => !state.nodes.has(g))) {
      const group = to.nodes.get(groupId)!;
      hand.say(`Adding ${group.node.type === 'domain-group' ? 'domain' : 'system'} ${nameOf(group.node)}`);
      await hand.moveTo({ x: target.position.x + target.width / 2, y: target.position.y - GROUP_PADDING.top / 2 });
      await hand.pause(30);
      // Starts around where its first node goes, and grows as more are dropped in
      state.nodes.set(groupId, {
        ...group,
        parentId: group.parentId && state.nodes.has(group.parentId) ? group.parentId : undefined,
        position: { x: target.position.x - GROUP_PADDING.side, y: target.position.y - GROUP_PADDING.top },
        width: target.width + GROUP_PADDING.side * 2,
        height: target.height + GROUP_PADDING.top + GROUP_PADDING.bottom,
      });
      fitGroups(state);
      commit();
      hand.select([groupId]);
      await hand.pause(40);
    }

    hand.say(`Adding ${nameOf(target.node)}`);
    await hand.moveTo(center(target));
    await hand.pause(30);
    state.nodes.set(id, { ...target, position: { ...target.position } });
    fitGroups(state);
    commit();
    hand.select([id]);
    await hand.pause(50);

    // Its connections to what's already there
    for (const edge of to.edges.values()) {
      if (stage.cancelled()) break;
      if (state.edges.has(edge.id) || !state.nodes.has(edge.source) || !state.nodes.has(edge.target)) continue;
      if (edge.source !== id && edge.target !== id) continue;
      const source = state.nodes.get(edge.source)!;
      const targetNode = state.nodes.get(edge.target)!;
      hand.say(`Connecting ${nameOf(source.node)} to ${nameOf(targetNode.node)}`);
      const start = sourceHandle(source);
      await hand.moveTo(start);
      await hand.pause(30);
      await hand.moveTo(targetHandle(targetNode), { connecting: start });
      state.edges.set(edge.id, edge);
      commit();
      hand.release();
      await hand.pause(20);
    }
  }

  // Boxes to their final size, the connections left (e.g. between nodes that were already there) and done
  if (!stage.cancelled()) await tidy(stage, hand, state, to, commit, from ? 'Tidying up' : 'Finishing up', () => true);
  hand.say('Done');
  await hand.pause(150);
  hand.leave();
  stage.set(copy(to));
}

/** Everything glides into place from the layout, in one move (as Studio's playLayout) */
async function tidy(
  stage: Stage,
  hand: ReturnType<typeof createAgentHand>,
  state: StageState,
  to: StageState,
  commit: () => void,
  activity: string,
  include: (id: string) => boolean
) {
  const moving = [...state.nodes.values()].filter((n) => include(n.node.id) && to.nodes.has(n.node.id));
  const starts = new Map(moving.map((n) => [n.node.id, { ...n.position, width: n.width, height: n.height }]));
  const moves = moving.some((n) => {
    const target = to.nodes.get(n.node.id)!;
    return distance(n.position, target.position) > 2 || Math.abs(n.width - target.width) > 2 || Math.abs(n.height - target.height) > 2;
  });
  if (!moves) return;
  hand.say(activity);
  const frames = 18;
  for (let frame = 1; frame <= frames && !stage.cancelled(); frame++) {
    const t = easeInOut(frame / frames);
    for (const n of moving) {
      const start = starts.get(n.node.id)!;
      const target = to.nodes.get(n.node.id)!;
      n.position = { x: lerp(start.x, target.position.x, t), y: lerp(start.y, target.position.y, t) };
      n.width = lerp(start.width, target.width, t);
      n.height = lerp(start.height, target.height, t);
      n.parentId = target.parentId && state.nodes.has(target.parentId) ? target.parentId : n.parentId;
    }
    commit();
    await sleep(FRAME_MS);
  }
  await hand.pause(40);
}

/** The stage as React Flow draws it: containers before what's in them, positions relative to them */
export function stageToFlow(state: StageState): { nodes: Node[]; edges: Edge[] } {
  const list = [...state.nodes.values()];
  list.sort((a, b) => depthOf(a.node.id, state.nodes) - depthOf(b.node.id, state.nodes));
  const nodes: Node[] = list.map((n) => {
    const parent = !n.carried && n.parentId ? state.nodes.get(n.parentId) : undefined;
    return {
      ...n.node,
      parentId: parent ? n.parentId : undefined,
      extent: undefined,
      position: parent ? { x: n.position.x - parent.position.x, y: n.position.y - parent.position.y } : n.position,
      ...(isGroup(n.node) && { style: { ...n.node.style, width: n.width, height: n.height } }),
      draggable: false,
      selectable: false,
      zIndex: n.carried ? 1000 : undefined,
    };
  });
  const edges: Edge[] = [...state.edges.values()].map((edge) => ({ ...edge, type: 'smoothstep', data: { ...edge.data, route: undefined } }));
  return { nodes, edges };
}
