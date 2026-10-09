import * as Y from 'yjs';
import type { Connection, Edge, Node, XYPosition } from '@xyflow/react';
import type { EdgeRoute } from '@eventcatalog/visualiser/layout';
import { createEdge, getEdgeLabel } from './edges';
import { fitGroup, getAbsolutePosition, withDescendants, withParent } from './grouping';
import { getNodeDefinition, getNodeName, getNodeSize, isGroupType } from './node-types';

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
  /** L1 and L2 as the diagram the canvas was opened from showed them (see DiagramLevels) */
  diagramLevels?: DiagramLevels;
};

/** A level of detail as a diagram showed it: its nodes (laid out) and edges, by canvas node ids where they're the same */
export type DiagramLevel = { nodes: Node[]; edges: Edge[] };

/**
 * L1 and L2 of the diagram a canvas was opened from (the visualiser's "Open in Studio"), shown as they were while the
 * canvas's structure is what was opened (`structure`, from getStructureKey): moving nodes keeps them, changing what's
 * on the canvas or how it's connected doesn't (the levels are then worked out from the canvas)
 */
export type DiagramLevels = {
  structure: string;
  1?: DiagramLevel;
  2?: DiagramLevel;
  /** Levels the diagram doesn't have, and why (as the diagram says) */
  unavailable?: { 1?: string; 2?: string };
};

// Canvases' documents on the collaboration server are named `design:<canvasId>` (scripts and peers join by it)
const DOCUMENT_PREFIX = 'design:';
export const canvasDocumentName = (canvasId: string) => `${DOCUMENT_PREFIX}${canvasId}`;
export const canvasIdFromDocumentName = (name: string) =>
  name.startsWith(DOCUMENT_PREFIX) ? name.slice(DOCUMENT_PREFIX.length) : undefined;
/** Why the collaboration server refuses a canvas that was deleted (told to anyone who still has it open) */
export const CANVAS_DELETED_REASON = 'canvas-deleted';

export const shortId = () => crypto.randomUUID().slice(0, 8);

export const getCanvasMaps = (doc: Y.Doc) => ({
  nodes: doc.getMap<Node>('nodes'),
  edges: doc.getMap<Edge>('edges'),
  threads: doc.getMap<Y.Map<unknown>>('threads'),
  meta: doc.getMap<unknown>('meta'),
  /** Where things are on L1 and L2 (see LevelPlace), one entry per node and level (`1:<node id>`) */
  levelLayouts: doc.getMap<LevelPlace>('levelLayouts'),
});

/**
 * Where a node is on L1 or L2, as people arranged it there (or as the diagram it was opened from had it): its
 * top-left corner, relative to the container it's shown in on that level, and a container's size
 */
export type LevelPlace = { x: number; y: number; width?: number; height?: number };

/** The places on a level, by node id */
export const readLevelLayout = (doc: Y.Doc, level: 1 | 2) => {
  const prefix = `${level}:`;
  const places = new Map<string, LevelPlace>();
  getCanvasMaps(doc).levelLayouts.forEach((place, key) => {
    if (key.startsWith(prefix)) places.set(key.slice(prefix.length), place);
  });
  return places;
};

const samePlace = (a: LevelPlace | undefined, b: LevelPlace) =>
  !!a && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

/**
 * Puts nodes where they go on a level (in one transaction). Places that haven't changed aren't written: everyone
 * looking at the level works out the same places for what's new on it, and each write re-arranges the level for
 * everyone else.
 */
