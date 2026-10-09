import type { Edge, Node, XYPosition } from '@xyflow/react';
import type * as Y from 'yjs';
import {
  addNodes,
  connectNodes,
  createThread,
  deleteEdges,
  deleteNodes,
  fitContainersAround,
  getCanvasMaps,
  moveNode,
  placeNode,
  setEdgeRoutes,
  setMeta,
  type Author,
  type CommentAnchor,
} from './canvas-doc';
import {
  describeNode,
  nodeCenter,
  planNodes,
  resolveEdgeRefs,
  topLeftFor,
  updateCanvasNode,
  type CatalogIndex,
  type EdgeSpecs,
  type NodeSpecs,
  type NodeUpdate,
} from './canvas-actions';
import { getRelatedEdges } from './catalog';
import { getAbsolutePosition, sizeOf } from './grouping';
import type { LayoutResult } from './layout';
import { getNodeName } from './node-types';

/**
 * Agents work on a canvas like a person would: their cursor travels to where they're going, they drop one node,
 * drag a connection from it to the next, and so on, rather than everything appearing at once. Used by the MCP
 * tools (on the server) and the WebMCP tools (in the browser), with a stage that makes the changes and shows
 * the agent's presence there.
 */

/** What everyone sees of an agent at work */
export type AgentPresence = {
  pointer: XYPosition | null;
  selection: string[];
  activity?: string;
  /** Where a connection being dragged starts: drawn from there to the pointer */
  connecting?: XYPosition | null;
  /** Nodes being moved, by id, and where they are (relative to their containers), until they're dropped */
  moving?: Record<string, XYPosition> | null;
};

export type AgentStage = {
  /** Change the canvas (and read it) */
  change: <T>(fn: (doc: Y.Doc) => T) => Promise<T> | T;
  /** Show the agent on the canvas */
  present: (presence: AgentPresence) => void;
  /** Where the agent's pointer was left last time, if it's been here */
  lastPointer?: XYPosition | null;
  /**
   * Everyone sees the agent's presence, so nodes it moves are shown moving with it and only saved where they
   * end up, like a person's drag. Otherwise each step of a move is saved, so others see it move.
   */
  sharesMoves?: boolean;
};

const FRAME_MS = 40;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const distance = (a: XYPosition, b: XYPosition) => Math.hypot(a.x - b.x, a.y - b.y);

type Lookup = Map<string, Node>;
/** Where a node is on the canvas (nodes in containers are positioned relative to them) */
const positionOf = (node: Node, nodes: Lookup) => getAbsolutePosition(node, nodes);
/** Where connections leave a node (its right side) and arrive (its left side) */
const sourceHandle = (node: Node, nodes: Lookup) => {
  const position = positionOf(node, nodes);
  return { x: position.x + sizeOf(node).width, y: position.y + sizeOf(node).height / 2 };
};
const targetHandle = (node: Node, nodes: Lookup) => {
  const position = positionOf(node, nodes);
  return { x: position.x, y: position.y + sizeOf(node).height / 2 };
};
const nameOf = (node: Node) => getNodeName(node.type, node.data);

/**
 * The agent's hand: moves its pointer smoothly (in frames, so it glides for everyone) and shows what it's doing.
 * `pace` slows down or speeds up everything (big changes go faster, so a tool call doesn't take too long).
 */
