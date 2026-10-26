/**
 * A canvas kept in a Yjs document, as Studio keeps it (studio/hooks/use-studio-flow.ts on v5-beta), without the
 * collaboration: the document is local to this page, so Studio's canvas operations (canvas-doc.ts) and its undo
 * (Y.UndoManager) work as they do there. The document starts from what it's given (`content`, from the model), and
 * starts again whenever that changes (a new diagram from the agent, a file opened).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { applyAgentCanvasToDoc, canvasIds, type AgentCanvas, type CanvasIds } from './apply-agent-canvas';
import { applyEdgeChanges, applyNodeChanges, type Connection, type Edge, type EdgeChange, type Node, type NodeChange, type XYPosition } from '@xyflow/react';
import { addNodes, addHotspots, setEdgeLabel as setEdgeLabelInDoc, getLock, setLock, addThreads, createHotspot as createHotspotInDoc, deleteHotspot as deleteHotspotInDoc, readHotspots, updateHotspot as updateHotspotInDoc, type Hotspot, createThread as createThreadInDoc, deleteThread as deleteThreadInDoc, moveThread as moveThreadInDoc, readThreads, replyToThread as replyToThreadInDoc, setThreadResolved as setThreadResolvedInDoc, type Author, type CommentAnchor, type Thread, buildNode, changesNodesOrEdges, connectNodes, deleteEdges, deleteNodes as deleteNodesInDoc, fitContainersAround, getCanvasMaps, getStructureKey, moveNode, placeNode, readLevelLayout, reconnectEdge, resizeNode, setEdgeRoutes, setLevelPlaces, setMeta, setNodeParents, updateNodeData as updateNodeDataInDoc, type LevelPlace, type RenderedSizes, keepDragged, LOCAL_EDGE_KEYS, LOCAL_NODE_KEYS, patchShared, containerFor, toRelativePosition, type NodePreview, type LayoutResult, canGoInContainer, getNodeDefinition, isGroupType, linkConnection, type NewLink } from '@eventcatalog/visualiser/studio';
import type { Editing } from '../collab/room';
import { type ModelCanvasContent as CanvasContent } from '@eventcatalog/visualiser/studio';

/** The canvas as its document has it at one moment (readDocument), for an agent's edit */
export type CanvasDocument = {
  doc: Y.Doc;
  /** How many changes the document had had */
  changes: number;
  locked: boolean;
  ids: CanvasIds;
  snapshot: { nodes: Node[]; edges: Edge[]; levelLayouts: Record<1 | 2, ReadonlyMap<string, LevelPlace>>; threads: Thread[]; hotspots: Hotspot[] };
};

/** What someone can change on a note or text live (as they write, scale and turn it) */
const EDITED_FIELDS = ['text', 'fontSize', 'angle'] as const;

/** Changes made here that are already shown here (dragged and resized with React Flow): the observers skip them */
const LOCAL_ORIGIN = Symbol('canvas-local');
/** Where L1 and L2 put what's new on them: kept, not undone (nobody did it) */
const LEVEL_PLACEMENT_ORIGIN = Symbol('canvas-level-placement');
/** The content the canvas starts from: not undone */
const LOAD_ORIGIN = Symbol('canvas-load');
/** The agent's changes (edit_diagram): shown to everyone, and not in the user's undo (they're not theirs to take back) */
const AGENT_ORIGIN = Symbol('canvas-agent');

const NO_LEVEL_LAYOUTS = { 1: new Map(), 2: new Map() } as const;

const restoreDoc = (doc: Y.Doc, update: Uint8Array) => {
  try {
    Y.applyUpdate(doc, update, LOAD_ORIGIN);
    return true;
  } catch {
    return false;
  }
};

