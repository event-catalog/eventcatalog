import * as Y from 'yjs';
import type { Connection, Edge, Node, XYPosition } from '@xyflow/react';
import { createEdge, getEdgeLabel } from './edges';
import { fitGroup, getAbsolutePosition, withDescendants, withParent } from './grouping';
import { getNodeDefinition, getNodeSize, isGroupType } from './node-types';

/**
 * Everything a canvas holds, as operations on its Yjs document. The same functions run in the
 * browser (people, WebMCP) and on the server (MCP tools), so humans and agents edit a canvas the same way.
 */

export type Author = {
  name: string;
  color: string;
  agent?: boolean;
  /** A picture from their sign-in provider (SSO), shown over their initials */
  picture?: string;
};
export type Message = { id: string; text: string; author: Author; createdAt: number };
/** Where a comment is pinned: a canvas position, or a node (and the offset from its top left) so it moves with it */
export type CommentAnchor = { position: XYPosition; nodeId?: string; offset?: XYPosition };
export type Thread = CommentAnchor & { id: string; author: Author; createdAt: number; resolved: boolean; messages: Message[] };
/** Where a canvas's design is: being worked on, up for review, agreed, or decided against */
export const CANVAS_STATUSES = ['draft', 'proposed', 'accepted', 'rejected'] as const;
export type CanvasStatus = (typeof CANVAS_STATUSES)[number];
/** A canvas's status being changed: by whom, when, and why (e.g. "Agreed in the architecture review") */
export type StatusChange = { status: CanvasStatus; by: Author; at: number; note?: string };
export type CanvasMeta = {
  title?: string;
  /** Draft until someone changes it */
  status?: CanvasStatus;
  /** Every status change, oldest first (the last few hundred) */
  statusHistory?: StatusChange[];
  createdAt?: number;
  createdBy?: string;
  /** When the canvas was last laid out, so everyone's canvas glides the nodes into place */
  layoutAt?: number;
};

// Canvases' documents on the collaboration server are named `design:<canvasId>` (scripts and peers join by it)
const DOCUMENT_PREFIX = 'design:';
export const canvasDocumentName = (canvasId: string) => `${DOCUMENT_PREFIX}${canvasId}`;
export const canvasIdFromDocumentName = (name: string) =>
  name.startsWith(DOCUMENT_PREFIX) ? name.slice(DOCUMENT_PREFIX.length) : undefined;

export const shortId = () => crypto.randomUUID().slice(0, 8);

export const getCanvasMaps = (doc: Y.Doc) => ({
  nodes: doc.getMap<Node>('nodes'),
  edges: doc.getMap<Edge>('edges'),
  threads: doc.getMap<Y.Map<unknown>>('threads'),
  meta: doc.getMap<unknown>('meta'),
});

// Only the design is shared. Selection, measured sizes and drag state stay with each user.
export const toSharedNode = ({ id, type, position, data, width, height, parentId, zIndex }: Node): Node => ({
  id,
  type,
  position,
  data,
  ...(width ? { width } : {}),
  ...(height ? { height } : {}),
  // Inside a container (its position is then relative to the container)
  ...(parentId ? { parentId } : {}),
  ...(zIndex !== undefined ? { zIndex } : {}),
});

/** A new node of a type, centred on a canvas position */
export const buildNode = (type: string, data: Record<string, unknown>, center: XYPosition): Node => {
  const definition = getNodeDefinition(type);
  const size = getNodeSize(type);
  return toSharedNode({
    id: `${type}-${shortId()}`,
    type,
    position: { x: center.x - size.width / 2, y: center.y - size.height / 2 },
    data,
    ...(definition?.defaultSize ? (definition.autoHeight ? { width: size.width } : size) : {}),
    // Containers sit behind what's in them and the connections between them
    ...(isGroupType(type) && { zIndex: -1 }),
  });
};

// ---- Meta ----

export const readMeta = (doc: Y.Doc) => getCanvasMaps(doc).meta.toJSON() as CanvasMeta;

export const setMeta = (doc: Y.Doc, meta: Partial<CanvasMeta>) =>
  doc.transact(() => {
    const map = getCanvasMaps(doc).meta;
    Object.entries(meta).forEach(([key, value]) => (value === undefined ? map.delete(key) : map.set(key, value)));
  });

// ---- Status ----

const MAX_STATUS_HISTORY = 200;

export const getCanvasStatus = (meta: CanvasMeta): CanvasStatus => meta.status ?? 'draft';

