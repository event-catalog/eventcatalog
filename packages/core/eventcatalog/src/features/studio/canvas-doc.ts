import * as Y from 'yjs';
import type { Connection, Edge, Node, XYPosition } from '@xyflow/react';
import { createEdge } from './edges';
import { fitGroup, getAbsolutePosition, withDescendants, withParent } from './grouping';
import { getNodeDefinition, getNodeSize, isGroupType } from './node-types';

/**
 * Everything a canvas holds, as operations on its Yjs document. The same functions run in the
 * browser (people, WebMCP) and on the server (MCP tools), so humans and agents edit a canvas the same way.
 */

export type Author = { name: string; color: string; agent?: boolean };
export type Message = { id: string; text: string; author: Author; createdAt: number };
/** Where a comment is pinned: a canvas position, or a node (and the offset from its top left) so it moves with it */
export type CommentAnchor = { position: XYPosition; nodeId?: string; offset?: XYPosition };
export type Thread = CommentAnchor & { id: string; author: Author; createdAt: number; resolved: boolean; messages: Message[] };
export type CanvasMeta = {
  title?: string;
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
    ...(definition?.defaultSize ? size : {}),
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

export const resizeNode = (doc: Y.Doc, id: string, size: { width: number; height: number }) => {
  const { nodes } = getCanvasMaps(doc);
  const node = nodes.get(id);
  if (node) nodes.set(id, { ...node, width: size.width, height: size.height });
  return !!node;
};

/** Grow a container to fit what's in it (moving them clear of its header if needed), never shrinking it */
export const fitGroupToChildren = (doc: Y.Doc, groupId: string) =>
  doc.transact(() => {
    const { nodes } = getCanvasMaps(doc);
    const fit = fitGroup(groupId, Array.from(nodes.values()));
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

/** Put a node in a container (or take it out, without a parentId), keeping it where it is on the canvas */
export const setNodeParent = (doc: Y.Doc, nodeId: string, parentId: string | undefined) =>
  doc.transact(() => {
    const { nodes } = getCanvasMaps(doc);
    const node = nodes.get(nodeId);
    if (!node || node.parentId === parentId) return false;
    nodes.set(nodeId, toSharedNode(withParent(node, parentId, Array.from(nodes.values()))));
    if (parentId) fitGroupToChildren(doc, parentId);
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