export function createAgentHand(stage: AgentStage, { pace = 1 }: { pace?: number } = {}) {
  const presence: AgentPresence = { pointer: stage.lastPointer ?? null, selection: [] };
  const show = () => stage.present({ ...presence });

  const hand = {
    get pointer() {
      return presence.pointer;
    },
    async pause(ms: number) {
      await sleep(ms * pace);
    },
    say(activity: string) {
      presence.activity = activity;
      show();
    },
    select(ids: string[]) {
      presence.selection = ids;
      show();
    },
    /**
     * Glide the pointer to a point, e.g. dragging a connection from `connecting`, or carrying a node held at
     * `grab` from its position
     */
    async moveTo(
      target: XYPosition,
      { connecting, carry }: { connecting?: XYPosition; carry?: { nodeId: string; grab: XYPosition } } = {}
    ) {
      // The first time, come in from a little way off rather than appearing on the spot
      const from = presence.pointer ?? { x: target.x - 160, y: target.y - 120 };
      const duration = Math.min(900, Math.max(250, 200 + distance(from, target) * 0.6)) * pace;
      const frames = Math.max(1, Math.round(duration / FRAME_MS));
      presence.connecting = connecting ?? null;
      for (let frame = 1; frame <= frames; frame++) {
        const t = easeInOut(frame / frames);
        presence.pointer = { x: from.x + (target.x - from.x) * t, y: from.y + (target.y - from.y) * t };
        if (carry)
          presence.moving = {
            [carry.nodeId]: { x: presence.pointer.x - carry.grab.x, y: presence.pointer.y - carry.grab.y },
          };
        show();
        await sleep(FRAME_MS);
      }
    },
    /** Let go of a connection being dragged, or nodes being carried (once where they're dropped is saved) */
    release() {
      presence.connecting = null;
      presence.moving = null;
      show();
    },
  };
  return hand;
}

/** Faster for bigger changes, so a tool call stays well within client timeouts */
const paceFor = (steps: number) => Math.max(0.25, Math.min(1, 10 / Math.max(steps, 1)));

const readNodes = (doc: Y.Doc) => new Map<string, Node>(getCanvasMaps(doc).nodes.entries());

/** Drag a connection from one node to another, then make it */
async function playConnection(
  stage: AgentStage,
  hand: ReturnType<typeof createAgentHand>,
  connect: (doc: Y.Doc) => Edge | { error: string },
  sourceId: string,
  targetId: string
) {
  const nodes = await stage.change(readNodes);
  const source = nodes.get(sourceId);
  const target = nodes.get(targetId);
  if (!source || !target) return stage.change(connect);
  hand.say(`Connecting ${nameOf(source)} to ${nameOf(target)}`);
  const start = sourceHandle(source, nodes);
  await hand.moveTo(start);
  await hand.pause(120);
  await hand.moveTo(targetHandle(target, nodes), { connecting: start });
  const outcome = await stage.change(connect);
  hand.release();
  await hand.pause(180);
  return outcome;
}

/** addToCanvas, played out: each node dropped in turn, connected (to related resources and as asked) as soon as it can be */
export async function playAddToCanvas(
  stage: AgentStage,
  { nodes: specs, edges = [] }: { nodes: NodeSpecs; edges?: EdgeSpecs },
  catalog: CatalogIndex
) {
  const existing = await stage.change((doc) => [...readNodes(doc).values()]);
  const { planned, errors } = planNodes(existing, specs, catalog, edges);
  const pending = resolveEdgeRefs(edges, planned);
  const hand = createAgentHand(stage, { pace: paceFor(planned.length * 2 + pending.length) });
  const connections: string[] = [];

  for (const { node: plannedNode, canvasPosition, name, resource } of planned) {
    hand.say(`Adding ${name}`);
    const { width, height } = sizeOf(plannedNode);
    await hand.moveTo({ x: canvasPosition.x + width / 2, y: canvasPosition.y + height / 2 });
    await hand.pause(150);
    const { node, related } = await stage.change((doc) => {
      const onCanvas = readNodes(doc);
      // Where it goes on the canvas, relative to its container as it is now (containers move as they grow)
      const parent = plannedNode.parentId ? onCanvas.get(plannedNode.parentId) : undefined;
      const origin = parent ? getAbsolutePosition(parent, onCanvas) : { x: 0, y: 0 };
      const node = { ...plannedNode, position: { x: canvasPosition.x - origin.x, y: canvasPosition.y - origin.y } };
      addNodes(doc, [node]);
      // The containers it's in grow to fit it
      fitContainersAround(doc, node.id);
      const related = resource
        ? getRelatedEdges(resource, node.id, [...onCanvas.values()], catalog.relationsByKey, node.type)
        : [];
      return { node, related };
    });
    hand.select([node.id]);
    await hand.pause(300);

    // Its connections to what's already there: related catalog resources, then the ones asked for
    for (const edge of related) {
      await playConnection(stage, hand, (doc) => (addNodes(doc, [], [edge]), edge), edge.source, edge.target);
      connections.push(edge.id);
    }
    const onCanvas = await stage.change((doc) => new Set(readNodes(doc).keys()));
    for (const edge of pending.filter((edge) => onCanvas.has(edge.from) && onCanvas.has(edge.to))) {
      pending.splice(pending.indexOf(edge), 1);
      const outcome = await playConnection(
        stage,
        hand,
        (doc) => connectNodes(doc, { source: edge.from, target: edge.to }, edge.label),
        edge.from,
        edge.to
      );
      if ('error' in outcome) errors.push(outcome.error);
      else connections.push(outcome.id);
    }
  }

  // Connections to nodes that aren't on the canvas
  for (const edge of pending) {
    const outcome = await stage.change((doc) => connectNodes(doc, { source: edge.from, target: edge.to }, edge.label));
    if ('error' in outcome) errors.push(outcome.error);
  }

  hand.say('Done');
  return { created: planned.map(({ ref, node, name }) => ({ ref, nodeId: node.id, name })), connections, errors };
}

