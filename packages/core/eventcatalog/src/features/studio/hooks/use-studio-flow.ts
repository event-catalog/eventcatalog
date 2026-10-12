import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { Awareness } from 'y-protocols/awareness';
import {
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type XYPosition,
} from '@xyflow/react';
import {
  addNodes,
  buildNode,
  connectNodes,
  deleteEdges,
  deleteNodes as deleteNodesInDoc,
  reconnectEdge,
  fitContainersAround,
  fitGroupToChildren,
  getCanvasMaps,
  moveNode,
  placeNode,
  changesNodesOrEdges,
  getStructureKey,
  getCanvasStatus,
  readMeta,
  reopenIfDecided,
  resizeNode,
  setCanvasStatus,
  setMeta,
  type Author,
  type CanvasStatus,
  type DiagramLevels,
  type LevelPlace,
  readLevelLayout,
  setLevelPlaces,
  type StatusChange,
  setNodeParents,
  type RenderedSizes,
  updateNodeData as updateNodeDataInDoc,
  keepDragged,
  LOCAL_EDGE_KEYS,
  LOCAL_NODE_KEYS,
  patchShared,
  withPositions,
  createSmoother,
  containerFor,
  toRelativePosition,
  type NodePreview,
  type LayoutResult,
  canGoInContainer,
  getNodeDefinition,
  isGroupType,
  createHotspot as createHotspotInDoc,
  updateHotspot as updateHotspotInDoc,
  deleteHotspot as deleteHotspotInDoc,
  readHotspots,
  getLock,
  setLock,
  type Hotspot,
  type Editing,
  addThreads,
  addHotspots,
  type ModelCanvasContent,
} from '@eventcatalog/visualiser/studio';
import { CANVAS_DELETED_REASON, canvasDocumentName } from '../document-name';
import { applyLayout } from '../agent-choreography';
import { startToolSync, type ToolSync } from '../tool-sync';
import { createPresenceSender, type PresenceSender } from './presence-sender';
import { createPresenceStore, type PresenceStore } from './presence-store';

export type { Peer } from './presence-store';

/** How long the WebSocket gets to connect before a view that can sync through tool calls switches to them */
const SOCKET_TIMEOUT_MS = 4000;
/**
 * After someone drops what they were dragging, how long until it goes back to where the document has it, if the
 * drop doesn't arrive (they left mid-drag). The drop normally arrives first, or within a few milliseconds.
 */
const DROP_SETTLE_MS = 500;

/**
 * Changes made here that are already shown here (nodes dragged and resized with React Flow): the document
 * observers skip them, and undo includes them
 */
const LOCAL_ORIGIN = Symbol('studio-local');
/** Changes an agent working through this tab (WebMCP) makes: synced like anyone's, and not in the user's undo */
export const BROWSER_AGENT_ORIGIN = Symbol('studio-browser-agent');
/** Status changes: synced, but not undone (undo takes back edits, not decisions about the canvas) */
const STATUS_ORIGIN = Symbol('studio-status');
/** A diagram file opened into a new canvas: what it starts with, synced, not undone (nothing to go back to) */
const OPEN_ORIGIN = Symbol('studio-open');
/** Where L1 and L2 put what's new on them, kept so it stays there: synced, not undone (nobody did it) */
const LEVEL_PLACEMENT_ORIGIN = Symbol('studio-level-placement');

const NO_LEVEL_LAYOUTS = { 1: new Map(), 2: new Map() } as const;
/** What someone changing a note or text shows the others as they change it (see `editing` in their presence) */
const EDITED_FIELDS = ['text', 'fontSize', 'angle'] as const;

export type Status = 'connecting' | 'connected' | 'disconnected';
export type Transport = 'websocket' | 'tools';

type Shared = { doc: Y.Doc; awareness: Awareness; undoManager: Y.UndoManager; sender: PresenceSender };

/**
 * A React Flow design kept in a Yjs document (one map of nodes, one of edges), synced through Hocuspocus.
 * Presence (who is here, their pointer and what they have selected) goes over Yjs awareness, in a store
 * (see presence-store) rather than React state.
 *
 * Nodes being dragged go to everyone with our presence (with the pointer, about 30 times a second), and only
 * where they're dropped is saved in the document: one change per drag, so the document doesn't grow with every
 * step of every drag, and undo takes back the whole drag. Others show where we're dragging them as we do.
 */
