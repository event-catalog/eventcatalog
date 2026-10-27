/**
 * The architecture canvas: EventCatalog Studio's (studio/components/StudioDesigner.tsx on v5-beta), for one person
 * in this page. Components are dragged (or added) from the left, put in containers, connected, edited, copied and
 * deleted, on three levels of detail (L1 and L2 arranged on their own), with undo. What's on it is kept in a local
 * document (use-canvas-flow.ts) and told to the diagram as it changes, which turns it back into the model. Comments
 * and live cursors are on it too. Left out from Studio: the catalog and status (the diagram has its own sharing).
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import {
  applyNodeChanges,
  ConnectionLineType,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useUpdateNodeInternals,
  type Connection,
  type Edge,
  type FitViewOptions,
  type Node,
  type NodeChange,
  type XYPosition,
} from '@xyflow/react';
import { DiagramBackground, edgeTypes, pauseEdgeAnimations } from '@eventcatalog/visualiser';
import { getCanvasLegend, Legend, legendKeyOf } from './components/Legend';
import { LiveCursors } from './components/LiveCursors';
import { anchorAt, CommentLayer, CommentList, getAnchorPosition, type Author, type CommentAnchor, type Hotspot, type HotspotSeverity, type Thread as CommentThread, HotspotLayer, HotspotList, topSeverity, type HotspotDraft, type HotspotFields, type HotspotSpot, createSmoother, type LevelPlace, type Thread, CLIPBOARD_TYPE, copyNodes, pasteNodes, readClipboard, type ClipboardContent, keepUnchanged, LOCAL_EDGE_KEYS, LOCAL_NODE_KEYS, containerFor, findDropTargets, placeDropped, toRelativePosition, findGroupAtPoint, getAbsolutePosition, getAbsoluteRect, previewContainerGrowth, sortByHierarchy, withParent, placeNodes, getLayoutPositions, layoutGraph, getLevelGraph, LEVELS, type Level, arrangeLevel, getLevelNodeSize, levelPlaces, canGoInContainer, GROUP_TYPES, getNodeDefinition, getNodeName, getNoteLevel, isGroupType, isOnLevel, isShownOnLevel, isWrittenOnCanvas, updateResource, CanvasControls, FIT_VIEW_OPTIONS, ViewControls, DropTargetContext, nodeTypes, LockedContext, StartWritingContext, EditingContext, UpdateNodeDataContext, ContainerChooser, type ContainerChoice, type LiveMoves } from '@eventcatalog/visualiser/studio';
import type { CursorSource, Editing, Moving, Peer } from '../collab/room';
import type * as Y from 'yjs';
import { useHotkeys } from 'react-hotkeys-hook';
import { X } from 'lucide-react';
import { ContextMenu, type ContextMenuState, type MenuQuestion, TEXT_FONT_SIZE } from '@eventcatalog/visualiser/studio';
import { EditButton, Palette, COMPONENT_DRAG_TYPE, RemeasureHandles } from '@eventcatalog/visualiser/studio';
import { ConnectChooser, isCardType, newCardData, notPlaceholder, useConnectNew, type NewLink } from '@eventcatalog/visualiser/studio';
import { useCanvasFlow, type CanvasDocument } from './use-canvas-flow';
import type { AgentCanvas, CanvasIds } from './apply-agent-canvas';
import { bump, track } from '../analytics';
import { type ModelCanvasContent as CanvasContent } from '@eventcatalog/visualiser/studio';

/** How long a level (L1, L2) waits for changes to settle before it's laid out again */
const LEVEL_RELAYOUT_MS = 300;
const DELETE_KEYS = ['Backspace', 'Delete'];
// How close the camera goes to the first thing put on an empty canvas
const FIRST_NODE_ZOOM = 1.15;

// React Flow's warnings, except that a handle has no node: the left panel's drag previews draw nodes off the canvas
const onFlowError = (code: string, message: string) => {
  if (code !== '010') console.warn(message);
};
const MULTI_SELECTION_KEYS = ['Meta', 'Shift'];
/** Like design tools: dragging on the canvas draws a selection box, and it pans with the middle button or scrolling */
const PAN_BUTTONS = [1];

const DEFAULT_AUTHOR: Author = { name: 'You', color: '#6366f1' };

/** Selecting (V), moving around (H, the hand), or putting text (T) or a sticky note (N) where the canvas is clicked */
export type CanvasTool = 'select' | 'hand' | 'text' | 'note' | 'comment' | 'hotspot';
/** How close to a connection's end you grab it to move it */
const RECONNECT_RADIUS = 14;
const ZOOM_KEYS = ['Meta', 'Control'];

const centredOn = (center: XYPosition, size: { width: number; height: number }): LevelPlace => ({
  x: center.x - size.width / 2,
  y: center.y - size.height / 2,
});

/** How something was put on the canvas: clicked in the palette, dragged from it, or made at the end of a connection */
type AddedVia = 'click' | 'drag' | 'connect';


type Landing = {
  point: XYPosition;
  center: XYPosition;
  inside?: string;
  onLevel?: { level: 1 | 2; center: XYPosition; size: { width: number; height: number } };
};

/** A function that keeps its identity across renders and always calls the latest version (for React Flow's props) */
const useStableCallback = <Args extends unknown[], Result>(fn: (...args: Args) => Result) => {
  const latest = useRef(fn);
  latest.current = fn;
  return useCallback((...args: Args) => latest.current(...args), []);
};

// A message edge drawn as a plain labelled edge (kept per edge, so React Flow sees the same edge until it changes)
const staticEdges = new WeakMap<Edge, Edge>();
const withoutEnvelope = (edge: Edge) => {
  let drawn = staticEdges.get(edge);
  if (!drawn) staticEdges.set(edge, (drawn = { ...edge, type: 'smoothstep' }));
  return drawn;
};
// Notes on L1 and L2 can be moved and selected there, unlike the rest of the level
const levelNotes = new WeakMap<Node, Node>();
const asLevelNote = (node: Node) => {
  let note = levelNotes.get(node);
  if (!note) levelNotes.set(node, (note = { ...node, draggable: true, selectable: true }));
  return note;
};
// A node as shown with what it says about it (hidden by the legend, glowing with a hotspot, lit as a drop target):
// one copy per node and look, so a node keeps its identity while others move (React Flow re-renders a node whose
// object is new: copying them on every drag frame re-rendered every node with a hotspot)
const shownAs = new WeakMap<Node, Map<string, Node>>();
const asShown = (node: Node, hidden: boolean, className: string) => {
  const key = `${hidden}|${className}`;
  let looks = shownAs.get(node);
  if (!looks) shownAs.set(node, (looks = new Map()));
  let shown = looks.get(key);
  if (!shown) {
    if (looks.size > 4) looks.clear();
    looks.set(key, (shown = { ...node, ...(hidden && { hidden: true }), ...(className && { className }) }));
  }
  return shown;
};
const structureOf = (nodes: Node[]) => nodes.map((node) => `${node.id}:${node.type}:${node.parentId ?? ''}`).join('|');

/** What the canvas is now, for the model */
export type CanvasSnapshot = {
  nodes: Node[];
  edges: Edge[];
  levelLayouts: Record<1 | 2, ReadonlyMap<string, LevelPlace>>;
  threads: Thread[];
  hotspots: Hotspot[];
};

/** What the diagram around the canvas can do to it */
export type StudioCanvasHandle = {
  /** Picks the sticky note tool: the next click on the canvas puts a note there */
  pickNoteTool: () => void;
  /** A sticky note: beside a node, or in the middle of what's on screen (with text, e.g. one the agent wrote) */
  /** A sticky note, or text written on the canvas (kind "text", as big as fontSize): beside a node, or in the middle */
  addNote: (options?: { nodeId?: string; text?: string; author?: string; kind?: 'sticky' | 'text'; fontSize?: number }) => void;
  /** Centres a node (selected), at a comfortable zoom */
  centreOn: (nodeId: string) => void;
  /** The canvas as it is now */
  snapshot: () => CanvasSnapshot;
  /** Whether the canvas has this content yet (its document is made from it once it's here), empty or not */
  hasLoaded: (content: CanvasContent) => boolean;
  /** Lays the canvas (or the level shown) out again */
  reorder: () => void;
  /**
   * Lays out a diagram just opened (from the agent or a link): the level shown now and, if that isn't the canvas
   * (L3), the canvas too, the first time it's shown (once it's drawn, so with its nodes' real sizes)
   */
  tidy: () => void;
  /** Changes a node's name, version or summary (one step to undo) */
  updateNode: (nodeId: string, fields: Record<string, unknown>) => void;
  /**
   * Brings nodes into view (what the agent just added): only when they aren't in view already, fitting them and
   * what they connect to, never closer than it is now; the selection stays as it is
   */
  showNodes: (nodeIds: string[]) => void;
  /** The canvas as its document has it now (not what's rendered yet): where an agent's edit begins (use-canvas-flow.ts) */
  readDocument: () => CanvasDocument | undefined;
  /**
   * The agent's changes (edit_diagram), as the canvas they should give: only what's different is written, and only
   * what was there when the edit began (`before`) is taken off (apply-agent-canvas.ts)
   */
  applyAgentCanvas: (target: AgentCanvas, before: CanvasIds) => { added: string[]; changed: string[]; removed: string[] };
};

type StudioCanvasProps = {
  content: CanvasContent | null;
  /** The level it opens at */
  initialLevel?: Level;
  /** Something on it changed (once it's dropped, not as it's dragged) */
  onChange: (snapshot: CanvasSnapshot) => void;
  /** A node clicked (its page opens), or one just made at the end of a connection (opened to name it) */
  onNodeClick?: (node: Node, opened?: { justMade: boolean }) => void;
  /** The canvas clicked (not a node) */
  onPaneClick?: () => void;
  /** Questions for the agent about a node, in its right-click menu */
  questionsFor?: (node: Node) => MenuQuestion[];
  /** The palette of components (hidden e.g. inline in a chat, where there's little room) */
  showPanel?: boolean;
  /** Drawn over the canvas: the diagram's menu, sharing and its pages */
  children?: ReactNode;
  /** A domain or system being added, its kind (card or container) being chosen, or done */
  onChoosingChange?: (choosing: boolean) => void;
  /** The canvas locked (looked at, not changed) or unlocked */
  onLockChange?: (locked: boolean) => void;
  /** The note or text tool picked, or put down (e.g. to clear a welcome off the canvas, to put it there) */
  onToolChange?: (tool: CanvasTool) => void;
  /** A level picked, even the one it's on (e.g. to clear a welcome off the canvas, to show it) */
  onLevelChange?: (level: Level) => void;
  /** At the bottom of the palette of components */
  paletteFooter?: ReactNode;
  /** The canvas's document, as it starts (again): for a live room to share */
  onDocChange?: (doc: Y.Doc | null) => void;
  /** Who comments here (their name and colour on their comments) */
  author?: Author;
  /** The other people in a live room (who's here: it changes when someone joins, leaves or renames) */
  peers?: Peer[];
  /** Where their cursors are, read outside React as they move */
  cursors?: CursorSource;
  /** Where this person's cursor is on the canvas (or off it), for a live room */
  onCursorMove?: (at: XYPosition | null) => void;
  /** What this person's dragging, where it is now (or nothing: dropped), for a live room to show it moving */
  onNodesMove?: (moving: Moving[] | null) => void;
  /** The note or text this person's writing, scaling or turning (or nothing: done), for a live room to show it */
  onEditing?: (editing: Editing | null) => void;
  /** Bottom left, after the zoom and undo controls (e.g. made with EventCatalog) */
  footer?: ReactNode;
  /** Bottom bar extras */
  barExtras?: ReactNode;
  /** The canvas's area (where the children are drawn, and the diagram is exported from) */
  areaRef?: (element: HTMLDivElement | null) => void;
};