/** connectCanvasNodes, played out: each connection dragged from one node to the other */
export async function playConnectAll(stage: AgentStage, edges: EdgeSpecs) {
  const hand = createAgentHand(stage, { pace: paceFor(edges.length) });
  const connections: string[] = [];
  const errors: string[] = [];
  for (const edge of edges) {
    const outcome = await playConnection(
      stage,
      hand,
      (doc) => connectNodes(doc, { source: edge.from, target: edge.to }, edge.label),
      edge.from,
      edge.to
    );
    if ('error' in outcome) errors.push(outcome.error);
    else connections.push(outcome.id);
  }
  return { connections, errors };
}

/** Moving a node, played out: grab it and drag it there */
export async function playMoveNode(stage: AgentStage, nodeId: string, to: XYPosition, hand = createAgentHand(stage)) {
  const nodes = await stage.change(readNodes);
  const node = nodes.get(nodeId);
  if (!node) return false;
  // Positions are relative to the node's container, the pointer is on the canvas
  const parent = node.parentId ? nodes.get(node.parentId) : undefined;
  const origin = parent ? positionOf(parent, nodes) : { x: 0, y: 0 };
  const grab = { x: origin.x + sizeOf(node).width / 2, y: origin.y + 24 };
  hand.say(`Moving ${nameOf(node)}`);
  await hand.moveTo({ x: node.position.x + grab.x, y: node.position.y + grab.y });
  hand.select([nodeId]);
  await hand.pause(120);
  if (stage.sharesMoves) {
    await hand.moveTo({ x: to.x + grab.x, y: to.y + grab.y }, { carry: { nodeId, grab } });
    await stage.change((doc) => moveNode(doc, nodeId, to));
    hand.release();
    return true;
  }
  const from = node.position;
  const frames = 12;
  for (let frame = 1; frame <= frames; frame++) {
    const t = easeInOut(frame / frames);
    const position = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
    await stage.change((doc) => moveNode(doc, nodeId, position));
    await hand.moveTo({ x: position.x + grab.x, y: position.y + grab.y });
  }
  return true;
}

/**
 * Laying the canvas out: everything moves in one change, and everyone's canvas glides the nodes into place
 * (the layout time in the canvas's meta tells them to)
 */
export async function playLayout(stage: AgentStage, layout: LayoutResult) {
  const hand = createAgentHand(stage);
  hand.say('Tidying the layout');
  await stage.change((doc) => applyLayout(doc, layout));
  await hand.pause(500);
  hand.say('Done');
}