export function useCanvasFlow({
  content,
  onLayout,
  onContainerResize,
  onChange,
}: {
  /** What the canvas starts from: a new one starts it again */
  content: CanvasContent | null;
  /** The canvas was laid out: called as the new positions arrive, so they can glide there */
  onLayout?: () => void;
  /** A container grew to fit what's in it, so it can grow smoothly */
  onContainerResize?: () => void;
  /** Something on the canvas changed (not as it's dragged: when it's dropped) */
  onChange?: () => void;
}) {
  const docRef = useRef<{ doc: Y.Doc; undoManager: Y.UndoManager } | null>(null);
  // The content the document was made from (it's made once the content's here, in an effect)
  const loadedFrom = useRef<CanvasContent | null>(null);
  // How many changes the document has had (anyone's, deletions too): to tell whether it changed in the meantime
  const changeCount = useRef(0);
  // The document itself, for what shares it (a live room): a new one each time the canvas starts again
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  // Comment threads, as they are in the document (people's, and the room's)
  const [threads, setThreads] = useState<Thread[]>([]);
  // Hotspots, as they are in the document
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  // Who locked the canvas (for everyone on it), if it's locked
  const [lockedBy, setLockedBy] = useState<string | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [history, setHistory] = useState({ canUndo: false, canRedo: false });
  const [structureKey, setStructureKey] = useState('');
  const [levelLayouts, setLevelLayouts] = useState<Record<1 | 2, ReadonlyMap<string, LevelPlace>>>(NO_LEVEL_LAYOUTS);
  const callbacks = useRef({ onLayout, onContainerResize, onChange });
  callbacks.current = { onLayout, onContainerResize, onChange };

  useEffect(() => {
    if (!content) return;
    const doc = new Y.Doc();
    const { nodes: yNodes, edges: yEdges, meta: yMeta, levelLayouts: yLevelLayouts, threads: yThreads, hotspots: yHotspots } = getCanvasMaps(doc);
    // A live room's copy starts from the room's document as it was kept (else, a broken copy: from the content)
    const restored = !!content.doc && restoreDoc(doc, content.doc);
    if (!restored)
      doc.transact(() => {
        addNodes(doc, content.nodes, content.edges);
        if (content.threads?.length) addThreads(doc, content.threads);
        if (content.hotspots?.length) addHotspots(doc, content.hotspots);
        setLevelPlaces(doc, 1, content.levelLayouts[1]);
        setLevelPlaces(doc, 2, content.levelLayouts[2]);
      }, LOAD_ORIGIN);
    setNodes(Array.from(yNodes.values()));
    setEdges(Array.from(yEdges.values()));
    setLevelLayouts({ 1: readLevelLayout(doc, 1), 2: readLevelLayout(doc, 2) });
    setStructureKey(getStructureKey(Array.from(yNodes.values()), Array.from(yEdges.values())));

    const syncLevelLayouts = (event: Y.YMapEvent<LevelPlace>) => {
      const changed = new Set([...event.keysChanged].map((key) => Number(key.split(':')[0]) as 1 | 2));
      setLevelLayouts((current) => {
        const next = { ...current };
        changed.forEach((level) => (next[level] = readLevelLayout(doc, level)));
        return next;
      });
    };
    yLevelLayouts.observe(syncLevelLayouts);
    setLockedBy(getLock(doc));
    const syncMeta = (event: Y.YMapEvent<unknown>) => {
      if (event.keysChanged.has('layoutAt')) callbacks.current.onLayout?.();
      if (event.keysChanged.has('lockedBy')) setLockedBy(getLock(doc));
    };
    yMeta.observe(syncMeta);
    const afterTransaction = (transaction: Y.Transaction) => {
      if (transaction.origin === LOAD_ORIGIN) return;
      // Drops and resizes here only move and size things (putting something in a container isn't LOCAL_ORIGIN)
      if (transaction.origin !== LOCAL_ORIGIN && changesNodesOrEdges(transaction))
        setStructureKey(getStructureKey(Array.from(yNodes.values()), Array.from(yEdges.values())));
      if (transaction.changed.size) callbacks.current.onChange?.();
    };
    doc.on('afterTransaction', afterTransaction);
    const countChange = () => changeCount.current++;
    doc.on('update', countChange);

    const undoManager = new Y.UndoManager([yNodes, yEdges, yLevelLayouts, yThreads, yHotspots], { captureTimeout: 500, trackedOrigins: new Set([null, LOCAL_ORIGIN]) });
    const updateHistory = () => setHistory({ canUndo: undoManager.undoStack.length > 0, canRedo: undoManager.redoStack.length > 0 });
    undoManager.on('stack-item-added', updateHistory);
    undoManager.on('stack-item-popped', updateHistory);
    undoManager.on('stack-cleared', updateHistory);
    setHistory({ canUndo: false, canRedo: false });
    docRef.current = { doc, undoManager };
    loadedFrom.current = content;
    setDoc(doc);

    // Only what changed is replaced, so React Flow re-renders just those nodes
    const syncNodes = (event: Y.YMapEvent<Node>) => {
      if (event.transaction.origin === LOCAL_ORIGIN) return;
      const containerResized = [...event.changes.keys].some(([id, change]) => {
        const next = yNodes.get(id);
        const previous = change.oldValue as Node | undefined;
        return change.action === 'update' && isGroupType(next?.type) && (next?.width !== previous?.width || next?.height !== previous?.height);
      });
      if (containerResized) callbacks.current.onContainerResize?.();
      setNodes((local) => keepDragged(patchShared(local, event.keysChanged, (id) => yNodes.get(id), LOCAL_NODE_KEYS), local));
    };
    const syncEdges = (event: Y.YMapEvent<Edge>) => {
      if (event.transaction.origin === LOCAL_ORIGIN) return;
      setEdges((local) => patchShared(local, event.keysChanged, (id) => yEdges.get(id), LOCAL_EDGE_KEYS));
    };
    yNodes.observe(syncNodes);
    const syncThreads = () => setThreads(readThreads(doc));
    syncThreads();
    yThreads.observeDeep(syncThreads);
    const syncHotspots = () => setHotspots(readHotspots(doc));
    syncHotspots();
    yHotspots.observe(syncHotspots);
    yEdges.observe(syncEdges);

    return () => {
      yNodes.unobserve(syncNodes);
      yThreads.unobserveDeep(syncThreads);
      yHotspots.unobserve(syncHotspots);
      yEdges.unobserve(syncEdges);
      yLevelLayouts.unobserve(syncLevelLayouts);
      yMeta.unobserve(syncMeta);
      doc.off('afterTransaction', afterTransaction);
      doc.off('update', countChange);
      undoManager.destroy();
      doc.destroy();
      docRef.current = null;
      setDoc(null);
    };
  }, [content]);

  // The sizes nodes are rendered at here, for fitting containers to what's in them. Not containers': their size is in
  // the document, and the one rendered can be from before they grew (a system fitted to what's in it, then the domain
  // it's in fitted to it, in the same change)
  const latestNodes = useRef(nodes);
  latestNodes.current = nodes;
  const renderedSizes = (): RenderedSizes =>
    new Map(
      latestNodes.current.flatMap((node) =>
        !isGroupType(node.type) && node.measured?.width && node.measured.height
          ? [[node.id, { width: node.measured.width, height: node.measured.height }] as const]
          : []
      )
    );

  const withDoc = <T>(fn: (doc: Y.Doc) => T, origin: unknown = null) => {
    const doc = docRef.current?.doc;
    return doc ? doc.transact(() => fn(doc), origin) : undefined;
  };

  // Where the nodes being dragged are, until they're dropped, and the containers around them as they've grown
  const dragged = useRef(new Map<string, XYPosition>());
  const dragPreview = useRef(new Map<string, NodePreview>());
  const saveDrop = (doc: Y.Doc) => {
    dragged.current.forEach((position, id) => moveNode(doc, id, position));
    dragPreview.current.forEach(({ position, width, height }, id) =>
      placeNode(doc, id, position, width !== undefined && height !== undefined ? { width, height } : undefined)
    );
    dragPreview.current = new Map();
    dragged.current.clear();
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
      if (change.type === 'dimensions' && change.setAttributes && change.dimensions)
        resized.push({ id: change.id, dimensions: change.dimensions, attributes: change.setAttributes });
      if (change.type === 'dimensions' && change.resizing === false) resizeEnded.push(change.id);
    }
    // Where they're dropped is saved: each drag is its own step to undo
    if (dropped) {
      docRef.current?.undoManager.stopCapturing();
      withDoc(saveDrop, LOCAL_ORIGIN);
    }
    if (resized.length) withDoc((doc) => resized.forEach(({ id, dimensions, attributes }) => resizeNode(doc, id, dimensions, attributes)), LOCAL_ORIGIN);
    if (resizeEnded.length) withDoc((doc) => resizeEnded.forEach((id) => fitContainersAround(doc, id, renderedSizes())));
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
   * What other people are dragging (from their presence), shown where they have it until their drop arrives in the
   * document. Only those nodes change (the same objects otherwise); what they stop dragging without a drop (they
   * left, or it's gone back) goes back to where the document has it. Never a node this person is dragging.
   */
  const remoteMoved = useRef(new Set<string>());
  const showRemoteMoves = useCallback((moves: ReadonlyMap<string, XYPosition>) => {
    const doc = docRef.current?.doc;
    if (!doc) return;
    const saved = getCanvasMaps(doc).nodes;
    const before = remoteMoved.current;
    remoteMoved.current = new Set(moves.keys());
    setNodes((local) => {
      let next: Node[] | undefined;
      local.forEach((node, index) => {
        if (node.dragging) return;
        const to = moves.get(node.id) ?? (before.has(node.id) ? saved.get(node.id)?.position : undefined);
        if (!to || (node.position.x === to.x && node.position.y === to.y)) return;
        next ??= [...local];
        next[index] = { ...node, position: to };
      });
      return next ?? local;
    });
  }, []);

  /**
   * Notes and text other people are changing (from their presence): what they're writing, a text's size and angle,
   * shown as they change them until what they end up with arrives in the document; what they stop changing without
   * saving goes back to what the document has
   */
  const remoteEdited = useRef(new Set<string>());
  const showRemoteEdits = useCallback((edits: ReadonlyMap<string, Omit<Editing, 'id'>>) => {
    const doc = docRef.current?.doc;
    if (!doc) return;
    const saved = getCanvasMaps(doc).nodes;
    const before = remoteEdited.current;
    remoteEdited.current = new Set(edits.keys());
    setNodes((local) => {
      let next: Node[] | undefined;
      local.forEach((node, index) => {
        const edit = edits.get(node.id);
        const savedData = before.has(node.id) ? saved.get(node.id)?.data : undefined;
        const changes = edit ?? (savedData && Object.fromEntries(EDITED_FIELDS.map((field) => [field, savedData[field]])));
        if (!changes || Object.entries(changes).every(([field, value]) => node.data[field] === value)) return;
        next ??= [...local];
        next[index] = { ...node, data: { ...node.data, ...changes } };
      });
      return next ?? local;
    });
  }, []);

  /** Containers growing while something's dragged in them, shown until it's dropped (saved with the drop) */
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
   * Add a node centred on a canvas position (in the container asked for, else the one it's dropped on), connected to
   * the node a connection was dragged from when there is one (in the same change, so one undo takes both back)
   */
  const insertNode = useCallback((type: string, data: Record<string, unknown>, center: XYPosition, inside?: string, link?: NewLink) => {
    const built = buildNode(type, data, center);
    withDoc((doc) => {
      const existing = Array.from(getCanvasMaps(doc).nodes.values());
      const group = canGoInContainer(type) ? containerFor(center, existing, inside, type) : undefined;
      const node = group ? { ...built, parentId: group.id, position: toRelativePosition(built.position, group.id, existing) } : built;
      addNodes(doc, [node]);
      if (link) connectNodes(doc, linkConnection(node.id, link));
      // The containers it's in grow to fit it, innermost first (a system in a domain: the domain too)
      if (group) fitContainersAround(doc, node.id, renderedSizes());
    });
    return built.id;
  }, []);

  /** Add a node of a component (its type, or its key in the components list), centred on a canvas position */
  const addNode = useCallback(
    (component: string, center: XYPosition, inside?: string, link?: NewLink) => {
      const definition = getNodeDefinition(component);
      return definition ? insertNode(definition.type, definition.createData(), center, inside, link) : undefined;
    },
    [insertNode]
  );

  const updateNodeData = useCallback(
    (id: string, updater: (data: Record<string, unknown>) => Record<string, unknown>) => withDoc((doc) => updateNodeDataInDoc(doc, id, updater)),
    []
  );

  const deleteNodes = useCallback((ids: string[]) => withDoc((doc) => deleteNodesInDoc(doc, ids)), []);
  const removeEdges = useCallback((ids: string[]) => withDoc((doc) => deleteEdges(doc, ids)), []);
  const setLocked = useCallback((by: string | null) => withDoc((doc) => setLock(doc, by)), []);
  const setEdgeLabel = useCallback((id: string, label: string | undefined) => withDoc((doc) => setEdgeLabelInDoc(doc, id, label)), []);

  /** Moves nodes (and resizes containers) from a layout in one change, so it undoes in one go */
  const applyPositions = useCallback(
    (layout: LayoutResult) =>
      withDoc((doc) => {
        layout.nodes.forEach(({ position, size }, id) => placeNode(doc, id, position, size));
        setEdgeRoutes(doc, layout.routes);
        setMeta(doc, { layoutAt: Date.now() });
      }),
    []
  );
  /** Puts things where they go on L1 or L2: moved there by someone (undone like any edit), or placed by the level */
  const setLevelLayout = useCallback(
    (level: 1 | 2, places: ReadonlyMap<string, LevelPlace>, by: 'person' | 'level' = 'person') =>
      withDoc((doc) => setLevelPlaces(doc, level, places), by === 'level' ? LEVEL_PLACEMENT_ORIGIN : null),
    []
  );

  /** Adds ready-made nodes and edges (e.g. pasted) in one change */
  const insertNodes = useCallback(
    (nodes: Node[], edges: Edge[] = []) =>
      withDoc((doc) => {
        addNodes(doc, nodes, edges);
        const added = new Set(nodes.map((node) => node.id));
        nodes.forEach((node) => node.parentId && !added.has(node.parentId) && fitContainersAround(doc, node.id, renderedSizes()));
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

  /** The agent's changes to the diagram (edit_diagram): see apply-agent-canvas.ts */
  const applyAgentCanvas = useCallback(
    (target: AgentCanvas, before: CanvasIds) =>
      withDoc((doc) => applyAgentCanvasToDoc(doc, target, before, renderedSizes()), AGENT_ORIGIN) ?? { added: [], changed: [], removed: [] },
    []
  );
  /**
   * The canvas as its document has it now (not what's rendered yet), and which document and how many changes in:
   * where an agent's edit begins, and how it tells whether the canvas changed (or was replaced) while it was laid out
   */
  const readDocument = useCallback((): CanvasDocument | undefined => {
    const doc = docRef.current?.doc;
    if (!doc) return undefined;
    const { nodes, edges } = getCanvasMaps(doc);
    return {
      doc,
      changes: changeCount.current,
      locked: !!getLock(doc),
      ids: canvasIds(doc),
      snapshot: {
        nodes: [...nodes.values()],
        edges: [...edges.values()],
        levelLayouts: { 1: readLevelLayout(doc, 1), 2: readLevelLayout(doc, 2) },
        threads: readThreads(doc),
        hotspots: readHotspots(doc),
      },
    };
  }, []);

  // ---- Comments ----
  const createThread = useCallback((anchor: CommentAnchor, text: string, author: Author) => withDoc((doc) => createThreadInDoc(doc, anchor, text, author)), []);
  const replyToThread = useCallback((id: string, text: string, author: Author) => withDoc((doc) => replyToThreadInDoc(doc, id, text, author)), []);
  const setThreadResolved = useCallback((id: string, resolved: boolean) => withDoc((doc) => setThreadResolvedInDoc(doc, id, resolved)), []);
  const moveThread = useCallback((id: string, anchor: CommentAnchor) => withDoc((doc) => moveThreadInDoc(doc, id, anchor)), []);
  const deleteThread = useCallback((id: string) => withDoc((doc) => deleteThreadInDoc(doc, id)), []);
  const createHotspot = useCallback((hotspot: Omit<Hotspot, 'id' | 'createdAt'>) => withDoc((doc) => createHotspotInDoc(doc, hotspot)), []);
  const updateHotspot = useCallback(
    (id: string, fields: Parameters<typeof updateHotspotInDoc>[2]) => withDoc((doc) => updateHotspotInDoc(doc, id, fields)),
    []
  );
  const deleteHotspot = useCallback((id: string) => withDoc((doc) => deleteHotspotInDoc(doc, id)), []);

  const undo = useCallback(() => docRef.current?.undoManager.undo(), []);
  const redo = useCallback(() => docRef.current?.undoManager.redo(), []);

  /** Whether the canvas has `content` (its document is made from it): empty or not */
  const hasLoaded = useCallback((content: CanvasContent) => loadedFrom.current === content, []);

  return {
    doc,
    hasLoaded,
    readDocument,
    applyAgentCanvas,
    threads,
    createThread,
    replyToThread,
    setThreadResolved,
    moveThread,
    deleteThread,
    setEdgeLabel,
    lockedBy,
    setLocked,
    hotspots,
    createHotspot,
    updateHotspot,
    deleteHotspot,
    nodes,
    edges,
    levelLayouts,
    structureKey,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onReconnect,
    showDragPreview,
    showRemoteMoves,
    showRemoteEdits,
    addNode,
    insertNode,
    updateNodeData,
    deleteNodes,
    removeEdges,
    applyPositions,
    setLevelLayout,
    insertNodes,
    setParents,
    undo,
    redo,
    ...history,
  };
}