/** Changes a canvas's status (and records who did it). Returns false if it already had that status. */
export const setCanvasStatus = (doc: Y.Doc, status: CanvasStatus, by: Author, note?: string) => {
  let changed = false;
  doc.transact(() => {
    const meta = readMeta(doc);
    if (getCanvasStatus(meta) === status) return;
    const change: StatusChange = { status, by, at: Date.now(), ...(note?.trim() && { note: note.trim() }) };
    const map = getCanvasMaps(doc).meta;
    map.set('status', status);
    map.set('statusHistory', [...(meta.statusHistory ?? []), change].slice(-MAX_STATUS_HISTORY));
    changed = true;
  });
  return changed;
};

/** Accepted and rejected canvases are decided: changing what's on them makes them a draft again */
export const isDecided = (status: CanvasStatus) => status === 'accepted' || status === 'rejected';

/** A decided canvas whose nodes or edges were changed goes back to draft, recorded as changed by `by` */
export const reopenIfDecided = (doc: Y.Doc, by: Author) => {
  const status = getCanvasStatus(readMeta(doc));
  if (isDecided(status)) setCanvasStatus(doc, 'draft', by, `Changed after it was ${status}`);
};

/**
 * Runs `fn` (which may change the canvas), and if it changed nodes or edges, sends a decided canvas back to draft.
 * Comments don't count: reviewing an accepted design keeps it accepted.
 */
export const reopeningIfEdited = <T>(doc: Y.Doc, by: Author, fn: () => T): T => {
  let result!: T;
  // In one transaction (the one it's already in, if it is): what it changed is known before it ends
  doc.transact((transaction) => {
    result = fn();
    if (changesNodesOrEdges(transaction)) reopenIfDecided(doc, by);
  });
  return result;
};

/** Whether a transaction changed the canvas's nodes or edges (not just its comments or meta) */
export const changesNodesOrEdges = (transaction: Y.Transaction) => {
  const { nodes, edges } = getCanvasMaps(transaction.doc);
  return [...transaction.changed.keys()].some((type) => type === (nodes as unknown) || type === (edges as unknown));
};

// ---- Nodes and edges ----

export const addNodes = (doc: Y.Doc, nodes: Node[], edges: Edge[] = []) =>
  doc.transact(() => {
    const maps = getCanvasMaps(doc);
    nodes.forEach((node) => maps.nodes.set(node.id, toSharedNode(node)));
    edges.forEach((edge) => maps.edges.set(edge.id, edge));
  });

export const moveNode = (doc: Y.Doc, id: string, position: XYPosition) => {
  const { nodes } = getCanvasMaps(doc);
  const node = nodes.get(id);
  if (node) nodes.set(id, { ...node, position });
  return !!node;
};

/** Resize a node: both sides, or just its width or height (e.g. text, whose height follows what's in it) */
export const resizeNode = (
  doc: Y.Doc,
  id: string,
  size: { width: number; height: number },
  attributes: true | 'width' | 'height' = true
) => {
  const { nodes } = getCanvasMaps(doc);
  const node = nodes.get(id);
  if (node)
    nodes.set(id, {
      ...node,
      ...(attributes !== 'height' && { width: size.width }),
      ...(attributes !== 'width' && { height: size.height }),
    });
  return !!node;
};

/** Grow a container to fit what's in it (moving them clear of its header if needed), never shrinking it */
/**
 * The sizes nodes are rendered at (in the browser), by id. The document doesn't have them, so without them
 * containers are fitted to the size each type renders at at most.
 */
export type RenderedSizes = ReadonlyMap<string, { width: number; height: number }>;

const withRenderedSizes = (nodes: Node[], sizes?: RenderedSizes) =>
  sizes ? nodes.map((node) => (sizes.has(node.id) ? { ...node, measured: sizes.get(node.id) } : node)) : nodes;

export const fitGroupToChildren = (doc: Y.Doc, groupId: string, sizes?: RenderedSizes) =>
  doc.transact(() => {
    const { nodes } = getCanvasMaps(doc);
    const fit = fitGroup(groupId, withRenderedSizes(Array.from(nodes.values()), sizes));
    const group = nodes.get(groupId);
    if (!fit || !group) return;
    if (fit.shift.x || fit.shift.y) {
      // Children move right/down and the container left/up by the same amount: nothing moves on the canvas
      nodes.forEach((child, id) => {
        if (child.parentId === groupId)
          nodes.set(id, { ...child, position: { x: child.position.x + fit.shift.x, y: child.position.y + fit.shift.y } });
      });
    }
    nodes.set(groupId, {
      ...group,
      position: { x: group.position.x - fit.shift.x, y: group.position.y - fit.shift.y },
      width: fit.width,
      height: fit.height,
    });
  });