export const setLevelPlaces = (doc: Y.Doc, level: 1 | 2, places: ReadonlyMap<string, LevelPlace>) =>
  doc.transact(() => {
    const { levelLayouts } = getCanvasMaps(doc);
    places.forEach((place, id) => {
      const key = `${level}:${id}`;
      if (!samePlace(levelLayouts.get(key), place)) levelLayouts.set(key, place);
    });
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

/**
 * Moves a node, and resizes it if a size is given, in one write. Nodes are only written when they change: every
 * write is sent to everyone, re-renders the node for them, and is kept in the document (and the undo stack), even
 * when it writes what was already there.
 */
export const placeNode = (doc: Y.Doc, id: string, position: XYPosition, size?: { width: number; height: number }) => {
  const { nodes } = getCanvasMaps(doc);
  const node = nodes.get(id);
  if (!node) return false;
  const moved = node.position.x !== position.x || node.position.y !== position.y;
  const resized = !!size && (node.width !== size.width || node.height !== size.height);
  if (moved || resized) nodes.set(id, { ...node, position, ...(size && { width: size.width, height: size.height }) });
  return true;
};

export const moveNode = (doc: Y.Doc, id: string, position: XYPosition) => placeNode(doc, id, position);

/** Resize a node: both sides, or just its width or height (e.g. text, whose height follows what's in it) */
export const resizeNode = (
  doc: Y.Doc,
  id: string,
  size: { width: number; height: number },
  attributes: true | 'width' | 'height' = true
) => {
  const { nodes } = getCanvasMaps(doc);
  const node = nodes.get(id);
  const width = attributes !== 'height' && node?.width !== size.width;
  const height = attributes !== 'width' && node?.height !== size.height;
  if (node && (width || height))
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

/**
 * How a connection is drawn, as the visualiser's layout routes it (in data.route, which the visualiser's edges
 * are drawn along): the points it goes through, where its label goes, and where its nodes were (top-left) when
 * it was routed, for it to follow them when they move
 */
export type { EdgeRoute };

/** An edge's route, if it has one */
export const getEdgeRoute = (edge: Pick<Edge, 'data'>) => (edge.data as { route?: EdgeRoute } | undefined)?.route;

/** Routes connections (by edge id), in one transaction. Connections not in it lose any route they had. */
export const setEdgeRoutes = (doc: Y.Doc, routes: ReadonlyMap<string, EdgeRoute>) =>
  doc.transact(() => {
    const { edges } = getCanvasMaps(doc);
    edges.forEach((edge, id) => {
      const route = routes.get(id);
      if (route) edges.set(id, { ...edge, data: { ...edge.data, route } });
      else if (getEdgeRoute(edge)) {
        const { route: _, ...data } = edge.data!;
        edges.set(id, { ...edge, data });
      }
    });
  });

/**
 * What's on a canvas and how it's connected, not where: its nodes (not notes), what they're in and called, and its
 * connections. The same for the same canvas wherever it's worked out (the server, any browser).
 */
export const getStructureKey = (nodes: Node[], edges: Edge[]) => {
  const parts = [
    ...nodes
      .filter((node) => node.type !== 'note')
      .map((node) => `${node.id}:${node.type}:${node.parentId ?? ''}:${getNodeName(node.type, node.data)}`)
      .sort(),
    '#',
    ...edges.map((edge) => `${edge.source}>${edge.target}:${String(edge.label ?? '')}`).sort(),
  ];
  // FNV-1a, so it's short enough to keep in the canvas
  let hash = 0x811c9dc5;
  for (const char of parts.join('|')) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193);
  return `${parts.length}-${(hash >>> 0).toString(36)}`;
};

/** The diagram's L1 or L2 while the canvas still has the structure it was opened with (`structure`, its key now) */
export const getDiagramLevel = (levels: DiagramLevels | undefined, level: 1 | 2, structure: string) =>
  levels?.[level] && !levels.unavailable?.[level] && levels.structure === structure ? levels[level] : undefined;

/** Why the diagram doesn't have a level, while the canvas still has the structure it was opened with */
export const getDiagramLevelUnavailable = (levels: DiagramLevels | undefined, level: 1 | 2, structure: string) =>
  levels?.unavailable?.[level] && levels.structure === structure ? levels.unavailable[level] : undefined;

/** What a new canvas starts with: its nodes, the connections between them (by node id) with their routes, and the
 * levels of the diagram it's opened from */
export type CanvasContent = {
  nodes: Node[];
  connections: { from: string; to: string; label?: string; route?: Pick<EdgeRoute, 'points' | 'label'> }[];
  levels?: Pick<DiagramLevels, 1 | 2 | 'unavailable'>;
};

/**
 * Puts a new canvas's content on it (in one transaction), with its containers fitted to what's in them. Routes
 * are from where the nodes are put.
 */
export const addCanvasContent = (doc: Y.Doc, { nodes, connections, levels }: CanvasContent) =>
  doc.transact(() => {
    addNodes(doc, nodes);
    nodes.forEach((node) => node.parentId && fitContainersAround(doc, node.id));
    const placed = new Map(getCanvasMaps(doc).nodes.entries());
    const routes = new Map<string, EdgeRoute>();
    connections.forEach(({ from, to, label, route }) => {
      const edge = connectNodes(doc, { source: from, target: to }, label);
      const [source, target] = [placed.get(from), placed.get(to)];
      if (!route || 'error' in edge || !source || !target) return;
      routes.set(edge.id, {
        ...route,
        source: getAbsolutePosition(source, placed),
        target: getAbsolutePosition(target, placed),
      });
    });
    if (routes.size) setEdgeRoutes(doc, routes);
    if (levels) {
      const maps = getCanvasMaps(doc);
      const structure = getStructureKey(Array.from(maps.nodes.values()), Array.from(maps.edges.values()));
      setMeta(doc, { diagramLevels: { structure, ...levels } });
    }
  });

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
    const { nodes, edges, threads, levelLayouts } = getCanvasMaps(doc);
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
    removed.forEach((id) => {
      nodes.delete(id);
      // Where it was on L1 and L2 (undoing the delete puts it back there)
      levelLayouts.delete(`1:${id}`);
      levelLayouts.delete(`2:${id}`);
    });
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