const NEW_CANVAS_STATUS = { status: 'draft' as CanvasStatus, history: [] as StatusChange[] };

export function useStudioFlow({
  canvasId,
  socketUrl,
  name,
  color,
  picture,
  agent,
  syncViaTools,
  onLayout,
  onContainerResize,
}: {
  canvasId: string;
  /** e.g. wss://catalog.example.com/_eventcatalog/studio */
  socketUrl: string;
  name: string;
  color: string;
  /** From your sign-in provider, when you're signed in */
  picture?: string;
  /** You're an AI agent here (e.g. a chat's canvas view, which joins as the chat's agent) */
  agent?: boolean;
  /** Sync through MCP tool calls when the WebSocket can't connect (e.g. inside a chat's sandbox) */
  syncViaTools?: ToolSync;
  /** Someone laid the canvas out (us included): called as the new positions arrive, so they can glide there */
  onLayout?: () => void;
  /**
   * A container changed size (it grew to fit what's in it, or someone else resized it): called as it arrives, so
   * it can grow smoothly. Not for our own resizing, which follows the pointer.
   */
  onContainerResize?: () => void;
}) {
  const sharedRef = useRef<Shared | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [status, setStatus] = useState<Status>('connecting');
  const [presence, setPresence] = useState<PresenceStore | null>(null);
  const [clientId, setClientId] = useState<number | null>(null);
  // Exposed so other shared state (e.g. comments) can live in the same document
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [history, setHistory] = useState({ canUndo: false, canRedo: false });
  const [title, setTitle] = useState<string | undefined>();
  // L1 and L2 of the diagram the canvas was opened from, if it was
  const [diagramLevels, setDiagramLevels] = useState<DiagramLevels | undefined>();
  // What's on the canvas and how it's connected (getStructureKey): worked out when the document's nodes or edges
  // change, which drags don't do (they're in presence until the drop)
  const [structureKey, setStructureKey] = useState('');
  // Where things are on L1 and L2, as people arranged them
  const [levelLayouts, setLevelLayouts] = useState<Record<1 | 2, ReadonlyMap<string, LevelPlace>>>(NO_LEVEL_LAYOUTS);
  const [canvasStatus, setCanvasStatusState] = useState<{ status: CanvasStatus; history: StatusChange[] }>(NEW_CANVAS_STATUS);
  const [transport, setTransport] = useState<Transport>('websocket');
  // Someone deleted the canvas: the server closed it for everyone, and won't open it again
  const [deleted, setDeleted] = useState(false);
  // What's flagged on the canvas (risks, problems, the key parts), on nodes or at places
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  // Who locked the canvas (for everyone on it), if it's locked
  const [lockedBy, setLockedBy] = useState<string | null>(null);
  // The server's copy of the canvas has arrived (what's on it is known, e.g. that it's empty)
  const [synced, setSynced] = useState(false);
  const user = useRef<Author>({ name, color });
  user.current = { name, color, ...(picture && { picture }), ...(agent && { agent }) };
  const onLayoutRef = useRef(onLayout);
  onLayoutRef.current = onLayout;
  const onContainerResizeRef = useRef(onContainerResize);
  onContainerResizeRef.current = onContainerResize;

  useEffect(() => {
    // A new connection starts from what the server has. Clear anything left from a previous one,
    // since an empty document never fires an update that would remove it.
    setNodes([]);
    setEdges([]);

    const doc = new Y.Doc();
    const {
      nodes: yNodes,
      edges: yEdges,
      threads: yThreads,
      meta: yMeta,
      levelLayouts: yLevelLayouts,
      hotspots: yHotspots,
    } = getCanvasMaps(doc);
    const syncLevelLayouts = (event: Y.YMapEvent<LevelPlace>) => {
      const changed = new Set([...event.keysChanged].map((key) => Number(key.split(':')[0]) as 1 | 2));
      setLevelLayouts((current) => {
        const next = { ...current };
        changed.forEach((level) => (next[level] = readLevelLayout(doc, level)));
        return next;
      });
    };
    yLevelLayouts.observe(syncLevelLayouts);
    setLevelLayouts(NO_LEVEL_LAYOUTS);
    const syncMeta = (event: Y.YMapEvent<unknown>) => {
      const meta = readMeta(doc);
      setTitle(meta.title);
      if (event.keysChanged.has('diagramLevels')) setDiagramLevels(meta.diagramLevels);
      if (event.keysChanged.has('status') || event.keysChanged.has('statusHistory'))
        setCanvasStatusState({ status: getCanvasStatus(meta), history: meta.statusHistory ?? [] });
      if (event.keysChanged.has('layoutAt')) onLayoutRef.current?.();
      if (event.keysChanged.has('lockedBy')) setLockedBy(getLock(doc));
    };
    yMeta.observe(syncMeta);
    setLockedBy(null);
    const syncHotspots = () => setHotspots(readHotspots(doc));
    yHotspots.observe(syncHotspots);
    setHotspots([]);
    setTitle(undefined);
    setStructureKey('');
    setDiagramLevels(undefined);
    setCanvasStatusState(NEW_CANVAS_STATUS);
    // Changing an accepted (or rejected) canvas here makes it a draft again, for everyone. Changes from others arrive
    // already reopened by whoever made them.
    const reopenOnEdit = (transaction: Y.Transaction) => {
      if (!transaction.local || transaction.origin === STATUS_ORIGIN) return;
      if (!changesNodesOrEdges(transaction)) return;
      // Recorded against whoever changed it: this person, or their agent in the browser (WebMCP)
      const by =
        transaction.origin === BROWSER_AGENT_ORIGIN
          ? { name: `${user.current.name}'s agent`, color: user.current.color, agent: true }
          : user.current;
      queueMicrotask(() =>
        doc.transact(() => {
          reopenIfDecided(doc, by);
          // The first thing put on a canvas started it (opening a new one to look around doesn't)
          if (!readMeta(doc).createdAt) setMeta(doc, { createdAt: Date.now(), createdBy: by.name });
        }, STATUS_ORIGIN)
      );
    };
    doc.on('afterTransaction', reopenOnEdit);
    const syncStructure = (transaction: Y.Transaction) => {
      // Drops and resizes here only move and size things (putting something in a container isn't LOCAL_ORIGIN)
      if (transaction.origin !== LOCAL_ORIGIN && changesNodesOrEdges(transaction))
        setStructureKey(getStructureKey(Array.from(yNodes.values()), Array.from(yEdges.values())));
    };
    doc.on('afterTransaction', syncStructure);
    // One presence for whichever connection is used
    const awareness = new Awareness(doc);
    awareness.setLocalStateField('user', user.current);
    const presenceStore = createPresenceStore(awareness);
    setPresence(presenceStore);
    const sender = createPresenceSender(awareness);
    // Let in by the server, not just open: with sign-in on, it refuses a socket without a session after it opens.
    // `letIn` is for this connection; `socketConnected` stays once the socket has worked (no falling back after).
    let socketConnected = false;
    let letIn = false;
    let stopToolSync: (() => void) | undefined;
    let fallback: ReturnType<typeof setTimeout> | undefined;
    // Declared before the provider: it reports its first status while it's being created
    let socketStatus: Status = 'connecting';
    let canvasDeleted = false;
    const onCanvasDeleted = () => {
      canvasDeleted = true;
      clearTimeout(fallback);
      stopToolSync?.();
      provider.disconnect();
      setDeleted(true);
      setStatus('disconnected');
    };
    // Some views can't use the WebSocket (a chat's sandbox may block it, or open it without the person's session):
    // sync through tool calls instead
    const syncThroughTools = () => {
      if (!syncViaTools || stopToolSync) return;
      clearTimeout(fallback);
      setTransport('tools');
      stopToolSync = startToolSync(doc, awareness, { canvasId, sync: syncViaTools, onStatus: setStatus });
      // After the tools take over, so the socket closing doesn't show as offline for a moment
      provider.disconnect();
    };
    const provider = new HocuspocusProvider({
      url: socketUrl,
      name: canvasDocumentName(canvasId),
      document: doc,
      awareness,
      onStatus: ({ status }) => {
        socketStatus = status as Status;
        if (status !== 'connected') letIn = false;
        // Open isn't connected until the server lets us in (onAuthenticated)
        if (!stopToolSync) setStatus(status === 'connected' && !letIn ? 'connecting' : (status as Status));
      },
      onSynced: ({ state }) => setSynced(state),
      onAuthenticated: () => {
        socketConnected = letIn = true;
        if (!stopToolSync) setStatus('connected');
      },
      // Deleted while it was open here
      onClose: ({ event }) => {
        if (event.reason === CANVAS_DELETED_REASON) onCanvasDeleted();
      },
      // Not signed in (or the session ran out): a chat's view syncs through its tools, a page shows it's offline
      // (coming back to the tab tries again, e.g. after signing in again elsewhere). Or the canvas was deleted.
      onAuthenticationFailed: ({ reason }) => {
        if (reason === CANVAS_DELETED_REASON) return onCanvasDeleted();
        if (syncViaTools) return syncThroughTools();
        provider.disconnect();
        setStatus('disconnected');
      },
    });
    setTransport('websocket');
    setDeleted(false);
    setSynced(false);

    // Back online, or back on the tab: reconnect now rather than when the next retry is due
    const reconnect = () => {
      if (!stopToolSync && !canvasDeleted && socketStatus === 'disconnected') void provider.connect();
    };
    // Away from the tab: our pointer goes from everyone's canvas
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') return reconnect();
      sender.send({ pointer: null });
      sender.flush();
    };
    window.addEventListener('online', reconnect);
    document.addEventListener('visibilitychange', onVisibilityChange);

    // A socket that isn't let in within a few seconds (blocked, or never answered) is given up for tool calls
    if (syncViaTools) fallback = setTimeout(() => !socketConnected && syncThroughTools(), SOCKET_TIMEOUT_MS);
    // Undo only takes back your own changes: other people's arrive with the provider as origin, agents' with theirs
    const undoManager = new Y.UndoManager([yNodes, yEdges, yThreads, yLevelLayouts, yHotspots], {
      captureTimeout: 500,
      trackedOrigins: new Set([null, LOCAL_ORIGIN]),
    });
    const updateHistory = () =>
      setHistory({ canUndo: undoManager.undoStack.length > 0, canRedo: undoManager.redoStack.length > 0 });
    undoManager.on('stack-item-added', updateHistory);
    undoManager.on('stack-item-popped', updateHistory);
    undoManager.on('stack-cleared', updateHistory);
    setHistory({ canUndo: false, canRedo: false });
    sharedRef.current = { doc, awareness, undoManager, sender };
    setClientId(doc.clientID);
    setDoc(doc);

    // Where others are dragging nodes, from their presence, until they drop them
    let remoteMoves = new Map<string, XYPosition>();
    const settling = new Set<ReturnType<typeof setTimeout>>();
    // Shown gliding, a step a frame: at most one update a frame however many people drag (each presence arriving
    // was an update of its own: ~5 a frame with 7 people dragging), and smooth between their ~30 updates a second.
    // Not what's been dropped since (its drop is in the document, see syncNodes).
    const glide = createSmoother((shown) => {
      const moved = new Map([...shown].filter(([id]) => remoteMoves.has(id)));
      if (moved.size) setNodes((local) => withPositions(local, moved));
    });
    const syncMoves = (_: unknown, origin: unknown) => {
      if (origin === 'local') return;
      const next = new Map<string, XYPosition>();
      awareness.getStates().forEach((state, id) => {
        if (id === doc.clientID || !state.moving) return;
        Object.entries(state.moving as Record<string, XYPosition>).forEach(([nodeId, position]) => next.set(nodeId, position));
      });
      const moved = [...next].some(([id, { x, y }]) => remoteMoves.get(id)?.x !== x || remoteMoves.get(id)?.y !== y);
      const dropped = [...remoteMoves.keys()].filter((id) => !next.has(id));
      remoteMoves = next;
      if (moved || dropped.length) glide.set(next);
      if (dropped.length === 0) return;
      // The drop is saved in the document. If it doesn't arrive, back to where the document has it.
      const settle = setTimeout(() => {
        settling.delete(settle);
        const saved = dropped.flatMap((id) => {
          const node = remoteMoves.has(id) ? undefined : yNodes.get(id);
          return node ? [[id, node.position] as const] : [];
        });
        setNodes((local) => withPositions(local, new Map(saved)));
      }, DROP_SETTLE_MS);
      settling.add(settle);
    };
    awareness.on('change', syncMoves);

    // What others are writing on notes and text, and how they're scaling and turning text, as they do it (from their
    // presence): shown on just those nodes, and back to what the document has when they're done (their result is
    // written to the document before their presence is cleared, so it doesn't go back in between)
    let remoteEdits = '';
    let remoteEdited = new Set<string>();
    const syncEdits = (_: unknown, origin: unknown) => {
      if (origin === 'local') return;
      const edits = new Map<string, Record<string, unknown>>();
      awareness.getStates().forEach((state, id) => {
        const editing = state.editing as Editing | null | undefined;
        if (id === doc.clientID || !editing?.id) return;
        const { id: nodeId, ...fields } = editing;
        edits.set(nodeId, fields);
      });
      const key = JSON.stringify([...edits]);
      if (key === remoteEdits) return;
      remoteEdits = key;
      const before = remoteEdited;
      remoteEdited = new Set(edits.keys());
      setNodes((local) => {
        let next: Node[] | undefined;
        local.forEach((node, index) => {
          const edit = edits.get(node.id);
          const savedData = before.has(node.id) ? yNodes.get(node.id)?.data : undefined;
          const changes = edit ?? (savedData && Object.fromEntries(EDITED_FIELDS.map((field) => [field, savedData[field]])));
          if (!changes || Object.entries(changes).every(([field, value]) => node.data[field] === value)) return;
          next ??= [...local];
          next[index] = { ...node, data: { ...node.data, ...changes } };
        });
        return next ?? local;
      });
    };
    awareness.on('change', syncEdits);

    // Only what changed is replaced, so React Flow re-renders just those nodes
    const syncNodes = (event: Y.YMapEvent<Node>) => {
      if (event.transaction.origin === LOCAL_ORIGIN) return;
      // A node someone was dragging changed in the document: they dropped it there
      event.keysChanged.forEach((id) => remoteMoves.delete(id));
      const containerResized = [...event.changes.keys].some(([id, change]) => {
        const next = yNodes.get(id);
        const previous = change.oldValue as Node | undefined;
        return (
          change.action === 'update' &&
          isGroupType(next?.type) &&
          (next?.width !== previous?.width || next?.height !== previous?.height)
        );
      });
      if (containerResized) onContainerResizeRef.current?.();
      setNodes((local) =>
        keepDragged(
          patchShared(local, event.keysChanged, (id) => yNodes.get(id), LOCAL_NODE_KEYS),
          local
        )
      );
    };
    const syncEdges = (event: Y.YMapEvent<Edge>) => {
      if (event.transaction.origin === LOCAL_ORIGIN) return;
      setEdges((local) => patchShared(local, event.keysChanged, (id) => yEdges.get(id), LOCAL_EDGE_KEYS));
    };
    yNodes.observe(syncNodes);
    yEdges.observe(syncEdges);

    return () => {
      clearTimeout(fallback);
      settling.forEach(clearTimeout);
      window.removeEventListener('online', reconnect);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      awareness.off('change', syncMoves);
      awareness.off('change', syncEdits);
      glide.stop();
      sender.destroy();
      stopToolSync?.();
      yNodes.unobserve(syncNodes);
      yLevelLayouts.unobserve(syncLevelLayouts);
      yEdges.unobserve(syncEdges);
      yMeta.unobserve(syncMeta);
      yHotspots.unobserve(syncHotspots);
      doc.off('afterTransaction', reopenOnEdit);
      doc.off('afterTransaction', syncStructure);
      presenceStore.destroy();
      undoManager.destroy();
      provider.destroy();
      doc.destroy();
      sharedRef.current = null;
      setDoc(null);
      setPresence(null);
    };
  }, [canvasId, socketUrl, syncViaTools]);

  useEffect(() => {
    sharedRef.current?.awareness.setLocalStateField('user', user.current);
  }, [name, color, picture]);

  // Tell others what we have selected so they can see it
  const selectionKey = useMemo(
    () =>
      nodes
        .filter((node) => node.selected)
        .map((node) => node.id)
        .join(','),
    [nodes]
  );
  useEffect(() => {
    sharedRef.current?.sender.send({ selection: selectionKey ? selectionKey.split(',') : [] });
  }, [selectionKey]);

  // The sizes nodes are rendered at here, for fitting containers to what's in them
  const latestNodes = useRef(nodes);
  latestNodes.current = nodes;
  const renderedSizes = (): RenderedSizes =>
    new Map(
      latestNodes.current.flatMap((node) =>
        node.measured?.width && node.measured.height
          ? [[node.id, { width: node.measured.width, height: node.measured.height }] as const]
          : []
      )
    );

  const withDoc = <T>(fn: (doc: Y.Doc) => T, origin: unknown = null) => {
    const doc = sharedRef.current?.doc;
    return doc ? doc.transact(() => fn(doc), origin) : undefined;
  };

  // Where the nodes being dragged are, until they're dropped, and the containers around them as they've grown
  const dragged = useRef(new Map<string, XYPosition>());
  const dragPreview = useRef(new Map<string, NodePreview>());
  /** Saves where dragged nodes were dropped (in the transaction it's called in), and stops showing them as dragged */
  const saveDrop = (doc: Y.Doc) => {
    dragged.current.forEach((position, id) => moveNode(doc, id, position));
    // Containers as they grew around what was dragged, and what else is in them (moved the other way if they grew up
    // or left). Dragged nodes are where React Flow dropped them, already in their containers' grown coordinates.
    // Only what actually moved or grew is written (the preview has everything in those containers)
    dragPreview.current.forEach(({ position, width, height }, id) =>
      placeNode(doc, id, position, width !== undefined && height !== undefined ? { width, height } : undefined)
    );
    dragPreview.current = new Map();
    dragged.current.clear();
    const shared = sharedRef.current;
    shared?.sender.send({ moving: null });
    // After the drop is in the document (it's sent as the transaction ends)
    queueMicrotask(() => shared?.sender.flush());
  };

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((local) => applyNodeChanges(changes, local));
    let dropped = false;
    const resized: { id: string; dimensions: { width: number; height: number }; attributes: true | 'width' | 'height' }[] = [];
    const resizeEnded: string[] = [];
    for (const change of changes) {
      if (change.type === 'position' && change.position) {
        dragged.current.set(change.id, change.position);
        if (!change.dragging) dropped = true;
      }
      // Containers resized with their handles
      if (change.type === 'dimensions' && change.setAttributes && change.dimensions)
        resized.push({ id: change.id, dimensions: change.dimensions, attributes: change.setAttributes });
      if (change.type === 'dimensions' && change.resizing === false) resizeEnded.push(change.id);
    }
    // While dragging, nodes move here every frame and go to everyone with our presence; where they're dropped is saved
    if (dropped) {
      // Each drag is its own step to undo
      sharedRef.current?.undoManager.stopCapturing();
      withDoc(saveDrop, LOCAL_ORIGIN);
    } else if (dragged.current.size) sharedRef.current?.sender.send({ moving: Object.fromEntries(dragged.current) });
    if (resized.length)
      withDoc(
        (doc) => resized.forEach(({ id, dimensions, attributes }) => resizeNode(doc, id, dimensions, attributes)),
        LOCAL_ORIGIN
      );
    // Resized inside a container (e.g. a system in a domain): the containers around it grow to fit it. Not as
    // LOCAL_ORIGIN, so they grow here too.
    if (resizeEnded.length) withDoc((doc) => resizeEnded.forEach((id) => fitContainersAround(doc, id, renderedSizes())));
    // Removing a node also removes what's in it, its edges, and moves its comments: those come back through the observers
    const removed = changes.filter((change) => change.type === 'remove').map((change) => change.id);
    if (removed.length) withDoc((doc) => deleteNodesInDoc(doc, removed));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((local) => applyEdgeChanges(changes, local));
    const removed = changes.filter((change) => change.type === 'remove').map((change) => change.id);
    if (removed.length) withDoc((doc) => deleteEdges(doc, removed));
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    withDoc((doc) => connectNodes(doc, connection));
  }, []);

  /** A connection's end dragged to another node */
  const onReconnect = useCallback((edge: Edge, connection: Connection) => {
    withDoc((doc) => reconnectEdge(doc, edge.id, connection));
  }, []);

  /**
   * Containers growing while something's dragged in them, and what's in them, shown here only until it's dropped
   * (see previewContainerGrowth). The drop saves them as shown, in the same change.
   */
  const showDragPreview = useCallback((previews: Map<string, NodePreview>) => {
    dragPreview.current = previews;
    setNodes((local) => {
      let next: Node[] | undefined;
      local.forEach((node, index) => {
        const preview = previews.get(node.id);
        if (
          !preview ||
          (node.position.x === preview.position.x &&
            node.position.y === preview.position.y &&
            (preview.width === undefined || (node.width === preview.width && node.height === preview.height)))
        )
          return;
        next ??= [...local];
        next[index] = { ...node, ...preview };
      });
      return next ?? local;
    });
  }, []);

  /**
   * Add a node centred on a canvas position. `connect` gets the new node's id and the nodes already
   * on the canvas, and returns edges to add with it (e.g. a catalog resource's relationships).
   */
  const insertNode = useCallback(
    (
      type: string,
      data: Record<string, unknown>,
      center: XYPosition,
      connect?: (id: string, existing: Node[]) => Edge[],
      inside?: string
    ) => {
      const built = buildNode(type, data, center);
      withDoc((doc) => {
        const existing = Array.from(getCanvasMaps(doc).nodes.values());
        // In the container asked for, else the one it's dropped on
        const group = canGoInContainer(type) ? containerFor(center, existing, inside) : undefined;
        const node = group
          ? { ...built, parentId: group.id, position: toRelativePosition(built.position, group.id, existing) }
          : built;
        addNodes(doc, [node], connect?.(node.id, existing) ?? []);
        if (group) fitGroupToChildren(doc, group.id, renderedSizes());
      });
      return built.id;
    },
    []
  );

  /** Add a node of a component (its type, or its key in the components list), centred on a canvas position (in a container, if asked) */
  const addNode = useCallback(
    (component: string, center: XYPosition, inside?: string) => {
      const definition = getNodeDefinition(component);
      return definition ? insertNode(definition.type, definition.createData(), center, undefined, inside) : undefined;
    },
    [insertNode]
  );

  const updateNodeData = useCallback(
    (id: string, updater: (data: Record<string, unknown>) => Record<string, unknown>) =>
      withDoc((doc) => updateNodeDataInDoc(doc, id, updater)),
    []
  );

  const deleteNodes = useCallback((ids: string[]) => withDoc((doc) => deleteNodesInDoc(doc, ids)), []);

  /** Moves nodes (and resizes containers) from a layout in one change, so it undoes in one go */
  const applyPositions = useCallback((layout: LayoutResult) => withDoc((doc) => applyLayout(doc, layout)), []);
  /** Puts things where they go on L1 or L2: moved there by someone (undone like any edit), or placed by the level */
  const setLevelLayout = useCallback(
    (level: 1 | 2, places: ReadonlyMap<string, LevelPlace>, by: 'person' | 'level' = 'person') =>
      withDoc((doc) => setLevelPlaces(doc, level, places), by === 'level' ? LEVEL_PLACEMENT_ORIGIN : null),
    []
  );

  /** Adds ready-made nodes and edges (e.g. a container with what's in it) in one change */
  const insertNodes = useCallback(
    (nodes: Node[], edges: Edge[] = []) =>
      withDoc((doc) => {
        addNodes(doc, nodes, edges);
        // Containers already on the canvas that got something new inside grow to fit it
        const added = new Set(nodes.map((node) => node.id));
        new Set(nodes.flatMap((node) => (node.parentId && !added.has(node.parentId) ? [node.parentId] : []))).forEach((groupId) =>
          fitGroupToChildren(doc, groupId, renderedSizes())
        );
      }),
    []
  );

  /** Puts nodes in containers (or takes them out) together, e.g. a selection dropped in one, as one change */
  const setParents = useCallback(
    (moves: { id: string; parentId: string | undefined; at?: XYPosition }[]) =>
      withDoc((doc) => {
        if (dragged.current.size) saveDrop(doc);
        return setNodeParents(doc, moves, renderedSizes());
      }),
    []
  );

  /** Changes the canvas's status for everyone (recorded with who did it, and why if given) */
  const changeStatus = useCallback(
    (status: CanvasStatus, note?: string) => withDoc((doc) => setCanvasStatus(doc, status, user.current, note), STATUS_ORIGIN),
    []
  );
  const rename = useCallback((next: string) => withDoc((doc) => setMeta(doc, { title: next || undefined })), []);

  const undo = useCallback(() => sharedRef.current?.undoManager.undo(), []);
  const redo = useCallback(() => sharedRef.current?.undoManager.redo(), []);

  /** Our pointer on the canvas, for everyone (sent about 30 times a second, so call it on every move) */
  const setPointer = useCallback((pointer: XYPosition | null) => {
    sharedRef.current?.sender.send({ pointer });
  }, []);

  const setViewport = useCallback((viewport: { x: number; y: number; zoom: number }) => {
    sharedRef.current?.sender.send({ viewport });
  }, []);

  /**
   * The note or text being changed here, as it changes (what's written, a text's size and angle), for the others to
   * see as it happens; `null` when done (after the result is saved), sent straight away
   */
  const sendEditing = useCallback((editing: Editing | null) => {
    const sender = sharedRef.current?.sender;
    if (!sender) return;
    sender.send({ editing: editing && { ...editing, ...(editing.text !== undefined && { text: editing.text.slice(0, 2000) }) } });
    if (!editing) sender.flush();
  }, []);

  /**
   * What a diagram file opened into this (new) canvas starts with: its nodes and connections, comments, hotspots and
   * where things are on L1 and L2, in one change that isn't undone
   */
  const addContent = useCallback(
    (content: ModelCanvasContent) =>
      withDoc((doc) => {
        addNodes(doc, content.nodes, content.edges);
        if (content.threads?.length) addThreads(doc, content.threads);
        if (content.hotspots?.length) addHotspots(doc, content.hotspots);
        setLevelPlaces(doc, 1, content.levelLayouts[1]);
        setLevelPlaces(doc, 2, content.levelLayouts[2]);
      }, OPEN_ORIGIN),
    []
  );

  // ---- Hotspots and the lock ----

  const createHotspot = useCallback(
    (hotspot: Omit<Hotspot, 'id' | 'createdAt'>) => withDoc((doc) => createHotspotInDoc(doc, hotspot)),
    []
  );
  const updateHotspot = useCallback(
    (id: string, fields: Parameters<typeof updateHotspotInDoc>[2]) => withDoc((doc) => updateHotspotInDoc(doc, id, fields)),
    []
  );
  const deleteHotspot = useCallback((id: string) => withDoc((doc) => deleteHotspotInDoc(doc, id)), []);
  /** Locks the canvas for everyone (by a name), or unlocks it (null): looked at, not changed */
  const setLocked = useCallback((by: string | null) => withDoc((doc) => setLock(doc, by), STATUS_ORIGIN), []);

  return {
    nodes,
    edges,
    status,
    presence,
    clientId,
    doc,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onReconnect,
    showDragPreview,
    addNode,
    insertNode,
    updateNodeData,
    deleteNodes,
    applyPositions,
    levelLayouts,
    setLevelLayout,
    insertNodes,
    setParents,
    title,
    diagramLevels,
    structureKey,
    rename,
    canvasStatus,
    changeStatus,
    transport,
    deleted,
    hotspots,
    createHotspot,
    updateHotspot,
    deleteHotspot,
    lockedBy,
    setLocked,
    sendEditing,
    synced,
    addContent,
    undo,
    redo,
    ...history,
    setPointer,
    setViewport,
  };
}
