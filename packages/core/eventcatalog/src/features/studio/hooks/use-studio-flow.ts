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
  canvasDocumentName,
  connectNodes,
  deleteEdges,
  deleteNodes as deleteNodesInDoc,
  fitGroupToChildren,
  getCanvasMaps,
  moveNode,
  readMeta,
  resizeNode,
  setMeta,
  setNodeParent,
  updateNodeData as updateNodeDataInDoc,
} from '../canvas-doc';
import { applyLayout } from '../agent-choreography';
import { keepDragged, LOCAL_EDGE_KEYS, LOCAL_NODE_KEYS, patchShared, withPositions } from '../flow-state';
import { findGroupAtPoint, toRelativePosition } from '../grouping';
import type { LayoutResult } from '../layout';
import { getNodeDefinition } from '../node-types';
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
export function useStudioFlow({
  canvasId,
  socketUrl,
  name,
  color,
  syncViaTools,
  onLayout,
}: {
  canvasId: string;
  /** e.g. wss://catalog.example.com/_eventcatalog/studio */
  socketUrl: string;
  name: string;
  color: string;
  /** Sync through MCP tool calls when the WebSocket can't connect (e.g. inside a chat's sandbox) */
  syncViaTools?: ToolSync;
  /** Someone laid the canvas out (us included): called as the new positions arrive, so they can glide there */
  onLayout?: () => void;
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
  const [transport, setTransport] = useState<Transport>('websocket');
  const user = useRef({ name, color });
  user.current = { name, color };
  const onLayoutRef = useRef(onLayout);
  onLayoutRef.current = onLayout;

  useEffect(() => {
    // A new connection starts from what the server has. Clear anything left from a previous one,
    // since an empty document never fires an update that would remove it.
    setNodes([]);
    setEdges([]);

    const doc = new Y.Doc();
    const { nodes: yNodes, edges: yEdges, threads: yThreads, meta: yMeta } = getCanvasMaps(doc);
    const syncMeta = (event: Y.YMapEvent<unknown>) => {
      setTitle(readMeta(doc).title);
      if (event.keysChanged.has('layoutAt')) onLayoutRef.current?.();
    };
    yMeta.observe(syncMeta);
    setTitle(undefined);
    // One presence for whichever connection is used
    const awareness = new Awareness(doc);
    awareness.setLocalStateField('user', user.current);
    const presenceStore = createPresenceStore(awareness);
    setPresence(presenceStore);
    const sender = createPresenceSender(awareness);
    let socketConnected = false;
    let stopToolSync: (() => void) | undefined;
    const provider = new HocuspocusProvider({
      url: socketUrl,
      name: canvasDocumentName(canvasId),
      document: doc,
      awareness,
      onStatus: ({ status }) => {
        if (status === 'connected') socketConnected = true;
        socketStatus = status as Status;
        if (!stopToolSync) setStatus(status as Status);
      },
    });
    let socketStatus: Status = 'connecting';
    setTransport('websocket');

    // Back online, or back on the tab: reconnect now rather than when the next retry is due
    const reconnect = () => {
      if (!stopToolSync && socketStatus === 'disconnected') void provider.connect();
    };
    // Away from the tab: our pointer goes from everyone's canvas
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') return reconnect();
      sender.send({ pointer: null });
      sender.flush();
    };
    window.addEventListener('online', reconnect);
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Some views can't open the WebSocket (a chat's sandbox may block it): sync through tool calls instead
    const fallback = syncViaTools
      ? setTimeout(() => {
          if (socketConnected) return;
          provider.disconnect();
          setTransport('tools');
          stopToolSync = startToolSync(doc, awareness, { canvasId, sync: syncViaTools, onStatus: setStatus });
        }, SOCKET_TIMEOUT_MS)
      : undefined;
    // Undo only takes back your own changes: other people's arrive with the provider as origin, agents' with theirs
    const undoManager = new Y.UndoManager([yNodes, yEdges, yThreads], {
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
    const syncMoves = (_: unknown, origin: unknown) => {
      if (origin === 'local') return;
      const next = new Map<string, XYPosition>();
      awareness.getStates().forEach((state, id) => {
        if (id === doc.clientID || !state.moving) return;
        Object.entries(state.moving as Record<string, XYPosition>).forEach(([nodeId, position]) => next.set(nodeId, position));
      });
      const moved = new Map([...next].filter(([id, { x, y }]) => remoteMoves.get(id)?.x !== x || remoteMoves.get(id)?.y !== y));
      const dropped = [...remoteMoves.keys()].filter((id) => !next.has(id));
      remoteMoves = next;
      if (moved.size) setNodes((local) => withPositions(local, moved));
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

    // Only what changed is replaced, so React Flow re-renders just those nodes
    const syncNodes = (event: Y.YMapEvent<Node>) => {
      if (event.transaction.origin === LOCAL_ORIGIN) return;
      // A node someone was dragging changed in the document: they dropped it there
      event.keysChanged.forEach((id) => remoteMoves.delete(id));
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
      sender.destroy();
      stopToolSync?.();
      yNodes.unobserve(syncNodes);
      yEdges.unobserve(syncEdges);
      yMeta.unobserve(syncMeta);
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
    sharedRef.current?.awareness.setLocalStateField('user', { name, color });
  }, [name, color]);

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

  const withDoc = <T>(fn: (doc: Y.Doc) => T, origin: unknown = null) => {
    const doc = sharedRef.current?.doc;
    return doc ? doc.transact(() => fn(doc), origin) : undefined;
  };

  // Where the nodes being dragged are, until they're dropped
  const dragged = useRef(new Map<string, XYPosition>());
  /** Saves where dragged nodes were dropped (in the transaction it's called in), and stops showing them as dragged */
  const saveDrop = (doc: Y.Doc) => {
    dragged.current.forEach((position, id) => moveNode(doc, id, position));
    dragged.current.clear();
    const shared = sharedRef.current;
    shared?.sender.send({ moving: null });
    // After the drop is in the document (it's sent as the transaction ends)
    queueMicrotask(() => shared?.sender.flush());
  };

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((local) => applyNodeChanges(changes, local));
    let dropped = false;
    const resized: { id: string; dimensions: { width: number; height: number } }[] = [];
    for (const change of changes) {
      if (change.type === 'position' && change.position) {
        dragged.current.set(change.id, change.position);
        if (!change.dragging) dropped = true;
      }
      // Containers resized with their handles
      if (change.type === 'dimensions' && change.setAttributes && change.dimensions)
        resized.push({ id: change.id, dimensions: change.dimensions });
    }
    // While dragging, nodes move here every frame and go to everyone with our presence; where they're dropped is saved
    if (dropped) {
      // Each drag is its own step to undo
      sharedRef.current?.undoManager.stopCapturing();
      withDoc(saveDrop, LOCAL_ORIGIN);
    } else if (dragged.current.size) sharedRef.current?.sender.send({ moving: Object.fromEntries(dragged.current) });
    if (resized.length) withDoc((doc) => resized.forEach(({ id, dimensions }) => resizeNode(doc, id, dimensions)), LOCAL_ORIGIN);
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

  /**
   * Add a node centred on a canvas position. `connect` gets the new node's id and the nodes already
   * on the canvas, and returns edges to add with it (e.g. a catalog resource's relationships).
   */
  const insertNode = useCallback(
    (type: string, data: Record<string, unknown>, center: XYPosition, connect?: (id: string, existing: Node[]) => Edge[]) => {
      const built = buildNode(type, data, center);
      withDoc((doc) => {
        const existing = Array.from(getCanvasMaps(doc).nodes.values());
        // Dropped on a container: it goes in it
        const group = findGroupAtPoint(center, existing);
        const node = group
          ? { ...built, parentId: group.id, position: toRelativePosition(built.position, group.id, existing) }
          : built;
        addNodes(doc, [node], connect?.(node.id, existing) ?? []);
        if (group) fitGroupToChildren(doc, group.id);
      });
      return built.id;
    },
    []
  );

  /** Add a node of a registry type, centred on a canvas position */
  const addNode = useCallback(
    (type: string, center: XYPosition) => {
      const definition = getNodeDefinition(type);
      return definition ? insertNode(type, definition.createData(), center) : undefined;
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

  /** Adds ready-made nodes and edges (e.g. a container with what's in it) in one change */
  const insertNodes = useCallback(
    (nodes: Node[], edges: Edge[] = []) =>
      withDoc((doc) => {
        addNodes(doc, nodes, edges);
        // Containers already on the canvas that got something new inside grow to fit it
        const added = new Set(nodes.map((node) => node.id));
        new Set(nodes.flatMap((node) => (node.parentId && !added.has(node.parentId) ? [node.parentId] : []))).forEach((groupId) =>
          fitGroupToChildren(doc, groupId)
        );
      }),
    []
  );

  /** Puts a node in a container (or takes it out), e.g. after it's dragged there */
  const setParent = useCallback(
    (nodeId: string, parentId: string | undefined) =>
      withDoc((doc) => {
        // Where it was dropped goes first, so it's moved into (or out of) the container from there
        if (dragged.current.size) saveDrop(doc);
        return setNodeParent(doc, nodeId, parentId);
      }),
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
    addNode,
    insertNode,
    updateNodeData,
    deleteNodes,
    applyPositions,
    insertNodes,
    setParent,
    title,
    rename,
    transport,
    undo,
    redo,
    ...history,
    setPointer,
    setViewport,
  };
}