/**
 * Moves nodes, resizes containers and routes connections from a layout, in one change, and marks when it
 * happened. Connections the layout didn't route lose their old route (drawn as a plain step instead).
 */
export const applyLayout = (doc: Y.Doc, layout: LayoutResult) =>
  doc.transact(() => {
    layout.nodes.forEach(({ position, size }, id) => placeNode(doc, id, position, size));
    setEdgeRoutes(doc, layout.routes);
    setMeta(doc, { layoutAt: Date.now() });
  });

/** Removing things, played out: point at each, then remove it */
export async function playRemove(stage: AgentStage, nodeIds: string[], connectionIds: string[]) {
  const hand = createAgentHand(stage, { pace: paceFor(nodeIds.length) });
  if (connectionIds.length) await stage.change((doc) => deleteEdges(doc, connectionIds));
  for (const id of nodeIds) {
    const nodes = await stage.change(readNodes);
    const node = nodes.get(id);
    if (!node) continue;
    hand.say(`Removing ${nameOf(node)}`);
    await hand.moveTo(nodeCenter(node, nodes));
    hand.select([id]);
    await hand.pause(250);
    await stage.change((doc) => deleteNodes(doc, [id]));
    hand.select([]);
  }
}

/** Commenting, played out: go to where the comment goes, then leave it */
export async function playComment(
  stage: AgentStage,
  { text, nodeId, x, y }: { text: string; nodeId?: string; x?: number; y?: number },
  author: Author
) {
  const nodes = await stage.change(readNodes);
  const node = nodeId ? nodes.get(nodeId) : undefined;
  if (nodeId && !node) return { error: `No node "${nodeId}" on the canvas` };
  const offset = node ? { x: sizeOf(node).width - 8, y: 8 } : undefined;
  const position = node && positionOf(node, nodes);
  const anchor: CommentAnchor =
    node && offset && position
      ? { position: { x: position.x + offset.x, y: position.y + offset.y }, nodeId: node.id, offset }
      : { position: { x: x ?? 0, y: y ?? 0 } };
  const hand = createAgentHand(stage);
  hand.say('Commenting');
  await hand.moveTo(anchor.position);
  await hand.pause(400);
  const threadId = await stage.change((doc) => createThread(doc, anchor, text, author));
  return { threadId };
}

/** Pointing at a node while changing it (e.g. a rename) */
export async function playOnNode<T>(stage: AgentStage, nodeId: string, activity: string, change: (doc: Y.Doc) => T) {
  const nodes = await stage.change(readNodes);
  const node = nodes.get(nodeId);
  const hand = createAgentHand(stage);
  if (node) {
    hand.say(activity);
    await hand.moveTo(nodeCenter(node, nodes));
    hand.select([nodeId]);
    await hand.pause(250);
  }
  return stage.change(change);
}

/** Updating a node, played out: point at it to rename or re-describe it, then drag it to its new centre (x/y) */
export async function playUpdateNode(
  stage: AgentStage,
  { nodeId, name, summary, version, x, y }: NodeUpdate & { x?: number; y?: number }
) {
  const missing = { error: `No node "${nodeId}" on the canvas` };
  if (name !== undefined || summary !== undefined || version !== undefined) {
    const outcome = await playOnNode(stage, nodeId, 'Editing', (doc) =>
      updateCanvasNode(doc, { nodeId, name, summary, version })
    );
    if ('error' in outcome) return outcome;
  }
  if (x !== undefined || y !== undefined) {
    const nodes = await stage.change(readNodes);
    const node = nodes.get(nodeId);
    if (!node) return missing;
    const center = nodeCenter(node, nodes);
    await playMoveNode(stage, nodeId, topLeftFor(node, { x: x ?? center.x, y: y ?? center.y }, nodes));
  }
  const nodes = await stage.change(readNodes);
  const node = nodes.get(nodeId);
  return node ? describeNode(node, nodes) : missing;
}