/** The containers a node is in grow to fit it (innermost first), e.g. after it's added or resized */
export const fitContainersAround = (doc: Y.Doc, nodeId: string, sizes?: RenderedSizes) =>
  doc.transact(() => {
    const { nodes } = getCanvasMaps(doc);
    for (let id = nodes.get(nodeId)?.parentId; id; id = nodes.get(id)?.parentId) fitGroupToChildren(doc, id, sizes);
  });

/** Put a node in a container (or take it out, without a parentId), keeping it where it is on the canvas */
export const setNodeParent = (doc: Y.Doc, nodeId: string, parentId: string | undefined, sizes?: RenderedSizes) =>
  doc.transact(() => {
    const { nodes } = getCanvasMaps(doc);
    const node = nodes.get(nodeId);
    if (!node || node.parentId === parentId) return false;
    nodes.set(nodeId, toSharedNode(withParent(node, parentId, Array.from(nodes.values()))));
    if (parentId) fitGroupToChildren(doc, parentId, sizes);
    return true;
  });

export const updateNodeData = (doc: Y.Doc, id: string, updater: (data: Record<string, unknown>) => Record<string, unknown>) => {
  const { nodes } = getCanvasMaps(doc);
  const node = nodes.get(id);
  if (node) nodes.set(id, { ...node, data: updater(node.data) });
  return !!node;
};

/** Connect two nodes with an EventCatalog-labelled edge. Returns the edge, or why it couldn't be made. */
export const connectNodes = (
  doc: Y.Doc,
  connection: Pick<Connection, 'source' | 'target'> & Partial<Connection>,
  label?: string
): Edge | { error: string } => {
  const { nodes, edges } = getCanvasMaps(doc);
  const source = nodes.get(connection.source);
  const target = nodes.get(connection.target);
  if (!source) return { error: `Node "${connection.source}" is not on the canvas` };
  if (!target) return { error: `Node "${connection.target}" is not on the canvas` };
  if (source.id === target.id) return { error: 'A node cannot be connected to itself' };
  const existing = Array.from(edges.values()).find((edge) => edge.source === source.id && edge.target === target.id);
  if (existing) return existing;
  const edge = createEdge(
    {
      source: source.id,
      target: target.id,
      sourceHandle: connection.sourceHandle ?? null,
      targetHandle: connection.targetHandle ?? null,
    },
    source.type,
    target.type
  );
  const created = label === undefined ? edge : { ...edge, label };
  edges.set(created.id, created);
  return created;
};

/**
 * Moves a connection to new ends (dragged to another node), keeping it the same connection. Its label follows
 * the new ends if it was EventCatalog's wording, and is kept if someone wrote it.
 */
export const reconnectEdge = (doc: Y.Doc, edgeId: string, connection: Connection): Edge | { error: string } =>
  doc.transact(() => {
    const { nodes, edges } = getCanvasMaps(doc);
    const edge = edges.get(edgeId);
    const source = nodes.get(connection.source);
    const target = nodes.get(connection.target);
    if (!edge) return { error: `Connection "${edgeId}" is not on the canvas` };
    if (!source || !target) return { error: 'Connections join two nodes on the canvas' };
    if (source.id === target.id) return { error: 'A node cannot be connected to itself' };
    const duplicate = Array.from(edges.values()).find(
      (other) => other.id !== edgeId && other.source === source.id && other.target === target.id
    );
    if (duplicate) return { error: 'Those nodes are already connected' };

    const defaultLabel = getEdgeLabel(nodes.get(edge.source)?.type, nodes.get(edge.target)?.type);
    const moved = createEdge(connection, source.type, target.type);
    const reconnected: Edge = {
      ...moved,
      id: edge.id,
      ...(edge.label !== undefined && edge.label !== defaultLabel && { label: edge.label }),
    };
    edges.set(edgeId, reconnected);
    return reconnected;
  });

export const deleteEdges = (doc: Y.Doc, ids: string[]) =>
  doc.transact(() => ids.forEach((id) => getCanvasMaps(doc).edges.delete(id)));