export const StudioCanvas = forwardRef<StudioCanvasHandle, StudioCanvasProps>(function StudioCanvas(props, ref) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} handleRef={ref} />
    </ReactFlowProvider>
  );
});

function Canvas({
  content,
  initialLevel = 3,
  onChange,
  onNodeClick: onNodeClicked,
  onPaneClick: onPaneClicked,
  questionsFor,
  showPanel = true,
  children,
  onToolChange,
  onLockChange,
  onChoosingChange,
  onLevelChange,
  paletteFooter,
  author = DEFAULT_AUTHOR,
  onDocChange,
  peers,
  cursors,
  onCursorMove,
  onNodesMove,
  onEditing,
  footer,
  barExtras,
  areaRef,
  handleRef,
}: StudioCanvasProps & { handleRef: React.ForwardedRef<StudioCanvasHandle> }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  // Locked, as Excalidraw's canvas can be: looked at, moved around and its details read, not changed
  // Locked for everyone on it: it's in the document, so a live session shares it (mirrored here once the document's
  // read, below)
  const [locked, setLocked] = useState(false);
  const lockedRef = useRef(locked);
  lockedRef.current = locked;
  // Fitted clear of the palette on the left, when it's there
  const fitOptions = useMemo<FitViewOptions>(
    () => (showPanel && !locked ? { ...FIT_VIEW_OPTIONS, padding: { ...FIT_VIEW_OPTIONS.padding, left: '304px' } } : FIT_VIEW_OPTIONS),
    [showPanel, locked]
  );

  // Nodes glide to their new place after a layout or a level change (not while editing: it would make dragging lag)
  const [transitioning, setTransitioning] = useState(false);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const glide = useCallback(() => {
    setTransitioning(true);
    clearTimeout(transitionTimer.current);
    transitionTimer.current = setTimeout(() => setTransitioning(false), 600);
  }, []);
  // Containers grow smoothly when they're fitted to what's in them (a class on the element, not state)
  const resizeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const animateContainers = useCallback(() => {
    canvasRef.current?.classList.add('is-container-resize');
    clearTimeout(resizeTimer.current);
    resizeTimer.current = setTimeout(() => canvasRef.current?.classList.remove('is-container-resize'), 400);
  }, []);

  // Told after the change is shown (the document changes first, then React's state)
  const [changes, setChanges] = useState(0);
  const flow = useCanvasFlow({ content, onLayout: glide, onContainerResize: animateContainers, onChange: () => setChanges((n) => n + 1) });
  const lockedBy = flow.lockedBy;
  useEffect(() => setLocked(!!lockedBy), [lockedBy]);
  useEffect(() => onDocChange?.(flow.doc), [flow.doc]);
  const { screenToFlowPosition, flowToScreenPosition, setCenter, fitView, getZoom, getViewport, getNodesBounds } = useReactFlow();
  // Nodes pop in (scaled up from smaller, see studio.css): where their handles are is measured again once they're
  // full size, or connections to handles off their middle (an entity's properties) would end short of them
  const updateNodeInternals = useUpdateNodeInternals();
  const onNodeShown = useCallback(
    (event: React.AnimationEvent) => {
      if (event.animationName !== 'studio-node-in') return;
      const id = (event.target as HTMLElement).closest?.('.react-flow__node')?.getAttribute('data-id');
      if (id) updateNodeInternals(id);
    },
    [updateNodeInternals]
  );

  const nodesRef = useRef(flow.nodes);
  nodesRef.current = flow.nodes;
  const edgesRef = useRef(flow.edges);
  edgesRef.current = flow.edges;
  const levelLayoutsRef = useRef(flow.levelLayouts);
  levelLayoutsRef.current = flow.levelLayouts;
  const threadsRef = useRef(flow.threads);
  threadsRef.current = flow.threads;
  const hotspotsRef = useRef(flow.hotspots);
  hotspotsRef.current = flow.hotspots;
  const snapshot = (): CanvasSnapshot => ({
    nodes: nodesRef.current,
    edges: edgesRef.current,
    levelLayouts: levelLayoutsRef.current,
    threads: threadsRef.current,
    hotspots: hotspotsRef.current,
  });
  // What the others in a live room are dragging: read as their presence arrives (not through the page's state), and
  // shown on the canvas until their drop arrives in the document
  const showRemoteMoves = flow.showRemoteMoves;
  const showRemoteEdits = flow.showRemoteEdits;
  // (a stable callback for the notes and text, which don't re-render for it)
  const editingTo = useStableCallback((editing: Editing | null) => onEditing?.(editing));
  // Comment pins and hotspot markers, moved live (by their layers)
  const sendMoving = useStableCallback((moving: Moving[] | null) => onNodesMove?.(moving));
  useEffect(() => {
    if (!cursors) return;
    let shown = '';
    // On L1 and L2: what's shown moved there, and putting the level back as it's arranged when they stop without a
    // drop (a drop arrives as a new arrangement, and arranges it anyway)
    let levelMoved = new Set<string>();
    let restore: ReturnType<typeof setTimeout> | undefined;
    const showOnLevel = (moves: ReadonlyMap<string, XYPosition>) => {
      const current = levelGraphRef.current;
      if (!current || current.level === 3) return;
      const stopped = [...levelMoved].filter((id) => !moves.has(id));
      levelMoved = new Set(moves.keys());
      let changed = false;
      const nodes = current.nodes.map((node) => {
        const to = moves.get(node.id);
        if (!to || node.dragging || (node.position.x === to.x && node.position.y === to.y)) return node;
        changed = true;
        return { ...node, position: to };
      });
      if (changed) updateLevelGraph({ ...current, nodes });
      if (stopped.length) {
        clearTimeout(restore);
        restore = setTimeout(rearrangeLevel, 300);
      }
    };
    let edited = '';
    const show = (peers: ReadonlyMap<string, Peer>) => {
      const edits = new Map<string, Omit<Editing, 'id'>>();
      peers.forEach((peer) => {
        if (!peer.editing) return;
        const { id, ...changes } = peer.editing;
        edits.set(id, changes);
      });
      const editedKey = JSON.stringify([...edits]);
      if (editedKey !== edited) {
        edited = editedKey;
        showRemoteEdits(edits);
      }
      const onCanvas = new Map<string, XYPosition>();
      const onLevel = new Map<string, XYPosition>();
      const level = levelRef.current;
      peers.forEach((peer) =>
        peer.moving?.forEach(({ id, x, y, level: on, kind }) => {
          // (comment pins and hotspot markers are moved by their layers)
          if (kind) return;
          if (!on) onCanvas.set(id, { x, y });
          else if (on === level) onLevel.set(id, { x, y });
        })
      );
      const key = `${level}|${[...onCanvas, ...onLevel].map(([id, { x, y }]) => `${id}:${x}:${y}`).join('|')}`;
      if (key === shown) return;
      shown = key;
      // (gliding there, a step a frame, rather than jumping as each one arrives)
      canvasMoves.set(onCanvas);
      levelMoves.set(onLevel);
    };
    const canvasMoves = createSmoother(showRemoteMoves);
    const levelMoves = createSmoother(showOnLevel);
    show(cursors.current());
    const unsubscribe = cursors.subscribe(show);
    return () => {
      unsubscribe();
      clearTimeout(restore);
      canvasMoves.stop();
      levelMoves.stop();
      showRemoteMoves(new Map());
      showRemoteEdits(new Map());
    };
  }, [cursors, showRemoteMoves, showRemoteEdits]);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // Told once per change to the document (with what it changed: its nodes and edges are set in the same render).
  // Not on every change to the nodes here: they change on every drag frame and selection, and telling the diagram
  // then rebuilt the model and re-rendered the whole page on every frame
  const reportedChanges = useRef(0);
  useEffect(() => {
    if (changes === reportedChanges.current) return;
    reportedChanges.current = changes;
    onChangeRef.current(snapshot());
  }, [changes, flow.nodes, flow.edges, flow.levelLayouts]);

  const lookupNodes = () => new Map(nodesRef.current.map((node) => [node.id, node]));
  const structure = structureOf(flow.nodes);

  /** Middle of the visible canvas, spread out so repeated adds don't land on top of each other */
  const canvasCenter = () => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const step = nodesRef.current.length % 6;
    const offset = { x: ((step % 3) - 1) * 240, y: (Math.floor(step / 3) - 0.5) * 160 };
    return screenToFlowPosition({ x: rect.left + rect.width / 2 + offset.x, y: rect.top + rect.height / 2 + offset.y });
  };

  // ---- Levels of detail ----

  // Like EventCatalog's diagrams: L3 is everything on the canvas, L1 and L2 less detailed views of it, arranged and
  // edited on their own (what's done there changes the canvas: a system card is the system)
  const [level, setLevel] = useState<Level>(initialLevel);
  // (comment pins and hotspot markers moved live, on the level shown)
  const live = useMemo((): LiveMoves | undefined => (cursors ? { send: sendMoving, source: cursors, level } : undefined), [cursors, sendMoving, level]);
  useEffect(() => setLevel(initialLevel), [content]);
  const levelRef = useRef(level);
  levelRef.current = level;
  const editable = level === 3;
  const [levelGraph, setLevelGraphState] = useState<{ level: Level; nodes: Node[]; edges: Edge[] } | null>(null);
  const levelGraphRef = useRef(levelGraph);
  const updateLevelGraph = useCallback((next: { level: Level; nodes: Node[]; edges: Edge[] }) => {
    levelGraphRef.current = next;
    setLevelGraphState(next);
  }, []);
  const setLevelGraph = useCallback((next: { level: Level; nodes: Node[]; edges: Edge[] } | null) => {
    const previous = levelGraphRef.current;
    const same = previous && next && previous.level === next.level ? previous : null;
    const shown = next && {
      ...next,
      nodes: sortByHierarchy(same ? keepUnchanged(same.nodes, next.nodes, LOCAL_NODE_KEYS) : next.nodes),
      edges: same ? keepUnchanged(same.edges, next.edges, LOCAL_EDGE_KEYS) : next.edges,
    };
    levelGraphRef.current = shown;
    setLevelGraphState(shown);
  }, []);

  // The level shown, arranged again from its layout: what someone dragged there and let go of without a drop goes
  // back (a drop changes the layout, which arranges it anyway)
  const rearrangeLevel = useStableCallback(() => {
    const level = levelRef.current;
    if (level === 3 || levelGraphRef.current?.level !== level) return;
    const arranged = arrangeLevel(getLevelGraph(nodesRef.current, edgesRef.current, level), flow.levelLayouts[level]);
    if (arranged) setLevelGraph({ level, ...arranged.graph });
  });

  const levelKey = level === 3 ? '' : flow.structureKey;
  const shownLevelRef = useRef<Level | undefined>(undefined);
  shownLevelRef.current = levelGraph?.level;
  const levelLayout = level === 3 ? undefined : flow.levelLayouts[level];
  useEffect(() => {
    if (level === 3) return setLevelGraph(null);
    let cancelled = false;
    const show = () => {
      const content = getLevelGraph(nodesRef.current, edgesRef.current, level);
      // Where things are: as arranged on the level, and anything new next to what it connects to (kept there)
      const arranged = arrangeLevel(content, flow.levelLayouts[level]);
      if (arranged) {
        setLevelGraph({ level, ...arranged.graph });
        if (arranged.placed.size) flow.setLevelLayout(level, arranged.placed, 'level');
        return;
      }
      // Nothing on it has a place yet: laid out with the visualiser's layout once, and kept
      void layoutGraph(
        content.nodes.map((node) => ({ ...node, selected: false })),
        content.edges
      ).then((laidOut) => {
        if (cancelled) return;
        setLevelGraph({ level, ...laidOut });
        flow.setLevelLayout(level, levelPlaces(laidOut.nodes), 'level');
        // (with sizes guessed from the nodes' types: laid out again once they're drawn, see below)
        if (!cursors) relayoutWhenMeasured.current = level;
      });
    };
    if (shownLevelRef.current !== level) {
      show();
      return () => void (cancelled = true);
    }
    const timer = setTimeout(show, LEVEL_RELAYOUT_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [level, levelKey, levelLayout]);

  // A level's first layout is worked out before its nodes have been drawn, so with sizes guessed from their types: a
  // little off once they're drawn at their real sizes. Once they all have been (measured), it's laid out again with
  // them, as Reorder would, gliding there. Only that first time, and not in a live session: it would move what the
  // others are looking at (there, the level stays as first laid out, and Reorder tidies it)
  const relayoutWhenMeasured = useRef<1 | 2 | null>(null);
  useEffect(() => {
    const pending = relayoutWhenMeasured.current;
    if (!pending || levelGraph?.level !== pending) return;
    if (!levelGraph.nodes.every((node) => node.measured?.width && node.measured?.height)) return;
    relayoutWhenMeasured.current = null;
    void layoutGraph(
      levelGraph.nodes.map((node) => ({ ...node, selected: false })),
      levelGraph.edges
    ).then((laidOut) => {
      if (levelRef.current !== pending) return;
      glide();
      flow.setLevelLayout(pending, levelPlaces(laidOut.nodes), 'level');
      setTimeout(() => void fitView({ ...fitOptions, duration: 450 }), 50);
    });
  }, [levelGraph]);

  // A diagram opened on L1 or L2 is tidied there; the canvas (L3), laid out as the diagram had it rather than as it's
  // drawn, is tidied the first time it's shown, once its nodes are (not in a live session: see above)
  const tidyCanvasWhenShown = useRef(false);
  useEffect(() => {
    if (!tidyCanvasWhenShown.current || level !== 3) return;
    // (notes and text written on L1 or L2 aren't drawn here)
    const shown = flow.nodes.filter((node) => isOnLevel(node, 3));
    if (!shown.length || !shown.every((node) => node.measured?.width && node.measured?.height)) return;
    tidyCanvasWhenShown.current = false;
    void reorder();
  }, [level, flow.nodes]);

  const changeLevel = useStableCallback((next: Level) => {
    onLevelChange?.(next);
    if (next === level) return;
    track('level_changed', { level: next, from: level });
    // Writing on a note or text is done (and saved): it isn't picked up again where the note's shown next
    const active = document.activeElement;
    if (active instanceof HTMLElement && canvasRef.current?.contains(active)) active.blur();
    setStartWriting(null);
    glide();
    setContextMenu(null);
    connect.cancel();
    setDraft(null);
    setOpenThreadId(null);
    setHotspotDraft(null);
    setOpenHotspot(null);
    flow.onNodesChange(selectedIds().map((id) => ({ type: 'select', id, selected: false })));
    setLevel(next);
  });
  const editInL3 = useCallback(() => changeLevel(3), [changeLevel]);

  // Fit the camera to a level once it's laid out (and to the canvas when it's first shown or back on L3)
  const shownLevel = level === 3 ? 3 : levelGraph?.level;
  const levelHasNodes = !!levelGraph?.nodes.length;
  useEffect(() => {
    if (shownLevel === undefined || (shownLevel !== 3 && !levelHasNodes)) return;
    const frame = requestAnimationFrame(() => void fitView({ ...fitOptions, duration: 450 }));
    return () => cancelAnimationFrame(frame);
  }, [shownLevel, levelHasNodes]);
  // ...and to a diagram once it's on the canvas (not to what people add, which stays where they put it)
  const fitOnceShown = useRef(false);
  useEffect(() => void (fitOnceShown.current = !!content?.nodes.length), [content]);
  useEffect(() => {
    if (!fitOnceShown.current || !flow.nodes.length) return;
    fitOnceShown.current = false;
    const frame = requestAnimationFrame(() => void fitView({ ...fitOptions, duration: 450 }));
    return () => cancelAnimationFrame(frame);
  }, [flow.nodes]);

  // ---- Adding things ----

  const landingAt = (point: XYPosition, type: string | undefined): Landing => {
    const level = levelRef.current;
    if (level === 3) return { point, center: point };
    const shownHere = isShownOnLevel(type, level);
    if (!shownHere) changeLevel(3);
    const shown = shownHere && levelGraphRef.current?.level === level ? levelGraphRef.current.nodes : [];
    const container = canGoInContainer(type) ? findGroupAtPoint(point, shown, type) : undefined;
    const canvas = nodesRef.current;
    const inside = container && containerFor(point, canvas, container.id, type) ? container.id : undefined;
    const lookup = new Map(canvas.map((node) => [node.id, node]));
    const beside = canvas.filter((node) => (inside ? node.parentId === inside : !node.parentId && isOnLevel(node, 3)));
    const rects = (beside.length ? beside : inside ? [lookup.get(inside)!] : []).map((node) => getAbsoluteRect(node, lookup));
    const center = rects.length
      ? {
          x: (Math.min(...rects.map((rect) => rect.x)) + Math.max(...rects.map((rect) => rect.x + rect.width))) / 2,
          y: beside.length ? Math.max(...rects.map((rect) => rect.y + rect.height)) + 160 : rects[0].y + rects[0].height / 2,
        }
      : { x: 0, y: 0 };
    if (!shownHere) return { point, center };
    const origin = container && inside ? getAbsolutePosition(container, new Map(shown.map((node) => [node.id, node]))) : { x: 0, y: 0 };
    const size = getLevelNodeSize(type, level);
    return { point, center, inside, onLevel: { level, center: { x: point.x - origin.x, y: point.y - origin.y }, size } };
  };
  const centring = useRef(new Map<string, { level: 1 | 2; size: { width: number; height: number } }>());
  const keepOnLevel = (at: Landing, id: string | undefined) => {
    if (!id || !at.onLevel) return;
    const { level, center, size } = at.onLevel;
    centring.current.set(id, { level, size });
    flow.setLevelLayout(level, new Map([[id, centredOn(center, size)]]));
  };

  /** A sticky note on the level shown (it's only shown on that level) */
  const addNoteAt = (center: XYPosition, extra: Record<string, unknown> = {}) => {
    const data = { ...getNodeDefinition('note')!.createData(), createdAt: Date.now(), ...extra };
    const id = flow.insertNode('note', levelRef.current === 3 ? data : { ...data, level: levelRef.current }, center);
    track('note_added', { level: levelRef.current, from: extra.text ? 'prefilled' : 'canvas' });
    // Written on straight away (not one that already says something, e.g. the agent's)
    if (!extra.text) setStartWriting(id);
    return id;
  };
  // A domain or system put on the canvas: asked whether it's a container or a card first (as Studio asks)
  const [chooser, setChooser] = useState<{ kind: 'domain' | 'system'; point: XYPosition; via: AddedVia } | null>(null);
  useEffect(() => onChoosingChange?.(!!chooser), [!!chooser]);
  const choose = useStableCallback((choice: ContainerChoice) => {
    if (!chooser) return;
    const { kind, point, via } = chooser;
    setChooser(null);
    if (choice.as === 'container') return void addComponentAt(GROUP_TYPES[kind], point, via, true);
    addCardAt(kind === 'domain' ? 'context-domain' : 'system', point, via);
  });
  // A card: the visualiser's domain or system card, connected to what it holds
  const addCardAt = (type: 'context-domain' | 'system', point: XYPosition, via: AddedVia, link?: NewLink) => {
    const kind = type === 'context-domain' ? 'domain' : 'system';
    const at = landingAt(point, type);
    const id = flow.insertNode(type, newCardData(type), at.center, at.inside, link);
    keepOnLevel(at, id);
    openOnceShown(id);
    if (id) track('resource_added', { resource_type: kind, as: 'card', via, level: at.onLevel?.level ?? 3 });
    return id;
  };
  const cancelChooser = useCallback(() => setChooser(null), []);

  const addComponentAt = (component: string, point: XYPosition, via: AddedVia, chosen = false, link?: NewLink) => {
    // A kind of data store is a data node: placed by its type
    const type = getNodeDefinition(component)?.type ?? component;
    if (type === 'note') return addNoteAt(point);
    if (!chosen && (type === GROUP_TYPES.domain || type === GROUP_TYPES.system)) {
      setChooser({ kind: type === GROUP_TYPES.domain ? 'domain' : 'system', point, via });
      return undefined;
    }
    // The first thing on an empty canvas: the camera goes in close to it, so it isn't a speck on a big canvas
    const first = !nodesRef.current.some((node) => !isWrittenOnCanvas(node.type));
    const at = landingAt(point, type);
    const id = flow.addNode(component, at.center, at.inside, link);
    keepOnLevel(at, id);
    if (id) track('resource_added', { resource_type: component, ...(chosen && { as: 'container' }), via, level: at.onLevel?.level ?? 3, first });
    if (id && first) void setCenter(at.center.x, at.center.y, { zoom: FIRST_NODE_ZOOM, duration: 500 });
    // Named straight away, like a new layer in a design tool
    if (id && !isWrittenOnCanvas(type)) openOnceShown(id);
    return id;
  };
  // Clicked in the palette: added in the middle of the screen, except notes and text, which are tools (put where the
  // canvas is clicked next)
  const addComponent = useStableCallback((type: string) => {
    if (lockedRef.current) return;
    if (type === 'note' || type === 'text') return pickTool(type);
    addComponentAt(type, canvasCenter(), 'click');
  });

  const onDrop = useStableCallback((event: DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData(COMPONENT_DRAG_TYPE);
    if (type) addComponentAt(type, screenToFlowPosition({ x: event.clientX, y: event.clientY }), 'drag');
  });
  const onDragOver = useStableCallback((event: DragEvent) => {
    // Files are dropped on the diagram (opened), components here
    if (!event.dataTransfer.types.includes(COMPONENT_DRAG_TYPE)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    trackPointer(event);
  });

  // ---- Connecting to something new: a connection let go of on empty canvas ----

  // A placeholder where it was let go of, connected to the node it came from, until what it is is chosen beside it
  const connect = useConnectNew({
    canvasRef,
    getNode: (id) => nodesRef.current.find((node) => node.id === id),
    getLevel: () => levelRef.current,
    locked,
    onMake: (option, center, link) => {
      const id = isCardType(option.type) ? addCardAt(option.type, center, 'connect', link) : addComponentAt(option.key, center, 'connect', false, link);
      if (!id) return;
      track('relation_added', { level: levelRef.current, via: 'connect' });
      // Its details open, to name it
      openOnceShown(id, true);
    },
  });

  // ---- Pointer, copy and paste ----

  const pointerAt = useRef<XYPosition | null>(null);
  const trackPointer = useStableCallback((event: { clientX: number; clientY: number }) => {
    pointerAt.current = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    onCursorMove?.(pointerAt.current);
  });
  const clearPointer = useStableCallback(() => {
    pointerAt.current = null;
    onCursorMove?.(null);
  });

  const pastes = useRef(0);
  const selectedIds = () => nodesRef.current.filter((node) => node.selected).map((node) => node.id);
  const [lastCopied, setLastCopied] = useState<ClipboardContent | null>(null);
  const copyOnly = useRef<string[] | null>(null);

  /** Adds copies (one change, so one undo takes them back) and selects them instead of what was selected */
  const paste = useStableCallback((content: ClipboardContent, place: { at: XYPosition } | { offset: XYPosition }) => {
    const { nodes, edges } = pasteNodes(content, nodesRef.current, place);
    flow.onNodesChange(selectedIds().map((id) => ({ type: 'select', id, selected: false })));
    flow.insertNodes(nodes, edges);
    flow.onNodesChange(nodes.map((node) => ({ type: 'select', id: node.id, selected: true })));
    track('pasted', { count: nodes.length });
  });

  useEffect(() => {
    const isTyping = () => {
      const active = document.activeElement;
      return active instanceof HTMLElement && (active.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName));
    };
    const hasTextSelected = () => !!window.getSelection()?.toString();
    const copy = (event: ClipboardEvent) => {
      const fromMenu = copyOnly.current !== null;
      const ids = copyOnly.current ?? selectedIds();
      copyOnly.current = null;
      if (levelRef.current !== 3 || isTyping() || !event.clipboardData || (!fromMenu && hasTextSelected())) return;
      const content = copyNodes(nodesRef.current, edgesRef.current, ids);
      if (!content) return;
      event.preventDefault();
      event.clipboardData.setData(CLIPBOARD_TYPE, JSON.stringify(content));
      event.clipboardData.setData('text/plain', content.nodes.map((node) => getNodeName(node.type, node.data)).join('\n'));
      pastes.current = 0;
      setLastCopied(content);
      if (event.type === 'cut' && !lockedRef.current) flow.deleteNodes(ids);
    };
    const onPaste = (event: ClipboardEvent) => {
      if (levelRef.current !== 3 || isTyping() || lockedRef.current) return;
      const content = readClipboard(event.clipboardData?.getData(CLIPBOARD_TYPE)) ?? readClipboard(event.clipboardData?.getData('text/plain'));
      if (!content) return;
      event.preventDefault();
      pastes.current += 1;
      const step = 40 * pastes.current;
      paste(content, pointerAt.current ? { at: pointerAt.current } : { offset: { x: step, y: step } });
    };
    document.addEventListener('copy', copy);
    document.addEventListener('cut', copy);
    document.addEventListener('paste', onPaste);
    return () => {
      document.removeEventListener('copy', copy);
      document.removeEventListener('cut', copy);
      document.removeEventListener('paste', onPaste);
    };
  }, [paste, flow.deleteNodes]);

  // While the canvas is panned, zoomed or dragged, message edges stop animating (a class, not state)
  const interactions = useRef({ moving: false, dragging: false });
  const setInteraction = useCallback((kind: 'moving' | 'dragging', on: boolean) => {
    const wasActive = interactions.current.moving || interactions.current.dragging;
    interactions.current[kind] = on;
    const active = interactions.current.moving || interactions.current.dragging;
    if (active === wasActive) return;
    canvasRef.current?.classList.toggle('ec-interaction-active', active);
    pauseEdgeAnimations(canvasRef.current, active);
  }, []);
  const onMoveStart = useCallback(() => setInteraction('moving', true), [setInteraction]);
  const onMoveEnd = useCallback(() => setInteraction('moving', false), [setInteraction]);

  // ---- Dragging into and out of containers ----

  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const dragStart = useRef<{ nodes: Map<string, Node>; containers: string[] } | null>(null);
  const onNodeDragStart = useStableCallback((_: unknown, __: Node, dragged: Node[]) => {
    setInteraction('dragging', true);
    const lookup = lookupNodes();
    const containers: string[] = [];
    for (const node of dragged) {
      for (let id = lookup.get(node.id)?.parentId; id; id = lookup.get(id)?.parentId) {
        if (!containers.includes(id)) containers.push(id);
      }
    }
    const depth = (id: string) => {
      let level = 0;
      for (let parent = lookup.get(id)?.parentId; parent; parent = lookup.get(parent)?.parentId) level++;
      return level;
    };
    containers.sort((a, b) => depth(b) - depth(a));
    dragStart.current = containers.length ? { nodes: lookup, containers } : null;
  });
  const growContainers = (dragged: Node[]) => {
    const started = dragStart.current;
    if (!started) return;
    const now = lookupNodes();
    dragged.forEach((node) => now.set(node.id, { ...now.get(node.id)!, position: node.position }));
    flow.showDragPreview(previewContainerGrowth(started.containers, new Set(dragged.map((node) => node.id)), started.nodes, now));
  };
  // What a drag happens among: the canvas on L3, and on L1 and L2 the level's own arrangement (what's dragged where
  // it is now), so a system can be moved into or out of a domain there too
  const dragNodes = (dragged: Node[]) => {
    if (levelRef.current === 3) return nodesRef.current;
    const at = new Map(dragged.map((node) => [node.id, node.position]));
    return (levelGraphRef.current?.nodes ?? []).map((node) => (at.has(node.id) ? { ...node, position: at.get(node.id)! } : node));
  };
  const onNodeDrag = useStableCallback((_: unknown, held: Node, dragged: Node[]) => {
    if (levelRef.current === 3) growContainers(dragged);
    // The others in a live room see it move (on the level it's on: L1 and L2 are arranged on their own; notes and
    // text keep their place on the canvas, on whichever level they're on)
    const on = levelRef.current === 3 ? {} : { level: levelRef.current as 1 | 2 };
    onNodesMove?.(dragged.map(({ id, type, position }) => ({ id, x: position.x, y: position.y, ...(!isWrittenOnCanvas(type) && on) })));
    setDropTargetId(findDropTargets(held.id, dragged.map(({ id }) => id), dragNodes(dragged)).find(({ target }) => target)?.target?.id ?? null);
  });
  const onNodeDragStop = useStableCallback((_: unknown, held: Node, dragged: Node[]) => {
    onNodesMove?.(null);
    bump('node_moved');
    setInteraction('dragging', false);
    setDropTargetId(null);
    dragStart.current = null;
    const level = levelRef.current;
    const nodes = dragNodes(dragged);
    // Dropped in a container (or out of one), what's selected with it goes too, into free space there (gliding off
    // anything it was dropped on), as one change
    const moves = findDropTargets(held.id, dragged.map((node) => node.id), nodes);
    if (!moves.length) return;
    const { places, nudged } = placeDropped(nodes, moves);
    if (nudged) glide();
    if (level === 3) {
      flow.setParents(moves.map(({ id, target }) => ({ id, parentId: target?.id, at: places.get(id) })));
      return;
    }
    // On L1 and L2: each stays where it was dropped on the level (now in its new container), and on the canvas it's
    // put in that container next to what it connects to (where it was dropped on the level isn't a canvas place),
    // beside the others put there
    const onLevel = new Map<string, LevelPlace>();
    const onCanvas: { id: string; parentId: string | undefined; at?: XYPosition }[] = [];
    let canvas = nodesRef.current;
    for (const { id, target } of moves) {
      const inLevel = withParent(nodes.find((node) => node.id === id)!, target?.id, nodes);
      const place = levelPlaces([{ ...inLevel, position: places.get(id) ?? inLevel.position }]).get(id);
      if (place) onLevel.set(id, place);
      const moved = canvas.map((node) => (node.id === id ? { ...node, parentId: target?.id, position: { x: 0, y: 0 } } : node));
      // On the canvas, and then in its container
      const spot = placeNodes(moved, [id], edgesRef.current).get(id);
      const at = spot && target ? toRelativePosition(spot, target.id, moved) : spot;
      canvas = at ? moved.map((node) => (node.id === id ? { ...node, position: at } : node)) : moved;
      onCanvas.push({ id, parentId: target?.id, at });
    }
    if (onLevel.size) flow.setLevelLayout(level, onLevel);
    flow.setParents(onCanvas);
  });

  /** Lays the canvas (or the level shown) out with the visualiser's layout, as one step to undo */
  const reorder = useStableCallback(async () => {
    const level = levelRef.current;
    if (level !== 3) {
      const content = getLevelGraph(nodesRef.current, edgesRef.current, level);
      // As they're drawn on the level (its cards and boxes aren't the canvas's), where they have been
      const drawn = new Map((levelGraphRef.current?.level === level ? levelGraphRef.current.nodes : []).map((node) => [node.id, node.measured]));
      const laidOut = await layoutGraph(
        content.nodes.map((node) => ({ ...node, selected: false, ...(drawn.get(node.id) && { measured: drawn.get(node.id) }) })),
        content.edges
      );
      glide();
      flow.setLevelLayout(level, levelPlaces(laidOut.nodes));
      setTimeout(() => void fitView({ ...fitOptions, duration: 450 }), 50);
      return;
    }
    const positions = await getLayoutPositions(nodesRef.current, edgesRef.current);
    flow.applyPositions(positions);
    setTimeout(() => void fitView({ ...fitOptions, duration: 450 }), 50);
  });
  const onReorder = useCallback(() => {
    track('auto_layout_used', { level: levelRef.current });
    void reorder();
  }, [reorder]);

  // ---- What's shown ----

  const hierarchyOrder = useMemo(() => {
    const sorted = sortByHierarchy(nodesRef.current);
    return sorted.every((node, index) => node === nodesRef.current[index]) ? null : sorted.map((node) => node.id);
  }, [structure]);
  const sortedNodes = useMemo(() => {
    if (!hierarchyOrder) return flow.nodes;
    const byId = new Map(flow.nodes.map((node) => [node.id, node]));
    return hierarchyOrder.flatMap((id) => byId.get(id) ?? []);
  }, [flow.nodes, hierarchyOrder]);
  const levelShown = level !== 3 && levelGraph?.level === level ? levelGraph : null;
  const shownNodes = useMemo(() => {
    if (!levelShown) return sortedNodes.every((node) => isOnLevel(node, 3)) ? sortedNodes : sortedNodes.filter((node) => isOnLevel(node, 3));
    const notes = sortedNodes.filter((node) => getNoteLevel(node) === levelShown.level);
    return notes.length ? [...levelShown.nodes, ...notes.map(asLevelNote)] : levelShown.nodes;
  }, [levelShown, sortedNodes]);
  const shownNodesRef = useRef(shownNodes);
  shownNodesRef.current = shownNodes;

  // The legend, as the visualiser's: clicking a kind hides or shows it (only for this person)
  const [hiddenLegendKeys, setHiddenLegendKeys] = useState<string[]>([]);
  const toggleLegendKey = useCallback(
    (key: string) => setHiddenLegendKeys((keys) => (keys.includes(key) ? keys.filter((other) => other !== key) : [...keys, key])),
    []
  );
  const shownStructure = levelShown ? structureOf(levelShown.nodes) : structure;
  const legend = useMemo(() => getCanvasLegend(shownNodes), [shownStructure]);
  // What the legend hides
  // The node a hotspot being dragged would go on: it lights up in the hotspot's colour
  const [hotspotDropTarget, setHotspotDropTarget] = useState<{ nodeId: string; severity: HotspotSeverity } | null>(null);
  // Hotspots where they show on this level: on L3 on their node (or at their place); on L1 and L2 on their node if
  // it's shown, else on what it's in that is (so they're found from the overview)
  // (from what's on the canvas and the level, read through refs: the nodes arrays are new on every drag frame, and
  // which node holds which doesn't change while things move)
  const hotspotSpots = useMemo((): HotspotSpot[] => {
    const canvas = new Map(nodesRef.current.map((node) => [node.id, node]));
    const shown = new Set(shownNodesRef.current.map((node) => node.id));
    const onNodes = new Map<string, Hotspot[]>();
    const holding = new Set<string>();
    const places: HotspotSpot[] = [];
    // The node itself if it's shown, else the nearest container of it that is
    const shownAround = (id: string | undefined) => {
      while (id && !shown.has(id)) id = canvas.get(id)?.parentId;
      return id;
    };
    for (const hotspot of flow.hotspots) {
      let target = hotspot.nodeId && canvas.has(hotspot.nodeId) ? hotspot.nodeId : undefined;
      if (!target) {
        if ((hotspot.level ?? 3) === level) places.push({ key: `place:${hotspot.id}`, position: hotspot.position, hotspots: [hotspot] });
        continue;
      }
      const own = target;
      target = shownAround(own);
      // Not in anything shown (e.g. a message on L2): on what it's connected to (its sender first), or what that's in
      if (!target) {
        const linked = flow.edges.filter((edge) => edge.source === own || edge.target === own).sort((a) => (a.target === own ? -1 : 1));
        target = linked.map((edge) => shownAround(edge.source === own ? edge.target : edge.source)).find(Boolean);
      }
      if (!target) continue;
      if (target !== hotspot.nodeId) holding.add(target);
      onNodes.set(target, [...(onNodes.get(target) ?? []), hotspot]);
    }
    return [...[...onNodes].map(([nodeId, hotspots]) => ({ key: `node:${nodeId}`, nodeId, hotspots, inside: holding.has(nodeId) })), ...places];
  }, [flow.hotspots, structure, shownStructure, flow.edges, level]);

  const visibleNodes = useMemo(() => {
    // A node with hotspots glows in the colour of the most important (see studio.css)
    const glowing = new Map(hotspotSpots.flatMap((spot) => (spot.nodeId ? [[spot.nodeId, topSeverity(spot.hotspots)] as const] : [])));
    const dropOn = hotspotDropTarget?.nodeId;
    if (!hiddenLegendKeys.length && !glowing.size && !dropOn) return shownNodes;
    return shownNodes.map((node) => {
      const hidden = hiddenLegendKeys.includes(legendKeyOf(node.type));
      const severity = glowing.get(node.id);
      const target = node.id === dropOn;
      if (!hidden && !severity && !target) return node;
      const classes = [
        node.className,
        severity && `studio-hotspot studio-hotspot-${severity}`,
        target && `studio-hotspot-drop studio-hotspot-drop-${hotspotDropTarget!.severity}`,
      ];
      return asShown(node, hidden, classes.filter(Boolean).join(' '));
    });
  }, [shownNodes, hiddenLegendKeys, hotspotSpots, hotspotDropTarget]);
  const { placeholder } = connect;
  const flowNodes = useMemo(() => (placeholder ? [...visibleNodes, placeholder.node] : visibleNodes), [visibleNodes, placeholder]);

  /** Changes on L1 and L2: notes go to the canvas, removing removes from the canvas, moving arranges the level */
  const onLevelNodesChange = useStableCallback((allChanges: NodeChange[]) => {
    const changes = allChanges.filter(notPlaceholder);
    const level = levelRef.current;
    const current = levelGraphRef.current;
    if (level === 3 || !current) return;
    const notes = new Set(nodesRef.current.filter((node) => getNoteLevel(node) === level).map((node) => node.id));
    const isNote = (change: NodeChange) => 'id' in change && notes.has(change.id);
    const ofNotes = changes.filter((change) => change.type !== 'add' && isNote(change));
    if (ofNotes.length) flow.onNodesChange(ofNotes);
    const ofLevel = changes.filter((change) => !isNote(change) && change.type !== 'add');
    const onCanvas = new Set(nodesRef.current.map((node) => node.id));
    const removed = ofLevel.flatMap((change) => (change.type === 'remove' && onCanvas.has(change.id) ? [change.id] : []));
    if (removed.length) flow.deleteNodes(removed);
    const arranging = ofLevel.filter((change) => change.type !== 'remove');
    if (!arranging.length) return;
    const nodes = applyNodeChanges(arranging, current.nodes);
    updateLevelGraph({ ...current, nodes });
    const done = new Set(
      arranging.flatMap((change) =>
        (change.type === 'position' && change.dragging === false) || (change.type === 'dimensions' && change.resizing === false) ? [change.id] : []
      )
    );
    if (done.size) flow.setLevelLayout(level, levelPlaces(nodes.filter((node) => done.has(node.id))));
    const measured = arranging.flatMap((change) => {
      const dropped = change.type === 'dimensions' && change.dimensions && centring.current.get(change.id);
      const node = dropped && nodes.find((candidate) => candidate.id === change.id);
      if (!dropped || !node) return [];
      centring.current.delete(change.id);
      const { width, height } = change.dimensions!;
      const { x, y } = node.position;
      const place = { x: x + (dropped.size.width - width) / 2, y: y + (dropped.size.height - height) / 2 };
      return dropped.level === level ? [[change.id, place] as const] : [];
    });
    if (measured.length) flow.setLevelLayout(level, new Map(measured));
  });
  const onLevelConnect = useStableCallback((connection: Connection) => {
    const onCanvas = new Set(nodesRef.current.map((node) => node.id));
    if (!onCanvas.has(connection.source) || !onCanvas.has(connection.target)) return;
    flow.onConnect(connection);
    track('relation_added', { level: levelRef.current });
  });
  const onCanvasConnect = useStableCallback((connection: Connection) => {
    flow.onConnect(connection);
    track('relation_added', { level: 3 });
  });
  // Deleted (the delete key, or React Flow's own removal): counted for the visit's summary
  const onCanvasNodesChange = useStableCallback((allChanges: NodeChange[]) => {
    const changes = allChanges.filter(notPlaceholder);
    if (!changes.length) return;
    const removed = changes.filter((change) => change.type === 'remove').length;
    if (removed) bump('deleted', removed);
    flow.onNodesChange(changes);
  });
  // Message edges' envelopes only move under the pointer (the connection, or a node at either end): any moving envelope
  // needs a main-thread frame on every frame (one selected node's cost ~200–300 ms of every 3 seconds and dropped frames)
  const [hovered, setHovered] = useState<{ node?: string; edge?: string }>({});
  const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => setHovered({ node: node.id }), []);
  const onEdgeMouseEnter = useCallback((_: React.MouseEvent, edge: Edge) => setHovered({ edge: edge.id }), []);
  const onHoverEnd = useCallback(() => setHovered({}), []);
  const levelEdges = levelShown?.edges;
  const shownEdges = useMemo(() => {
    const edges = levelEdges ?? flow.edges;
    return edges.map((edge) =>
      edge.type === 'animated' && edge.id !== hovered.edge && edge.source !== hovered.node && edge.target !== hovered.node
        ? withoutEnvelope(edge)
        : edge
    );
  }, [levelEdges, flow.edges, hovered]);
  const flowEdges = useMemo(() => (placeholder ? [...shownEdges, placeholder.edge] : shownEdges), [shownEdges, placeholder]);

  // ---- Keyboard ----

  const onCanvas = () => levelRef.current === 3;
  // Everything on the canvas selected (Cmd or Ctrl + A): its comments and hotspots are part of it, until it changes
  const [allSelected, setAllSelected] = useState(false);
  const allSelectedRef = useRef(allSelected);
  allSelectedRef.current = allSelected;
  const everyNodeSelected = flow.nodes.every((node) => !isOnLevel(node, 3) || node.selected);
  useEffect(() => {
    if (allSelected && (!everyNodeSelected || level !== 3)) setAllSelected(false);
  }, [allSelected, everyNodeSelected, level]);
  const selectedThreadIds = useMemo(() => (allSelected ? new Set(flow.threads.map((thread) => thread.id)) : null), [allSelected, flow.threads]);
  const selectedHotspotIds = useMemo(() => (allSelected ? new Set(flow.hotspots.map((hotspot) => hotspot.id)) : null), [allSelected, flow.hotspots]);
  // Everything on the level shown (Cmd or Ctrl + A, on a Mac too)
  useHotkeys(
    ['mod+a', 'ctrl+a'],
    () => {
      if (!onCanvas()) {
        const shownNow = levelGraphRef.current?.nodes ?? [];
        onLevelNodesChange(shownNow.map((node) => ({ type: 'select', id: node.id, selected: true })));
        return;
      }
      flow.onNodesChange(nodesRef.current.filter((node) => isOnLevel(node, 3)).map((node) => ({ type: 'select', id: node.id, selected: true })));
      flow.onEdgesChange(edgesRef.current.map((edge) => ({ type: 'select', id: edge.id, selected: true })));
      // Comments and hotspots too: they're on the canvas
      setAllSelected(true);
    },
    { preventDefault: true }
  );
  // Everything selected, deleted: comments and hotspots go with the nodes (React Flow deletes those)
  useHotkeys(
    ['delete', 'backspace'],
    () => {
      if (!allSelectedRef.current || lockedRef.current || !onCanvas()) return;
      threadsRef.current.forEach((thread) => flow.deleteThread(thread.id));
      hotspotsRef.current.forEach((hotspot) => flow.deleteHotspot(hotspot.id));
      setOpenThreadId(null);
      setOpenHotspot(null);
      setAllSelected(false);
    }
  );
  useHotkeys(
    'mod+d',
    () => {
      const content = onCanvas() && !lockedRef.current && copyNodes(nodesRef.current, edgesRef.current, selectedIds());
      if (content) paste(content, { offset: { x: 40, y: 40 } });
    },
    { preventDefault: true }
  );
  const undo = useStableCallback(() => {
    bump('undo');
    flow.undo();
  });
  const redo = useStableCallback(() => {
    bump('redo');
    flow.redo();
  });
  useHotkeys('mod+z', () => !lockedRef.current && undo(), { preventDefault: true });
  useHotkeys(['mod+shift+z', 'mod+y'], () => !lockedRef.current && redo(), { preventDefault: true });
  // Drawing tools' keys: V to select, T for text (N for a note is the view's), 1-3 for the levels, Shift+1 to fit
  useHotkeys('t', () => pickTool('text'));
  useHotkeys('c', () => pickTool('comment'));
  // A for attention: a hotspot
  useHotkeys('a', () => pickTool('hotspot'));
  useHotkeys('v', () => setTool('select'));
  useHotkeys('h', () => setTool('hand'));
  useHotkeys(['1', '2', '3'], (event) => {
    const next = Number(event.code.replace('Digit', '')) as Level;
    changeLevel(next);
  });
  useHotkeys('shift+1', () => void fitView({ ...fitOptions, duration: 500 }), { useKey: false });
  useHotkeys('escape', () => {
    setAllSelected(false);
    setTool('select');
    setDraft(null);
    setOpenThreadId(null);
    setHotspotDraft(null);
    setOpenHotspot(null);
    flow.onNodesChange(nodesRef.current.filter((node) => node.selected).map((node) => ({ type: 'select', id: node.id, selected: false })));
    flow.onEdgesChange(edgesRef.current.filter((edge) => edge.selected).map((edge) => ({ type: 'select', id: edge.id, selected: false })));
  });

  // ---- Clicking ----

  const flowPositionOf = (event: { clientX: number; clientY: number }) => screenToFlowPosition({ x: event.clientX, y: event.clientY });
  // A place on L1 or L2 is on that level (they're laid out on their own): what's put there says so
  const placeLevel = () => (levelRef.current === 3 ? {} : { level: levelRef.current as 1 | 2 });
  // The nodes shown now (on L1 and L2 they're the level's, where they are there)
  const shownLookup = () => new Map<string, Node>(shownNodesRef.current.map((node) => [node.id, node]));

  const onPaneClick = useStableCallback((event: ReactMouseEvent) => {
    onPaneClicked?.();
    setAllSelected(false);
    // An open hotspot closes on a click anywhere else on the canvas
    setOpenHotspot(null);
    if (tool === 'hand') return;
    // Commenting: a pin where it's clicked, and its comment written there
    if (tool === 'comment') return startComment({ ...anchorAt(flowPositionOf(event)), ...placeLevel() });
    // Flagging: a hotspot where it's clicked
    if (tool === 'hotspot') return startHotspot({ position: flowPositionOf(event), ...placeLevel() });
    // The text and note tools: put where it's clicked, then back to selecting
    if (tool !== 'select') {
      setTool('select');
      if (tool === 'text') return writeTextAt(flowPositionOf(event));
      return void addNoteAt(flowPositionOf(event));
    }
    // A click inside a container (not on something in it) selects it
    const container = editable ? findGroupAtPoint(flowPositionOf(event), nodesRef.current) : undefined;
    if (container) queueMicrotask(() => flow.onNodesChange([{ type: 'select', id: container.id, selected: true }]));
  });
  // Double clicking a node opens its details, as its Edit button does (notes and text are written on instead, by
  // double clicking them), as EventCatalog's Studio does
  const onNodeDoubleClick = useStableCallback((_: ReactMouseEvent, node: Node) => {
    // On L1 and L2 too: what's there is on the canvas (a system card is the system)
    if (!isWrittenOnCanvas(node.type) && nodesRef.current.some((other) => other.id === node.id)) onNodeClicked?.(node);
  });
  // ...and inside a container (not on something in it): its body lets the pointer through, so it's on the canvas
  // ...and anywhere else on the canvas writes there, as on Excalidraw's
  const onCanvasDoubleClick = useStableCallback((event: ReactMouseEvent) => {
    if (!(event.target as Element).classList?.contains('react-flow__pane')) return;
    const container = editable ? findGroupAtPoint(flowPositionOf(event), nodesRef.current) : undefined;
    if (container) return onNodeClicked?.(container);
    if (lockedRef.current) return;
    writeTextAt(flowPositionOf(event));
  });
  // A node's details open from its Edit button (not on a click: clicking selects, to move or connect it)
  // (hidden while things move: see studio.css)
  const selectedNodes = visibleNodes.filter((node) => node.selected);
  const toEdit = selectedNodes.length === 1 && !isWrittenOnCanvas(selectedNodes[0].type) ? selectedNodes[0] : undefined;
  const editNode = useStableCallback(() => toEdit && onNodeClicked?.(toEdit));

  // A node clicked with the comment tool: the pin's on it (and moves with it)
  const onNodeClick = useStableCallback((event: ReactMouseEvent, node: Node) => {
    setOpenHotspot(null);
    // Not on notes and text: they're written on, not what's being flagged or commented on
    if (isWrittenOnCanvas(node.type)) return;
    // A hotspot on it (it shows on the node, wherever it goes, on every level it's on)
    if (tool === 'hotspot') return startHotspot({ nodeId: node.id, position: flowPositionOf(event) });
    if (tool !== 'comment') return;
    // On a domain or system, it's at that place (it doesn't go in containers)
    if (isGroupType(node.type)) return startComment({ ...anchorAt(flowPositionOf(event)), ...placeLevel() });
    startComment(anchorAt(flowPositionOf(event), node, shownLookup()));
  });

  // ---- A connection's label, written over it (double click it) ----
  const [editingEdge, setEditingEdge] = useState<{ id: string; x: number; y: number; text: string } | null>(null);
  const onEdgeDoubleClick = useStableCallback((event: ReactMouseEvent, edge: Edge) => {
    if (levelRef.current !== 3 || lockedRef.current) return;
    const written = (edge.data as { customLabel?: string } | undefined)?.customLabel;
    // What it says now (without the agent's "(inferred)")
    const text = written ?? String(edge.label ?? '').replace(/\(inferred\)/, '').replace(/\s+/g, ' ').trim();
    setEditingEdge({ id: edge.id, x: event.clientX, y: event.clientY, text });
  });
  const saveEdgeLabel = useStableCallback((text: string) => {
    if (!editingEdge) return;
    // Nothing written: EventCatalog's wording for what it joins again
    flow.setEdgeLabel(editingEdge.id, text.trim() || undefined);
    setEditingEdge(null);
  });

  // ---- The right-click menu ----

  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  // Drawing tools' tools: text (T) and sticky notes (N) are put where the canvas is next clicked (the cursor's a +),
  // and the hand (H) drags the canvas around (nothing on it is picked up)
  const [tool, setTool] = useState<CanvasTool>('select');
  const placing = tool === 'text' || tool === 'note';

  // ---- Comments, as Studio's: pins on the canvas (L3), each a thread people reply to and resolve ----
  const [draft, setDraft] = useState<CommentAnchor | null>(null);
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [listingComments, setListingComments] = useState(false);
  const noThreadsSelected = useMemo(() => new Set<string>(), []);
  const startComment = useStableCallback((anchor: CommentAnchor) => {
    setOpenThreadId(null);
    setDraft(anchor);
    setTool('select');
  });
  const createComment = useStableCallback((text: string) => {
    if (!draft) return;
    // Posted, it's a pin like the others (not opened): click it to see or reply to it
    flow.createThread(draft, text, author);
    track('comment_added', { on: draft.nodeId ? 'node' : 'place', level: levelRef.current });
    setDraft(null);
  });
  const cancelDraft = useCallback(() => setDraft(null), []);
  const replyToComment = useStableCallback((id: string, text: string) => {
    flow.replyToThread(id, text, author);
    track('comment_replied');
  });
  const resolveComment = useStableCallback((id: string, resolved: boolean) => {
    flow.setThreadResolved(id, resolved);
    track(resolved ? 'comment_resolved' : 'comment_reopened');
  });
  const deleteComment = useStableCallback((id: string) => {
    flow.deleteThread(id);
    setOpenThreadId((open) => (open === id ? null : open));
  });
  // From the list: the canvas goes to it (on L3, where comments are), with room for its panel on the right
  const openCommentFromList = useStableCallback((thread: CommentThread) => {
    // On a node shown here, it's here; on another, on L3; at a place, on its level
    const shownHere = thread.nodeId && shownLookup().has(thread.nodeId);
    const target = shownHere ? levelRef.current : thread.nodeId ? 3 : (thread.level ?? 3);
    if (target !== levelRef.current) changeLevel(target);
    const { x, y } = getAnchorPosition(thread, shownHere ? shownLookup() : lookupNodes());
    void setCenter(x + 150, y, { zoom: Math.max(getZoom(), 0.8), duration: 300 });
    setDraft(null);
    setOpenThreadId(thread.id);
    setListingComments(false);
  });
  const openComments = flow.threads.filter((thread) => !thread.resolved).length;
  // What the bottom left controls show of them (the same objects while that's the same: they're memoised, and they'd
  // otherwise re-render, with every button and tooltip in them, on every drag frame)
  const toggleCommentList = useCallback(() => {
    setListingHotspots(false);
    setListingComments((shown) => !shown);
  }, []);
  const toggleHotspotList = useCallback(() => {
    setListingComments(false);
    setListingHotspots((shown) => !shown);
  }, []);
  const commentsControl = useMemo(
    () => ({ open: openComments, onToggle: toggleCommentList, active: listingComments }),
    [openComments, toggleCommentList, listingComments]
  );
  const hotspotsCount = flow.hotspots.length;
  const hotspotsSeverity = topSeverity(flow.hotspots);
  // The comments on the level shown: on a node it shows, or at a place on it
  const threadsShown = useMemo(() => {
    const shown = new Set(shownNodesRef.current.map((node) => node.id));
    return flow.threads.filter((thread) => (thread.nodeId ? shown.has(thread.nodeId) : (thread.level ?? 3) === level));
  }, [flow.threads, shownStructure, level]);
  // Moved (or the one being written moved): onto a node, or to a place on the level shown
  const moveComment = useStableCallback((id: string, anchor: CommentAnchor) => flow.moveThread(id, anchor.nodeId ? anchor : { ...anchor, ...placeLevel() }));
  const moveDraft = useStableCallback((anchor: CommentAnchor) => setDraft(anchor.nodeId ? anchor : { ...anchor, ...placeLevel() }));

  // ---- Hotspots: what's flagged for people to know (risks, problems, the key parts), on nodes or places ----
  const [hotspotDraft, setHotspotDraft] = useState<HotspotDraft | null>(null);
  const [openHotspot, setOpenHotspot] = useState<string | null>(null);
  const [listingHotspots, setListingHotspots] = useState(false);
  const hotspotsControl = useMemo(
    () => ({ count: hotspotsCount, severity: hotspotsSeverity, onToggle: toggleHotspotList, active: listingHotspots }),
    [hotspotsCount, hotspotsSeverity, toggleHotspotList, listingHotspots]
  );
  const startHotspot = useStableCallback((at: HotspotDraft) => {
    setOpenHotspot(null);
    setDraft(null);
    setHotspotDraft(at);
    setTool('select');
  });
  const createHotspot = useStableCallback((fields: HotspotFields) => {
    if (!hotspotDraft) return;
    flow.createHotspot({
      ...fields,
      ...(hotspotDraft.nodeId ? { nodeId: hotspotDraft.nodeId } : hotspotDraft.level && { level: hotspotDraft.level }),
      position: hotspotDraft.position,
      author,
    });
    track('hotspot_added', { severity: fields.severity, on: hotspotDraft.nodeId ? 'node' : 'place', level: levelRef.current });
    setHotspotDraft(null);
  });
  const cancelHotspot = useCallback(() => setHotspotDraft(null), []);
  const deleteHotspot = useStableCallback((id: string) => flow.deleteHotspot(id));
  // Dragged onto a node (they move with it), or to a place; open where it lands if it was open
  const moveHotspots = useStableCallback((ids: string[], to: { nodeId?: string; position: XYPosition }) => {
    const at = to.nodeId ? {} : placeLevel();
    ids.forEach((id) => flow.updateHotspot(id, { nodeId: to.nodeId, position: to.position, level: 'level' in at ? at.level : undefined }));
    setOpenHotspot((open) => (open ? (to.nodeId ? `node:${to.nodeId}` : ids.length === 1 ? `place:${ids[0]}` : null) : open));
  });
  // From the list (or inside a node on L1 and L2): the canvas goes to it on L3, and it opens
  const goToHotspot = useStableCallback((hotspot: Hotspot) => {
    // On a node shown here, it's here; on another, on L3; at a place, on its level
    const shownHere = hotspot.nodeId && shownLookup().has(hotspot.nodeId);
    const target = shownHere ? levelRef.current : hotspot.nodeId ? 3 : (hotspot.level ?? 3);
    if (target !== levelRef.current) changeLevel(target);
    const nodes = shownHere ? shownLookup() : lookupNodes();
    const node = hotspot.nodeId ? nodes.get(hotspot.nodeId) : undefined;
    const at = node ? getAbsolutePosition(node, nodes) : hotspot.position;
    const width = node ? (node.measured?.width ?? node.width ?? 0) : 0;
    void setCenter(at.x + width / 2 + 120, at.y + 80, { zoom: Math.max(getZoom(), 0.8), duration: 300 });
    setHotspotDraft(null);
    setOpenHotspot(node ? `node:${node.id}` : `place:${hotspot.id}`);
    setListingHotspots(false);
  });
  const nameOfNode = useStableCallback((id: string) => {
    const node = nodesRef.current.find((n) => n.id === id);
    return node ? getNodeName(node.type, node.data, id) : undefined;
  });
  useEffect(() => onToolChange?.(tool), [tool]);
  useEffect(() => onLockChange?.(locked), [locked]);
  const toggleLock = useStableCallback(() => {
    setTool('select');
    track('canvas_locked', { locked: !lockedRef.current });
    flow.setLocked(lockedRef.current ? null : author.name || 'Someone');
  });
  const [startWriting, setStartWriting] = useState<string | null>(null);
  /** Text written on the canvas, its first line where it's put: written straight away */
  const writeTextAt = (point: XYPosition) => {
    const size = getNodeDefinition('text')!.defaultSize!;
    // On the level it's written on (as notes are)
    const data = levelRef.current === 3 ? { text: '' } : { text: '', level: levelRef.current };
    const id = flow.insertNode('text', data, { x: point.x + size.width / 2 - 4, y: point.y + size.height / 2 - 16 });
    track('text_added', { level: levelRef.current });
    setStartWriting(id);
  };
  const pickTool = useStableCallback((next: 'text' | 'note' | 'comment' | 'hotspot') => {
    // (comments can be left on a locked canvas: reviewing it changes nothing on it)
    if (lockedRef.current && next !== 'comment') return;
    bump(`tool_${next}`);
    // Each is put on the level shown: notes and text are on it, comments and hotspots on a node (on every level
    // it's on) or at a place on it
    setTool((current) => (current === next ? 'select' : next));
  });
  const toggleTextMode = useCallback(() => pickTool('text'), [pickTool]);
  const toggleCommentMode = useCallback(() => pickTool('comment'), [pickTool]);
  const toggleHotspotMode = useCallback(() => pickTool('hotspot'), [pickTool]);
  const selectTool = useCallback(() => setTool('select'), []);
  const handTool = useCallback(() => setTool('hand'), []);
  const toggleNoteTool = useCallback(() => pickTool('note'), [pickTool]);
  const openContextMenu = useStableCallback((event: ReactMouseEvent | MouseEvent, node?: Node) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, flowPosition: flowPositionOf(event), node });
  });
  const onPaneContextMenu = useCallback((event: ReactMouseEvent | MouseEvent) => openContextMenu(event), [openContextMenu]);
  const onNodeContextMenu = useCallback((event: ReactMouseEvent, node: Node) => openContextMenu(event, node), [openContextMenu]);
  const closeContextMenu = useCallback(() => setContextMenu(null), []);
  const commentFromMenu = useStableCallback(() => {
    if (!contextMenu) return;
    startComment(
      contextMenu.node && !isGroupType(contextMenu.node.type)
        ? anchorAt(contextMenu.flowPosition, contextMenu.node, shownLookup())
        : { ...anchorAt(contextMenu.flowPosition), ...placeLevel() }
    );
    setContextMenu(null);
  });
  const reorderFromMenu = useStableCallback(() => {
    setContextMenu(null);
    onReorder();
  });
  const hotspotFromMenu = useStableCallback(() => {
    if (!contextMenu) return;
    startHotspot({ ...(contextMenu.node ? { nodeId: contextMenu.node.id } : placeLevel()), position: contextMenu.flowPosition });
    setContextMenu(null);
  });
  const menuTargets = () => {
    const node = contextMenu?.node;
    if (!node) return [];
    const selected = selectedIds();
    return selected.includes(node.id) ? selected : [node.id];
  };
  const copyFromMenu = useStableCallback(() => {
    copyOnly.current = menuTargets();
    document.execCommand('copy');
    copyOnly.current = null;
    setContextMenu(null);
  });
  const duplicateFromMenu = useStableCallback(() => {
    const content = copyNodes(nodesRef.current, edgesRef.current, menuTargets());
    if (content) paste(content, { offset: { x: 40, y: 40 } });
    setContextMenu(null);
  });
  const pasteFromMenu = useStableCallback(() => {
    if (lastCopied && contextMenu) paste(lastCopied, { at: contextMenu.flowPosition });
    setContextMenu(null);
  });
  const deleteFromMenu = useStableCallback(() => {
    const targets = menuTargets();
    bump('deleted', targets.length);
    flow.deleteNodes(targets);
    setContextMenu(null);
  });
  const noteFromMenu = useStableCallback(() => {
    if (!contextMenu) return;
    if (contextMenu.node) addNoteBeside(contextMenu.node.id);
    else addNoteAt(contextMenu.flowPosition);
    setContextMenu(null);
  });
  const menuQuestions = useMemo(() => (contextMenu?.node && questionsFor ? questionsFor(contextMenu.node) : undefined), [contextMenu, questionsFor]);

  /** A note to the right of a node, about it */
  /**
   * Text an agent writes: above the node it's about (a heading over it), else in the middle of the canvas, on the
   * level shown, as big as asked
   */
  const addTextFor = (nodeId: string | undefined, text: string, fontSize?: number) => {
    // Where it's shown on the level shown (L1 and L2 are arranged on their own, and the text is on that level)
    const lookup = shownLookup();
    const node = nodeId ? lookup.get(nodeId) : undefined;
    const size = fontSize ?? TEXT_FONT_SIZE;
    const data = {
      text,
      ...(fontSize && { fontSize }),
      ...(nodeId && { resource: nodeId }),
      ...(levelRef.current !== 3 && { level: levelRef.current }),
    };
    const at = node ? getAbsolutePosition(node, lookup) : undefined;
    const width = node ? (node.measured?.width ?? node.width ?? 240) : 0;
    // Centred over the node, clear of it by about a line of the text
    const center = at ? { x: at.x + width / 2, y: at.y - size * 1.4 } : canvasCenter();
    const id = flow.insertNode('text', data, center);
    track('text_added', { level: levelRef.current, from: 'agent' });
    return id;
  };

  const addNoteBeside = (nodeId: string, extra: Record<string, unknown> = {}) => {
    // Beside where it's shown on the level shown (L1 and L2 are arranged on their own, and the note is on that level)
    const lookup = shownLookup();
    const node = lookup.get(nodeId);
    if (!node) return addNoteAt(canvasCenter(), extra);
    const at = getAbsolutePosition(node, lookup);
    const width = node.measured?.width ?? node.width ?? 240;
    return addNoteAt({ x: at.x + width + 40 + 100, y: at.y + 88 }, { resource: nodeId, ...extra });
  };

  // ---- Something just added: selected once it's on the canvas (its details open from its Edit button, or straight
  // away when asked: what a connection was let go of to make, chosen from a list, is named next) ----

  const toOpen = useRef<{ id: string; edit: boolean } | null>(null);
  const openOnceShown = (id: string, edit = false) => (toOpen.current = { id, edit });
  useEffect(() => {
    const { id, edit } = toOpen.current ?? {};
    const node = id && flow.nodes.find((candidate) => candidate.id === id);
    if (!node) return;
    toOpen.current = null;
    flow.onNodesChange([
      ...selectedIds()
        .filter((other) => other !== node.id)
        .map((other) => ({ type: 'select' as const, id: other, selected: false })),
      { type: 'select', id: node.id, selected: true },
    ]);
    if (edit) onNodeClicked?.(node, { justMade: true });
  }, [flow.nodes]);

  // ---- For browser tests ----

  // Browser tests (tests/e2e) read the canvas through this when they've set `window.__studioTest` up before the page
  // loads (nothing's exposed otherwise): the level shown, and what's on it, placed on the canvas
  useEffect(() => {
    const hook = (window as { __studioTest?: Record<string, unknown> }).__studioTest;
    if (!hook) return;
    hook.level = () => levelRef.current;
    hook.nodes = () => {
      const shown = levelRef.current === 3 ? nodesRef.current : (levelGraphRef.current?.nodes ?? []);
      const lookup = new Map(shown.map((node) => [node.id, node]));
      return shown.map((node) => ({ id: node.id, type: node.type, parentId: node.parentId, measured: !!node.measured?.width, ...getAbsoluteRect(node, lookup) }));
    };
  }, []);

  // ---- For the diagram around it ----

  useImperativeHandle(handleRef, () => ({
    pickNoteTool: () => pickTool('note'),
    addNote: ({ nodeId, text, author, kind, fontSize } = {}) => {
      if (lockedRef.current) return;
      if (kind === 'text') return void addTextFor(nodeId, text ?? '', fontSize);
      const extra = { ...(text && { text }), ...(author && { author }) };
      if (nodeId) addNoteBeside(nodeId, extra);
      else addNoteAt(canvasCenter(), extra);
    },
    centreOn: (nodeId) => {
      if (levelRef.current !== 3 && !levelGraphRef.current?.nodes.some((node) => node.id === nodeId)) changeLevel(3);
      const lookup = lookupNodes();
      const node = lookup.get(nodeId);
      if (!node) return;
      const at = getAbsolutePosition(node, lookup);
      const width = node.measured?.width ?? node.width ?? 240;
      const height = node.measured?.height ?? node.height ?? 120;
      flow.onNodesChange([
        ...selectedIds()
          .filter((id) => id !== nodeId)
          .map((id) => ({ type: 'select' as const, id, selected: false })),
        { type: 'select', id: nodeId, selected: true },
      ]);
      void setCenter(at.x + width / 2, at.y + height / 2, { zoom: 1, duration: 450 });
    },
    snapshot,
    hasLoaded: (content) => flow.hasLoaded(content),
    reorder: () => void reorder(),
    tidy: () => {
      void reorder();
      tidyCanvasWhenShown.current = levelRef.current !== 3 && !cursors;
    },
    readDocument: () => flow.readDocument(),
    applyAgentCanvas: (target, before) => flow.applyAgentCanvas(target, before),
    showNodes: (nodeIds) => {
      const shown = nodesRef.current.filter((node) => nodeIds.includes(node.id));
      const area = document.querySelector('.studio-canvas .react-flow')?.getBoundingClientRect();
      if (!shown.length || !area) return;
      const { x, y, zoom } = getViewport();
      const bounds = getNodesBounds(shown);
      const inView =
        bounds.x * zoom + x >= 0 &&
        bounds.y * zoom + y >= 0 &&
        (bounds.x + bounds.width) * zoom + x <= area.width &&
        (bounds.y + bounds.height) * zoom + y <= area.height;
      if (inView) return;
      const ids = new Set(shown.map((node) => node.id));
      edgesRef.current.forEach((edge) => {
        if (ids.has(edge.source) || ids.has(edge.target)) ids.add(ids.has(edge.source) ? edge.target : edge.source);
      });
      void fitView({ nodes: [...ids].map((id) => ({ id })), padding: 0.2, maxZoom: zoom, duration: 450 });
    },
    updateNode: (nodeId, fields) => {
      const node = nodesRef.current.find((candidate) => candidate.id === nodeId);
      if (node) flow.updateNodeData(nodeId, (data) => updateResource(node.type, data, fields));
    },
  }));

  return (
    <UpdateNodeDataContext.Provider value={flow.updateNodeData}>
      <EditingContext.Provider value={editingTo}>
      <DropTargetContext.Provider value={dropTargetId}>
        <StartWritingContext.Provider value={startWriting}>
          <LockedContext.Provider value={locked}>
            <div className="flex h-full min-h-0 text-[rgb(var(--ec-page-text))]">
              <div
                ref={(element) => {
                  canvasRef.current = element;
                  areaRef?.(element);
                }}
                className={`eventcatalog-visualizer studio-canvas relative min-w-0 flex-1 ${transitioning ? 'is-layout-transition' : ''} ${placing || tool === 'comment' || tool === 'hotspot' ? 'is-placing' : ''} ${tool === 'hand' ? 'is-panning' : ''}`}
                onPointerMove={trackPointer}
                onAnimationEnd={onNodeShown}
                onPointerLeave={clearPointer}
                onDoubleClick={onCanvasDoubleClick}
              >
                <ReactFlow
                  nodes={flowNodes}
                  edges={flowEdges}
                  onNodeMouseEnter={onNodeMouseEnter}
                  onNodeMouseLeave={onHoverEnd}
                  onEdgeMouseEnter={onEdgeMouseEnter}
                  onEdgeMouseLeave={onHoverEnd}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  nodesDraggable={!locked && tool !== 'hand'}
                  nodesConnectable={!locked && tool !== 'hand'}
                  elementsSelectable={tool !== 'hand'}
                  onNodesChange={editable ? onCanvasNodesChange : onLevelNodesChange}
                  onEdgesChange={editable ? flow.onEdgesChange : undefined}
                  onConnect={editable ? onCanvasConnect : onLevelConnect}
                  onConnectEnd={connect.onConnectEnd}
                  edgesReconnectable={editable && !locked}
                  onReconnect={editable ? flow.onReconnect : undefined}
                  onReconnectStart={connect.onReconnectStart}
                  onReconnectEnd={connect.onReconnectEnd}
                  reconnectRadius={RECONNECT_RADIUS}
                  onDragOver={locked ? undefined : onDragOver}
                  onDrop={locked ? undefined : onDrop}
                  onMoveStart={onMoveStart}
                  onMoveEnd={onMoveEnd}
                  onNodeDragStart={onNodeDragStart}
                  onNodeDrag={onNodeDrag}
                  onNodeDragStop={onNodeDragStop}
                  onPaneClick={onPaneClick}
                  onNodeClick={onNodeClick}
                  onEdgeDoubleClick={onEdgeDoubleClick}
                  onNodeDoubleClick={onNodeDoubleClick}
                  onError={onFlowError}
                  onPaneContextMenu={locked ? undefined : onPaneContextMenu}
                  onNodeContextMenu={locked ? undefined : onNodeContextMenu}
                  connectionLineType={ConnectionLineType.SmoothStep}
                  connectionRadius={40}
                  deleteKeyCode={locked ? null : DELETE_KEYS}
                  multiSelectionKeyCode={MULTI_SELECTION_KEYS}
                  selectionOnDrag={tool !== 'hand'}
                  panOnDrag={tool === 'hand' ? true : PAN_BUTTONS}
                  panOnScroll
                  zoomActivationKeyCode={ZOOM_KEYS}
                  zoomOnDoubleClick={false}
                  // A note or text being written takes focus: the camera stays where it was put
                  autoPanOnNodeFocus={false}
                  minZoom={0.1}
                  maxZoom={2}
                  proOptions={{ hideAttribution: true }}
                >
                  <DiagramBackground />
                  <RemeasureHandles />
                  {/* Above the selected node's top right corner: its details, to edit them */}
                  {toEdit && <EditButton nodeId={toEdit.id} locked={locked} onClick={editNode} />}
                  <Legend legend={legend} hiddenKeys={hiddenLegendKeys} onToggle={toggleLegendKey} />
                  {peers && peers.length > 0 && cursors && <LiveCursors people={peers} source={cursors} />}
                  {/* Comments on the level shown: on its nodes, and at places on it */}
                  {(
                    <CommentLayer
                      threads={threadsShown}
                      author={author}
                      openThreadId={openThreadId}
                      draft={draft}
                      showResolved={showResolved}
                      onOpen={setOpenThreadId}
                      onCreate={createComment}
                      onCancelDraft={cancelDraft}
                      onReply={replyToComment}
                      onResolve={resolveComment}
                      onDelete={deleteComment}
                      onMove={moveComment}
                      onMoveDraft={moveDraft}
                      selectedIds={selectedThreadIds ?? noThreadsSelected}
                      selectionOffset={null}
                      live={live}
                    />
                  )}
                  {/* Hotspots on every level (on L1 and L2, on what they're in) */}
                  <HotspotLayer
                    spots={hotspotSpots}
                    openKey={openHotspot}
                    draft={hotspotDraft}
                    locked={locked}
                    movable={!locked}
                    selectedIds={selectedHotspotIds}
                    onMove={moveHotspots}
                    onDropTarget={setHotspotDropTarget}
                    onOpen={setOpenHotspot}
                    onCreate={createHotspot}
                    onCancelDraft={cancelHotspot}
                    onUpdate={flow.updateHotspot}
                    onDelete={deleteHotspot}
                    onGo={goToHotspot}
                    live={live}
                  />
                </ReactFlow>

                {!editable && (
                  <div className="absolute left-1/2 top-16 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full border px-4 py-1.5 text-xs shadow-sm bg-[rgb(var(--ec-card-bg))] border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text))]">
                    <span>
                      <span className="font-semibold">L{level}</span> · {LEVELS.find((entry) => entry.level === level)?.description}
                    </span>
                    <button onClick={editInL3} className="font-semibold text-[rgb(var(--ec-accent))] hover:underline">
                      Everything is on L3
                    </button>
                  </div>
                )}

                <CanvasControls
                  level={level}
                  onLevelChange={changeLevel}
                  editable={editable}
                  locked={locked}
                  onToggleLock={toggleLock}
                  lockedBy={lockedBy}
                  selectMode={tool === 'select'}
                  onSelectMode={selectTool}
                  handMode={tool === 'hand'}
                  onHandMode={handTool}
                  noteMode={tool === 'note'}
                  onToggleNoteMode={toggleNoteTool}
                  textMode={tool === 'text'}
                  commentMode={tool === 'comment'}
                  onToggleCommentMode={toggleCommentMode}
                  hotspotMode={tool === 'hotspot'}
                  onToggleHotspotMode={toggleHotspotMode}
                  onToggleTextMode={toggleTextMode}
                  extras={barExtras}
                />

                <ContextMenu
                  menu={contextMenu}
                  questions={menuQuestions}
                  onCopy={copyFromMenu}
                  onDuplicate={duplicateFromMenu}
                  onPaste={lastCopied ? pasteFromMenu : undefined}
                  onAddNote={noteFromMenu}
                  onAddComment={commentFromMenu}
                  onAddHotspot={!locked ? hotspotFromMenu : undefined}
                  onReorder={locked ? undefined : reorderFromMenu}
                  onDeleteNode={deleteFromMenu}
                  onClose={closeContextMenu}
                />

                {editingEdge && (
                  <input
                    autoFocus
                    aria-label="What the connection says"
                    defaultValue={editingEdge.text}
                    maxLength={80}
                    placeholder="What it says (empty: the usual wording)"
                    onFocus={(event) => event.currentTarget.select()}
                    onBlur={(event) => saveEdgeLabel(event.currentTarget.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') event.currentTarget.blur();
                      if (event.key === 'Escape') {
                        event.stopPropagation();
                        setEditingEdge(null);
                      }
                    }}
                    className="fixed z-50 w-56 -translate-x-1/2 -translate-y-1/2 rounded-md border border-[rgb(var(--ec-accent))] bg-[rgb(var(--ec-card-bg))] px-2 py-1 text-center text-xs font-medium text-[rgb(var(--ec-page-text))] shadow-lg outline-none"
                    style={{ left: editingEdge.x, top: editingEdge.y }}
                  />
                )}
                {connect.chooser && <ConnectChooser {...connect.chooser} />}
                {chooser && <ContainerChooser kind={chooser.kind} position={flowToScreenPosition(chooser.point)} onChoose={choose} onCancel={cancelChooser} />}
                {/* The components to add, under the diagram's menu (drawn by the children) */}
                {showPanel && !locked && <Palette level={level} onAddComponent={addComponent} footer={paletteFooter} />}
                {/* All the comments, over the bottom left controls: clicking one goes to it on the canvas */}
            {listingComments && (
              <div className="absolute bottom-[64px] left-3 z-20 flex max-h-[min(480px,calc(100%-140px))] w-80 flex-col overflow-hidden rounded-xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] shadow-xl">
                <div className="flex flex-none items-center justify-between border-b border-[rgb(var(--ec-page-border))] px-3 py-2 text-sm font-semibold">
                  Comments
                  <button type="button" aria-label="Close" onClick={() => setListingComments(false)} className="rounded p-1 text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-content-hover))]!">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <CommentList threads={flow.threads} showResolved={showResolved} onToggleResolved={() => setShowResolved((shown) => !shown)} onOpen={openCommentFromList} />
                </div>
              </div>
            )}
            {/* All the hotspots, most important first: clicking one goes to it */}
            {listingHotspots && (
              <div className="absolute bottom-[64px] left-3 z-20 flex max-h-[min(480px,calc(100%-140px))] w-80 flex-col overflow-hidden rounded-xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] shadow-xl">
                <div className="flex flex-none items-center justify-between border-b border-[rgb(var(--ec-page-border))] px-3 py-2 text-sm font-semibold">
                  Hotspots
                  <button type="button" aria-label="Close" onClick={() => setListingHotspots(false)} className="rounded p-1 text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-content-hover))]!">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <HotspotList hotspots={flow.hotspots} nameOf={nameOfNode} onOpen={goToHotspot} />
                </div>
              </div>
            )}
            {/* Bottom left: zoom, undo and redo (as Excalidraw's), then what the view puts there */}
                <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
                  <ViewControls
                    canUndo={flow.canUndo && !locked}
                    canRedo={flow.canRedo && !locked}
                    onUndo={undo}
                    onRedo={redo}
                    onReorder={onReorder}
                    reorderLabel={editable ? "Reorder diagram (the visualiser's layout)" : `Reorder L${level} (the visualiser's layout)`}
                    locked={locked}
                    fitOptions={fitOptions}
                    comments={commentsControl}
                    hotspots={hotspotsControl}
                  />
                  {footer}
                </div>
                {children}
              </div>
            </div>
          </LockedContext.Provider>
        </StartWritingContext.Provider>
      </DropTargetContext.Provider>
      </EditingContext.Provider>
    </UpdateNodeDataContext.Provider>
  );
}