/** Delete nodes (containers with what's in them), the edges to them, and leave their comments where they were */
export const deleteNodes = (doc: Y.Doc, ids: string[]) =>
  doc.transact(() => {
    const { nodes, edges, threads } = getCanvasMaps(doc);
    const all = Array.from(nodes.values());
    const lookup = new Map(all.map((node) => [node.id, node]));
    const removed = withDescendants(ids, all);
    threads.forEach((thread) => {
      const nodeId = thread.get('nodeId') as string | undefined;
      const node = nodeId && removed.has(nodeId) ? nodes.get(nodeId) : undefined;
      if (!node) return;
      const offset = (thread.get('offset') as XYPosition) ?? { x: 0, y: 0 };
      const position = getAbsolutePosition(node, lookup);
      thread.set('position', { x: position.x + offset.x, y: position.y + offset.y });
      thread.delete('nodeId');
      thread.delete('offset');
    });
    removed.forEach((id) => nodes.delete(id));
    edges.forEach((edge, id) => {
      if (removed.has(edge.source) || removed.has(edge.target)) edges.delete(id);
    });
  });

// ---- Comments ----
// Each thread is a nested Y.Map and its messages a Y.Array, so concurrent replies (and resolving while
// someone replies) all merge.

export const readThreads = (doc: Y.Doc) =>
  Array.from(getCanvasMaps(doc).threads.values())
    .map((thread) => thread.toJSON() as Thread)
    .sort((a, b) => a.createdAt - b.createdAt);

const anchorEntries = (anchor: CommentAnchor): [string, unknown][] => [
  ['position', anchor.position],
  ...(anchor.nodeId && anchor.offset
    ? ([
        ['nodeId', anchor.nodeId],
        ['offset', anchor.offset],
      ] as [string, unknown][])
    : []),
];

export const createThread = (doc: Y.Doc, anchor: CommentAnchor, text: string, author: Author) => {
  const id = shortId();
  const now = Date.now();
  const messages = new Y.Array<Message>();
  messages.push([{ id: shortId(), text, author, createdAt: now }]);
  const thread = new Y.Map<unknown>([
    ['id', id],
    ...anchorEntries(anchor),
    ['author', author],
    ['createdAt', now],
    ['resolved', false],
    ['messages', messages],
  ]);
  getCanvasMaps(doc).threads.set(id, thread);
  return id;
};

const getThread = (doc: Y.Doc, id: string) => getCanvasMaps(doc).threads.get(id);

export const replyToThread = (doc: Y.Doc, threadId: string, text: string, author: Author) => {
  const messages = getThread(doc, threadId)?.get('messages') as Y.Array<Message> | undefined;
  messages?.push([{ id: shortId(), text, author, createdAt: Date.now() }]);
  return !!messages;
};

export const setThreadResolved = (doc: Y.Doc, threadId: string, resolved: boolean) => {
  const thread = getThread(doc, threadId);
  thread?.set('resolved', resolved);
  return !!thread;
};

/** Move a thread's pin, attaching it to a node (anchor.nodeId) or to the canvas */
export const moveThread = (doc: Y.Doc, threadId: string, anchor: CommentAnchor) => {
  const thread = getThread(doc, threadId);
  if (!thread) return false;
  doc.transact(() => {
    thread.set('position', anchor.position);
    if (anchor.nodeId && anchor.offset) {
      thread.set('nodeId', anchor.nodeId);
      thread.set('offset', anchor.offset);
    } else {
      thread.delete('nodeId');
      thread.delete('offset');
    }
  });
  return true;
};

export const deleteThread = (doc: Y.Doc, threadId: string) => {
  const { threads } = getCanvasMaps(doc);
  const exists = threads.has(threadId);
  threads.delete(threadId);
  return exists;
};

/** Deletes comment threads in one change (one undo brings them all back) */
export const deleteThreads = (doc: Y.Doc, threadIds: string[]) =>
  doc.transact(() => threadIds.forEach((id) => deleteThread(doc, id)));

/** Moves comment threads in one change, e.g. ones that moved with what was dragged */
export const moveThreads = (doc: Y.Doc, moves: { threadId: string; anchor: CommentAnchor }[]) =>
  doc.transact(() => moves.forEach(({ threadId, anchor }) => moveThread(doc, threadId, anchor)));

// ---- Reading a whole canvas ----

export const readCanvas = (doc: Y.Doc) => {
  const { nodes, edges } = getCanvasMaps(doc);
  return {
    meta: readMeta(doc),
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values()),
    threads: readThreads(doc),
  };
};
