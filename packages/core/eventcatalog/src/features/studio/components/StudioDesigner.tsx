import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent as ReactMouseEvent } from 'react';
import {
  applyNodeChanges,
  ConnectionLineType,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type XYPosition,
} from '@xyflow/react';
import { DiagramBackground, edgeTypes, getLegend, LegendPanel, pauseEdgeAnimations } from '@eventcatalog/visualiser';
import { useHotkeys } from 'react-hotkeys-hook';
import { getCatalogConnections, indexCatalog, planWithConnections, type ConnectionGroup } from '../canvas-actions';
import { getDiagramLevel, getDiagramLevelUnavailable, isDecided, type LevelPlace } from '../canvas-doc';
import { CLIPBOARD_TYPE, copyNodes, pasteNodes, readClipboard, type ClipboardContent } from '../clipboard';
import { keepUnchanged, LOCAL_EDGE_KEYS, LOCAL_NODE_KEYS } from '../flow-state';
import type { CatalogRelation, CatalogResource } from '../catalog-resources';
import {
  buildContainer,
  buildContainerWithContents,
  canBeContainer,
  catalogNodeData,
  getCatalogLink,
  getContents,
  getRelatedEdges,
} from '../catalog';
import {
  findDropTarget,
  containerFor,
  findGroupAtPoint,
  getAbsolutePosition,
  getAbsoluteRect,
  previewContainerGrowth,
  sizeOf,
  sortByHierarchy,
  toRelativePosition,
} from '../grouping';
import type { Peer } from '../hooks/presence-store';
import { useCanvasWebMcp } from '../hooks/use-canvas-webmcp';
import { useStudioFlow } from '../hooks/use-studio-flow';
import { useComments, type CommentAnchor, type Thread } from '../hooks/use-comments';
import { getLayoutPositions, layoutGraph } from '../layout';
import { getLevelGraph, getLevelUnavailableReason, LEVELS, type Level } from '../levels';
import { arrangeLevel, getLevelNodeSize, levelPlaces, withDiagramRoutes } from '../level-layout';
import {
  canGoInContainer,
  getNodeDefinition,
  getNodeLabel,
  getNodeName,
  getNoteLevel,
  isOnLevel,
  isShownOnLevel,
  isWrittenOnCanvas,
} from '../node-types';
import type { ToolSync } from '../tool-sync';
import CanvasControls, { FIT_VIEW_OPTIONS } from './CanvasControls';
import CanvasHeader from './CanvasHeader';
import { DropTargetContext, nodeTypes, UpdateNodeDataContext } from './canvas-nodes';
import { anchorAt, CanvasContextMenu, CommentLayer, getAnchorPosition, timeAgo, type ContextMenuState } from './Comments';
import { CANVAS_STATUS_LOOK } from './status';
import ConnectAgentDialog, { enableWebMcp, isRelayEnabled, isWebMcpEnabled, loadRelay } from './ConnectAgentDialog';
import ContainerChooser, { type ContainerChoice } from './ContainerChooser';
import ConnectionsChooser, { type ConnectionsChoice } from './ConnectionsChooser';
import JoinForm from './JoinForm';
import { colorForName, getStoredName, onStoredNameChange, storeName } from '../identity';
import LeftPanel, { CATALOG_DRAG_TYPE, COMPONENT_DRAG_TYPE } from './LeftPanel';
import { AgentActivity, RemotePresence, ViewportSharer } from './Presence';
import PropertiesPanel from './PropertiesPanel';
import ShareDialog from './ShareDialog';
import DeleteCanvasDialog from './DeleteCanvasDialog';
import { deleteCanvasThroughApi } from '../api/client';

type CanvasProps = {
  canvasId: string;
  /** Path of the collaboration socket on this site, or `socketUrl` when embedded elsewhere (e.g. an MCP App) */
  socketPath?: string;
  socketUrl?: string;
  /** Where "New canvas" goes (hidden when not given, e.g. inside a chat) */
  newCanvasUrl?: string;
  /** The Studio page (where you go after deleting the canvas, or finding it deleted) */
  studioUrl?: string;
  /** The Studio API's canvases on this site: deleting the canvas is offered when given (not inside a chat) */
  canvasesApiUrl?: string;
  /** The canvas's link, for Share (defaults to this page) */
  shareUrl?: string;
  /** The EventCatalog MCP server agents connect to (a path on this site, or a URL) */
  mcpUrl?: string;
  /** The WebMCP local relay's script, when this page can offer it (not inside a chat) */
  relayScriptPath?: string;
  /** Canvases are only kept in memory, until the server restarts (`storage` is "memory") */
  keptInMemory?: boolean;
  /** Sync through MCP tool calls when the WebSocket can't connect (e.g. inside a chat's sandbox) */
  syncViaTools?: ToolSync;
  /** Follow agents' changes with the camera from the start (e.g. inside a chat, where you watch an agent work) */
  followChanges?: boolean;
  /** Told what's selected (e.g. a chat attaches it to the conversation, so you can ask about it) */
  onSelectionChange?: (selected: SelectedNode[]) => void;
  /** Join with this name instead of asking for one (e.g. inside a chat, where the agent or host knows who it is) */
  defaultName?: string;
  /** Signed in with the catalog's sign-in (SSO): you're shown by this name and picture, and can't change them */
  signedInAs?: { name: string; picture?: string };
  resources: CatalogResource[];
  relations: CatalogRelation[];
};
/** A selected node, as told to whoever embeds the canvas */
export type SelectedNode = { id: string; name: string; type: string; catalogResource?: string };

/** How long a level (L1, L2) waits for changes to settle before it's laid out again */
const LEVEL_RELAYOUT_MS = 300;

/**
 * Where something added goes. While L1 or L2 is shown it's added to the canvas people edit (L3), below what's on it
 * or in the container it's dropped in, and kept on the level where it's dropped.
 */
/** Where a node of this size goes to be centred on a point */
const centredOn = (center: XYPosition, size: { width: number; height: number }): LevelPlace => ({
  x: center.x - size.width / 2,
  y: center.y - size.height / 2,
});

type Landing = {
  /** Where it was dropped (or added), in what's shown */
  point: XYPosition;
  /** Where it's centred on the canvas, and the container it goes in there (else the one at that point, if any) */
  center: XYPosition;
  inside?: string;
  /**
   * Where it's centred on the level it was dropped on (in the container's coordinates when it's in one), and the
   * size it's drawn at there before it's measured
   */
  onLevel?: { level: 1 | 2; center: XYPosition; size: { width: number; height: number } };
};
const DELETE_KEYS = ['Backspace', 'Delete'];
const NO_THREADS: ReadonlySet<string> = new Set();
// React Flow's warnings, except that a handle has no node: the left panel's drag previews draw nodes off the canvas
const onFlowError = (code: string, message: string) => {
  if (code !== '010') console.warn(message);
};
const MULTI_SELECTION_KEYS = ['Meta', 'Shift'];
/**
 * Like design tools: dragging on the canvas draws a box to select what's inside it, and the canvas pans with
 * space + drag, the middle mouse button, or scrolling (two fingers on a trackpad). Pinch, or cmd / ctrl + scroll,
 * zooms. The right button stays for the context menu.
 */
const PAN_BUTTONS = [1];
/** How close to a connection's end you grab it to move it */
const RECONNECT_RADIUS = 14;
const ZOOM_KEYS = ['Meta', 'Control'];
const DEFAULT_SOCKET_PATH = '/_eventcatalog/studio';

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

/** Ids, types and containers: what changes when nodes are added, removed or moved in or out of containers */
// Notes on L1 and L2 can be moved and selected there, unlike the rest of the level (made once per note, so a note
// keeps its identity until it changes)
const levelNotes = new WeakMap<Node, Node>();
const asLevelNote = (node: Node) => {
  let note = levelNotes.get(node);
  if (!note) levelNotes.set(node, (note = { ...node, draggable: true, selectable: true }));
  return note;
};

const structureOf = (nodes: Node[]) => nodes.map((node) => `${node.id}:${node.type}:${node.parentId ?? ''}`).join('|');

export default function StudioDesigner({ defaultName, signedInAs, ...props }: CanvasProps) {
  const [name, setName] = useState(() => getStoredName() ?? defaultName ?? null);

  const saveName = useCallback((next: string) => {
    setName(next);
    storeName(next);
  }, []);
  // Renamed on the Studio page or another canvas in this browser
  useEffect(() => onStoredNameChange((next) => next && setName(next)), []);

  if (signedInAs) {
    return (
      <ReactFlowProvider>
        <Canvas {...props} name={signedInAs.name} picture={signedInAs.picture} />
      </ReactFlowProvider>
    );
  }
  if (!name) return <JoinForm onJoin={saveName} />;

  return (
    <ReactFlowProvider>
      <Canvas {...props} name={name} onRename={saveName} />
    </ReactFlowProvider>
  );
}

const toSocketUrl = (socketPath = DEFAULT_SOCKET_PATH) =>
  `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}${socketPath}`;

function Canvas({
  canvasId,
  socketPath,
  socketUrl,
  newCanvasUrl,
  studioUrl,
  canvasesApiUrl,
  shareUrl,
  mcpUrl = '/docs/mcp',
  relayScriptPath,
  keptInMemory = false,
  syncViaTools,
  followChanges = false,
  onSelectionChange,
  resources,
  relations,
  name,
  picture,
  onRename,
}: Omit<CanvasProps, 'defaultName' | 'signedInAs'> & {
  name: string;
  picture?: string;
  /** Not given when you're signed in (your name is the one you signed in with) */
  onRename?: (name: string) => void;
}) {
  const color = colorForName(name);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Nodes glide to their new place after a layout (anyone's) or a level change (not while editing: it would make dragging lag)
  const [transitioning, setTransitioning] = useState(false);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const glide = useCallback(() => {
    setTransitioning(true);
    clearTimeout(transitionTimer.current);
    transitionTimer.current = setTimeout(() => setTransitioning(false), 600);
  }, []);

  // Containers grow smoothly when they're fitted to what's in them (or someone else resizes them). Set on the
  // element rather than in state, so it doesn't re-render the canvas.
  const resizeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const animateContainers = useCallback(() => {
    canvasRef.current?.classList.add('is-container-resize');
    clearTimeout(resizeTimer.current);
    resizeTimer.current = setTimeout(() => canvasRef.current?.classList.remove('is-container-resize'), 400);
  }, []);

  const flow = useStudioFlow({
    canvasId,
    socketUrl: socketUrl ?? toSocketUrl(socketPath),
    name,
    color,
    picture,
    syncViaTools,
    onLayout: glide,
    onContainerResize: animateContainers,
  });
  const author = useMemo(() => ({ name, color, ...(picture && { picture }) }), [name, color, picture]);
  const comments = useComments(flow.doc, author);
  const { screenToFlowPosition, flowToScreenPosition, setCenter, getZoom, fitView } = useReactFlow();

  const catalog = useMemo(() => indexCatalog(resources, relations), [resources, relations]);

  const nodesRef = useRef(flow.nodes);
  nodesRef.current = flow.nodes;
  const edgesRef = useRef(flow.edges);
  edgesRef.current = flow.edges;
  const lookupNodes = () => new Map(nodesRef.current.map((node) => [node.id, node]));
  /** Selects just these nodes, changing only those whose selection changes (each change copies its node) */
  const select = (ids: ReadonlySet<string>) => {
    const changes: NodeChange[] = nodesRef.current.flatMap((node) =>
      !!node.selected === ids.has(node.id) ? [] : [{ type: 'select' as const, id: node.id, selected: ids.has(node.id) }]
    );
    if (changes.length) flow.onNodesChange(changes);
  };

  // Agents in the browser (WebMCP) work on this canvas through the page, as the user's agent. Browsers without
  // WebMCP of their own get it through the polyfill once someone turns it on (Connect agent).
  const [webMcpEnabled, setWebMcpEnabled] = useState(isWebMcpEnabled);
  const turnOnWebMcp = useCallback(() => {
    enableWebMcp();
    setWebMcpEnabled(true);
  }, []);
  const webMcp = useCanvasWebMcp({
    allowPolyfill: webMcpEnabled,
    doc: flow.doc,
    presence: flow.presence,
    getPeers: () => flow.presence?.getPeers() ?? [],
    resources,
    catalog,
    agent: { name: `${name}'s agent`, color, agent: true },
    select: (ids) => select(new Set(ids)),
    fitView: (ids) => void fitView({ nodes: ids?.map((id) => ({ id })), duration: 400, padding: 0.3, maxZoom: 1.2 }),
    reorder: () => reorder(),
  });

  // Recomputed only when nodes are added, removed or change container, not as they move
  const structure = structureOf(flow.nodes);
  const catalogKeys = flow.nodes
    .map((node) => getCatalogLink(node)?.key)
    .filter(Boolean)
    .join('\n');
  const keysOnCanvas = useMemo(() => new Set(catalogKeys ? catalogKeys.split('\n') : []), [catalogKeys]);

  /** Middle of the visible canvas, spread out so repeated adds don't land on top of each other */
  const canvasCenter = () => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const step = nodesRef.current.length % 6;
    const offset = { x: ((step % 3) - 1) * 240, y: (Math.floor(step / 3) - 0.5) * 160 };
    return screenToFlowPosition({ x: rect.left + rect.width / 2 + offset.x, y: rect.top + rect.height / 2 + offset.y });
  };

  // ---- Adding things ----

  // A domain or system dropped on the canvas: asked whether it's a card or a container first
  const [chooser, setChooser] = useState<{ resource: CatalogResource; at: Landing } | null>(null);
  // A service or message that connects to things not on the canvas yet: asked whether to bring them too
  const [connectionsChooser, setConnectionsChooser] = useState<{
    resource: CatalogResource;
    at: Landing;
    groups: ConnectionGroup[];
  } | null>(null);

  // A catalog resource is added with edges to the related resources already on the canvas
  const addResource = (key: string, point: XYPosition) => {
    const resource = catalog.resourcesByKey.get(key);
    if (!resource) return;
    const at = landingAt(point, resource.node.type);
    if (canBeContainer(resource)) return setChooser({ resource, at });
    const groups = getCatalogConnections(resource, catalog, keysOnCanvas);
    if (groups.length > 0) return setConnectionsChooser({ resource, at, groups });
    addCard(resource, at);
  };

  const addCard = (resource: CatalogResource, at: Landing) =>
    keepOnLevel(
      at,
      flow.insertNode(
        resource.node.type,
        catalogNodeData(resource),
        at.center,
        (id, existing) => getRelatedEdges(resource, id, existing, catalog.relationsByKey),
        at.inside
      )
    );

  // Nodes waiting to be shown before the canvas is laid out around them
  const reorderOnceShown = useRef<string[] | null>(null);
  useEffect(() => {
    const waiting = reorderOnceShown.current;
    if (!waiting) return;
    const shown = new Set(flow.nodes.map((node) => node.id));
    if (!waiting.every((id) => shown.has(id))) return;
    reorderOnceShown.current = null;
    // A frame later, so they've been measured
    requestAnimationFrame(() => void reorder());
  }, [flow.nodes]);

  /** A domain or system as a container, with everything it holds in the catalog inside if asked */
  const addContainer = async (resource: CatalogResource, at: Landing, withContents: boolean) => {
    const existing = nodesRef.current;
    const built = withContents
      ? await buildContainerWithContents(resource, at.center, catalog, existing)
      : { nodes: [buildContainer(resource, at.center)], edges: [] };
    // Dropped in another container (e.g. a system in its domain): it goes in it
    const outer = containerFor(at.center, existing, at.inside);
    const nodes = outer
      ? built.nodes.map((node) =>
          node.parentId ? node : { ...node, parentId: outer.id, position: toRelativePosition(node.position, outer.id, existing) }
        )
      : built.nodes;
    // With its contents, the canvas is laid out again to make room for it all (not when added on a level: it's
    // below everything on the canvas, and nothing on the level moves)
    if (withContents && existing.length > 0 && !at.onLevel) reorderOnceShown.current = nodes.map((node) => node.id);
    flow.insertNodes(nodes, built.edges);
    keepOnLevel(at, built.nodes.find((node) => !node.parentId)?.id);
  };

  const choose = useStableCallback((choice: ContainerChoice) => {
    if (!chooser) return;
    if (choice.as === 'card') addCard(chooser.resource, chooser.at);
    else void addContainer(chooser.resource, chooser.at, choice.withContents);
    setChooser(null);
  });
  const cancelChooser = useCallback(() => setChooser(null), []);

  const chooseConnections = useStableCallback((choice: ConnectionsChoice) => {
    if (!connectionsChooser) return;
    const { resource, at } = connectionsChooser;
    if (choice.as === 'card') addCard(resource, at);
    else {
      const { nodes, edges } = planWithConnections(nodesRef.current, resource, at.center, choice.include, catalog, at.inside);
      flow.insertNodes(nodes, edges);
      // What it connects to is placed next to it on the level
      keepOnLevel(at, nodes.find((node) => getCatalogLink(node)?.key === resource.key)?.id);
    }
    setConnectionsChooser(null);
  });
  const cancelConnectionsChooser = useCallback(() => setConnectionsChooser(null), []);

  // What a domain or system dropped as a container would bring with it
  const chooserContents = useMemo(() => {
    if (!chooser) return { systems: 0, services: 0 };
    const inside = (resource: CatalogResource): CatalogResource[] =>
      getContents(resource, catalog).flatMap((child) => [child, ...(canBeContainer(child) ? inside(child) : [])]);
    const missing = inside(chooser.resource).filter((child) => !keysOnCanvas.has(child.key));
    return {
      systems: missing.filter((child) => child.collection === 'systems').length,
      services: missing.filter((child) => child.collection === 'services').length,
    };
  }, [chooser, catalog, keysOnCanvas]);

  /** A sticky note on the level shown (it's only shown on that level) */
  const addNoteAt = (center: XYPosition) => {
    const data = getNodeDefinition('note')!.createData();
    flow.insertNode('note', levelRef.current === 3 ? data : { ...data, level: levelRef.current }, center);
  };
  /**
   * Where something added at a point goes (see Landing). On L1 and L2 it's centred where it's dropped, in the
   * container there (and in the same container on the canvas). Something the level doesn't show (a message on L1)
   * goes to L3, where it's shown.
   */
  const landingAt = (point: XYPosition, type: string | undefined): Landing => {
    const level = levelRef.current;
    if (level === 3) return { point, center: point };
    const shownHere = isShownOnLevel(type, level);
    if (!shownHere) changeLevel(3);
    // The container it's dropped in on the level, which the canvas has too (levels keep the canvas's ids)
    const shown = shownHere && levelGraphRef.current?.level === level ? levelGraphRef.current.nodes : [];
    const container = canGoInContainer(type) ? findGroupAtPoint(point, shown) : undefined;
    const canvas = nodesRef.current;
    const inside = container && containerFor(point, canvas, container.id) ? container.id : undefined;
    // On the canvas: below what's in that container, or below everything
    const lookup = new Map(canvas.map((node) => [node.id, node]));
    const beside = canvas.filter((node) => (inside ? node.parentId === inside : !node.parentId && isOnLevel(node, 3)));
    const rects = (beside.length ? beside : inside ? [lookup.get(inside)!] : []).map((node) => getAbsoluteRect(node, lookup));
    const center = rects.length
      ? {
          x: (Math.min(...rects.map((rect) => rect.x)) + Math.max(...rects.map((rect) => rect.x + rect.width))) / 2,
          // Below them, or in the middle of an empty container
          y: beside.length ? Math.max(...rects.map((rect) => rect.y + rect.height)) + 160 : rects[0].y + rects[0].height / 2,
        }
      : { x: 0, y: 0 };
    if (!shownHere) return { point, center };
    const origin =
      container && inside ? getAbsolutePosition(container, new Map(shown.map((node) => [node.id, node]))) : { x: 0, y: 0 };
    const size = getLevelNodeSize(type, level);
    return { point, center, inside, onLevel: { level, center: { x: point.x - origin.x, y: point.y - origin.y }, size } };
  };
  // Added on a level, until they're measured, with the size they were centred at: centred again at their real size
  const centring = useRef(new Map<string, { level: 1 | 2; size: { width: number; height: number } }>());
  /** Keeps what was added where it was dropped on the level (undone with adding it) */
  const keepOnLevel = (at: Landing, id: string | undefined) => {
    if (!id || !at.onLevel) return;
    const { level, center, size } = at.onLevel;
    centring.current.set(id, { level, size });
    flow.setLevelLayout(level, new Map([[id, centredOn(center, size)]]));
  };
  const addComponentAt = (type: string, point: XYPosition) => {
    if (type === 'note') return addNoteAt(point);
    const at = landingAt(point, type);
    keepOnLevel(at, flow.addNode(type, at.center, at.inside));
  };

  const addComponent = useStableCallback((type: string) => addComponentAt(type, canvasCenter()));
  const addNote = useStableCallback(() => addNoteAt(canvasCenter()));
  const addResourceFromPanel = useStableCallback((key: string) => addResource(key, canvasCenter()));

  const onDrop = useStableCallback((event: DragEvent) => {
    event.preventDefault();
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const type = event.dataTransfer.getData(COMPONENT_DRAG_TYPE);
    const resourceKey = event.dataTransfer.getData(CATALOG_DRAG_TYPE);
    if (type) addComponentAt(type, position);
    if (resourceKey) addResource(resourceKey, position);
  });

  // ---- Pointer, panning and dragging ----

  // React Flow's node drag and panning (d3) stop mousemove from propagating, so follow the
  // pointer with pointer events, and with dragover while something is dragged in from the palette
  // Where the pointer is on the canvas (while it's over it), for pasting there
  const pointerAt = useRef<XYPosition | null>(null);
  const trackPointer = useStableCallback((event: { clientX: number; clientY: number }) => {
    pointerAt.current = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    flow.setPointer(pointerAt.current);
  });
  const clearPointer = useCallback(() => {
    pointerAt.current = null;
    flow.setPointer(null);
  }, [flow.setPointer]);

  // ---- Copy and paste ----

  // Pasting again without moving the pointer off the canvas cascades the copies, like design tools do
  const pastes = useRef(0);
  const selectedIds = () => nodesRef.current.filter((node) => node.selected).map((node) => node.id);
  // What was last copied here (for "Paste here" in the context menu, which can't read the clipboard without asking)
  const [lastCopied, setLastCopied] = useState<ClipboardContent | null>(null);
  // Nodes to copy instead of the selection (copying from the context menu)
  const copyOnly = useRef<string[] | null>(null);

  /** Adds copies (as one change, so one undo takes them back) and selects them instead of what was selected */
  const paste = useStableCallback((content: ClipboardContent, place: { at: XYPosition } | { offset: XYPosition }) => {
    const { nodes, edges } = pasteNodes(content, nodesRef.current, place);
    flow.onNodesChange(selectedIds().map((id) => ({ type: 'select', id, selected: false })));
    flow.insertNodes(nodes, edges);
    flow.onNodesChange(nodes.map((node) => ({ type: 'select', id: node.id, selected: true })));
  });

  useEffect(() => {
    // Copying, cutting and pasting text in a field (or a note being edited) works as usual
    const isTyping = () => {
      const active = document.activeElement;
      return (
        active instanceof HTMLElement && (active.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName))
      );
    };
    // Text selected on the page (e.g. in a panel) is copied as text, like anywhere else
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
      // Other apps get a list of what was copied
      event.clipboardData.setData('text/plain', content.nodes.map((node) => getNodeName(node.type, node.data)).join('\n'));
      pastes.current = 0;
      setLastCopied(content);
      if (event.type === 'cut') flow.deleteNodes(ids);
    };
    const onPaste = (event: ClipboardEvent) => {
      if (levelRef.current !== 3 || isTyping()) return;
      const content =
        readClipboard(event.clipboardData?.getData(CLIPBOARD_TYPE)) ?? readClipboard(event.clipboardData?.getData('text/plain'));
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

  const onDragOver = useStableCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    trackPointer(event);
  });

  // While the canvas is panned, zoomed or dragged, message edges stop animating (a class, not state, so nothing re-renders)
  const interactions = useRef({ moving: false, dragging: false });
  const setInteraction = useCallback((kind: 'moving' | 'dragging', on: boolean) => {
    const wasActive = interactions.current.moving || interactions.current.dragging;
    interactions.current[kind] = on;
    const active = interactions.current.moving || interactions.current.dragging;
    if (active === wasActive) return;
    canvasRef.current?.classList.toggle('ec-interaction-active', active);
    // (hiding them doesn't stop the envelopes' SMIL)
    pauseEdgeAnimations(canvasRef.current, active);
  }, []);

  // The camera follows agents unless people move it themselves (set by AgentActivity)
  const pauseCamera = useRef<() => void>(() => {});
  const onMoveStart = useCallback(
    (event: MouseEvent | TouchEvent | null) => {
      if (event) pauseCamera.current();
      setInteraction('moving', true);
    },
    [setInteraction]
  );
  const onMoveEnd = useCallback(() => setInteraction('moving', false), [setInteraction]);

  // Dragging something into a container puts it in it, out of one takes it out
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const dragRoots = (dragged: Node[]) => {
    const ids = new Set(dragged.map((node) => node.id));
    return dragged.filter((node) => !node.parentId || !ids.has(node.parentId));
  };
  // While something's dragged, the containers around it grow to fit it (see previewContainerGrowth): the canvas
  // when the drag started, and those containers, innermost first
  const dragStart = useRef<{ nodes: Map<string, Node>; containers: string[] } | null>(null);
  const onNodeDragStart = useStableCallback((_: unknown, __: Node, dragged: Node[]) => {
    pauseCamera.current();
    setInteraction('dragging', true);
    const lookup = lookupNodes();
    const containers: string[] = [];
    for (const node of dragged) {
      for (let id = lookup.get(node.id)?.parentId; id; id = lookup.get(id)?.parentId) {
        if (!containers.includes(id)) containers.push(id);
      }
    }
    // Innermost first: deeper containers before the ones they're in
    const depth = (id: string) => {
      let level = 0;
      for (let parent = lookup.get(id)?.parentId; parent; parent = lookup.get(parent)?.parentId) level++;
      return level;
    };
    containers.sort((a, b) => depth(b) - depth(a));
    dragStart.current = containers.length ? { nodes: lookup, containers } : null;
    threadsDrag.current = selectedThreads.size && dragged[0] ? { id: dragged[0].id, from: canvasPositionOf(dragged[0]) } : null;
  });
  // Where a dragged node is on the canvas (its position is relative to its container)
  const canvasPositionOf = (node: Node) => {
    const lookup = lookupNodes();
    lookup.set(node.id, { ...lookup.get(node.id)!, position: node.position });
    return getAbsolutePosition(lookup.get(node.id)!, lookup);
  };
  // Selected comments move with what's dragged: how far it's moved from where it was
  const threadsDrag = useRef<{ id: string; from: XYPosition } | null>(null);
  const moveThreadsWith = (dragged: Node[]) => {
    const drag = threadsDrag.current;
    const node = drag && dragged.find((candidate) => candidate.id === drag.id);
    if (!drag || !node) return;
    const at = canvasPositionOf(node);
    setThreadsOffset({ x: at.x - drag.from.x, y: at.y - drag.from.y });
  };
  const growContainers = (dragged: Node[]) => {
    const started = dragStart.current;
    if (!started) return;
    // Where the dragged nodes are now (the canvas's own nodes can be a frame behind)
    const now = lookupNodes();
    dragged.forEach((node) => now.set(node.id, { ...now.get(node.id)!, position: node.position }));
    flow.showDragPreview(previewContainerGrowth(started.containers, new Set(dragged.map((node) => node.id)), started.nodes, now));
  };
  const onNodeDrag = useStableCallback((_: unknown, __: Node, dragged: Node[]) => {
    growContainers(dragged);
    moveThreadsWith(dragged);
    const [root] = dragRoots(dragged);
    const current = root && nodesRef.current.find((node) => node.id === root.id);
    const target = root ? findDropTarget(root.id, nodesRef.current) : undefined;
    setDropTargetId(target && target.id !== current?.parentId ? target.id : null);
  });
  const onNodeDragStop = useStableCallback((_: unknown, __: Node, dragged: Node[]) => {
    setInteraction('dragging', false);
    setDropTargetId(null);
    dragStart.current = null;
    // Selected comments not on a node are saved where they moved to
    if (threadsDrag.current && threadsOffset) {
      const offset = threadsOffset;
      comments.moveThreads(
        comments.threads
          .filter((thread) => selectedThreads.has(thread.id) && !thread.nodeId)
          .map((thread) => ({
            threadId: thread.id,
            anchor: { position: { x: thread.position.x + offset.x, y: thread.position.y + offset.y } },
          }))
      );
    }
    threadsDrag.current = null;
    setThreadsOffset(null);
    // The containers it grew are saved with the drop; dropped in another container (or out of one), it moves there
    for (const root of dragRoots(dragged)) {
      const current = nodesRef.current.find((node) => node.id === root.id);
      const target = findDropTarget(root.id, nodesRef.current);
      if (current && target?.id !== current.parentId) flow.setParent(root.id, target?.id);
    }
  });

  // ---- Levels of detail ----

  // Like EventCatalog's diagrams: L3 is everything on the canvas, L1 and L2 less detailed views of it, arranged and
  // edited on their own (what's done there changes the canvas: a system card is the system). A canvas opened
  // from a diagram opens at the level it was shown at (?level=1 or 2), once: reloading opens the canvas (L3).
  const [level, setLevel] = useState<Level>(() => {
    const url = new URL(window.location.href);
    const asked = Number(url.searchParams.get('level'));
    if (!url.searchParams.has('level')) return 3;
    url.searchParams.delete('level');
    window.history.replaceState(window.history.state, '', url);
    return asked === 1 || asked === 2 ? asked : 3;
  });
  const levelRef = useRef(level);
  levelRef.current = level;
  // L3 is the canvas itself: comments and other people's pointers are there (L1 and L2 are arranged on their own)
  const editable = level === 3;
  const [levelGraph, setLevelGraphState] = useState<{ level: Level; nodes: Node[]; edges: Edge[] } | null>(null);
  // The level shown as it is now (for changes to it, and saving where things are put)
  const levelGraphRef = useRef(levelGraph);
  /** Changes to the level shown (moved, selected, measured), as they happen */
  const updateLevelGraph = useCallback((next: { level: Level; nodes: Node[]; edges: Edge[] }) => {
    levelGraphRef.current = next;
    setLevelGraphState(next);
  }, []);
  /**
   * Shows a level (arranged again), keeping what hasn't changed on it as it's shown (so it doesn't render again), and
   * what's selected and nodes' measured sizes (not measured again). Containers come before what's in them, as React
   * Flow needs (the canvas's order can have them after).
   */
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

  // What a level shows depends on what's on the canvas and how it's connected, and names (not positions). Notes
  // aren't laid out with it: adding, moving or writing one doesn't lay the level out again.
  // Also whether a canvas opened from a diagram still has the diagram's levels: only worked out when needed
  const levelKey = level === 3 ? '' : flow.structureKey;
  const shownLevelRef = useRef<Level | undefined>(undefined);
  shownLevelRef.current = levelGraph?.level;
  const levelLayout = level === 3 ? undefined : flow.levelLayouts[level];
  useEffect(() => {
    if (level === 3) return setLevelGraph(null);
    let cancelled = false;
    const show = () => {
      // A canvas opened from a diagram shows the diagram's levels as it did, until what's on the canvas changes
      const fromDiagram = getDiagramLevel(flow.diagramLevels, level, flow.structureKey);
      const diagram = flow.diagramLevels?.[level];
      const derived = fromDiagram ? undefined : getLevelGraph(nodesRef.current, edgesRef.current, level);
      const content = fromDiagram ?? { ...derived!, edges: withDiagramRoutes(derived!.edges, diagram?.edges) };
      // Where things are: as arranged on the level, else as the diagram had them, and anything new next to what it
      // connects to (kept there, so nothing moves later)
      const arranged = arrangeLevel(content, flow.levelLayouts[level], diagram && levelPlaces(diagram.nodes));
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
      });
    };
    // Straight away when switching levels (or from the diagram); after changes settle while one is shown
    if (shownLevelRef.current !== level || getDiagramLevel(flow.diagramLevels, level, flow.structureKey)) {
      show();
      return () => void (cancelled = true);
    }
    const timer = setTimeout(show, LEVEL_RELAYOUT_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [level, levelKey, flow.diagramLevels, levelLayout]);

  // Comments: right click > Add comment, or C for comment mode then click (like Figma)
  const [commentMode, setCommentMode] = useState(false);
  const [draft, setDraft] = useState<CommentAnchor | null>(null);
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  // Comments that are part of the selection (selecting everything selects them too): only here, like what nodes
  // are selected. While what's selected is dragged, the ones not on a node move with it by this much.
  const [selectedThreads, setSelectedThreads] = useState<ReadonlySet<string>>(NO_THREADS);
  const clearSelectedThreads = useCallback(() => setSelectedThreads((current) => (current.size ? NO_THREADS : current)), []);
  const [threadsOffset, setThreadsOffset] = useState<XYPosition | null>(null);
  const threadsShown = () => comments.threads.filter((thread) => showResolved || !thread.resolved);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);

  const changeLevel = useStableCallback((next: Level) => {
    if (next === level) return;
    glide();
    setCommentMode(false);
    setDraft(null);
    setOpenThreadId(null);
    // What's selected may not be on the next level (e.g. a note added on this one)
    flow.onNodesChange(selectedIds().map((id) => ({ type: 'select', id, selected: false })));
    setLevel(next);
  });
  const editInL3 = useCallback(() => changeLevel(3), [changeLevel]);

  // Fit the camera to a level once it's laid out (and to the canvas when going back to L3). A level shown before the
  // canvas has arrived (opened at ?level=) is laid out empty first: it's fitted once it has something to show.
  const shownLevel = level === 3 ? 3 : levelGraph?.level;
  const levelHasNodes = !!levelGraph?.nodes.length;
  useEffect(() => {
    if (shownLevel === undefined || (shownLevel !== 3 && !levelHasNodes)) return;
    const frame = requestAnimationFrame(() => void fitView({ ...FIT_VIEW_OPTIONS, duration: 450 }));
    return () => cancelAnimationFrame(frame);
  }, [shownLevel, levelHasNodes]);

  /**
   * Lays the canvas out with the visualiser's layout, for everyone on it (everyone's nodes glide there). On L1 or
   * L2 it lays out just that level (one step to undo), leaving the canvas as it is.
   */
  const reorder = useStableCallback(async () => {
    const level = levelRef.current;
    if (level !== 3) {
      const content =
        getDiagramLevel(flow.diagramLevels, level, flow.structureKey) ?? getLevelGraph(nodesRef.current, edgesRef.current, level);
      const laidOut = await layoutGraph(
        content.nodes.map((node) => ({ ...node, selected: false })),
        content.edges
      );
      glide();
      flow.setLevelLayout(level, levelPlaces(laidOut.nodes));
      setTimeout(() => void fitView({ ...FIT_VIEW_OPTIONS, duration: 450 }), 50);
      return;
    }
    const positions = await getLayoutPositions(nodesRef.current, edgesRef.current);
    flow.applyPositions(positions);
    setTimeout(() => void fitView({ ...FIT_VIEW_OPTIONS, duration: 450 }), 50);
  });
  const onReorder = useCallback(() => void reorder(), [reorder]);

  const selected = flow.nodes.filter((node) => node.selected);
  const selectedKey = selected.map((node) => node.id).join(',');

  // React Flow needs containers before what's in them: only re-sorted when the structure changes
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
  // Sticky notes are shown on the level they were added on: on L1 and L2, over the level's layout
  const shownNodes = useMemo(() => {
    if (!levelShown)
      return sortedNodes.every((node) => isOnLevel(node, 3)) ? sortedNodes : sortedNodes.filter((node) => isOnLevel(node, 3));
    const notes = sortedNodes.filter((node) => getNoteLevel(node) === levelShown.level);
    return notes.length ? [...levelShown.nodes, ...notes.map(asLevelNote)] : levelShown.nodes;
  }, [levelShown, sortedNodes]);

  // The legend, as the visualiser's: how many of each kind of node is shown (not what's written on the canvas), and
  // clicking a kind hides or shows it. Hiding only changes what this person sees.
  const [hiddenLegendKeys, setHiddenLegendKeys] = useState<string[]>([]);
  const toggleLegendKey = useCallback(
    (key: string) => setHiddenLegendKeys((keys) => (keys.includes(key) ? keys.filter((other) => other !== key) : [...keys, key])),
    []
  );
  // What's shown only changes with what's on it (not as nodes are dragged, on any level)
  const shownStructure = levelShown ? structureOf(levelShown.nodes) : structure;
  const legend = useMemo(() => getLegend(shownNodes.filter((node) => !isWrittenOnCanvas(node.type))), [shownStructure]);
  const visibleNodes = useMemo(
    () =>
      hiddenLegendKeys.length === 0
        ? shownNodes
        : shownNodes.map((node) => (hiddenLegendKeys.includes(node.type ?? '') ? { ...node, hidden: true } : node)),
    [shownNodes, hiddenLegendKeys]
  );
  /**
   * Changes on L1 and L2. The level's notes are on the canvas, so changes to them go there; removing something
   * removes it from the canvas (the level is drawn from it); and moving or resizing something arranges the level,
   * kept when it's dropped.
   */
  const onLevelNodesChange = useStableCallback((changes: NodeChange[]) => {
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
        (change.type === 'position' && change.dragging === false) || (change.type === 'dimensions' && change.resizing === false)
          ? [change.id]
          : []
      )
    );
    if (done.size) flow.setLevelLayout(level, levelPlaces(nodes.filter((node) => done.has(node.id))));
    // Something just added, now it's measured: centred where it was dropped, from where it is now (a container it's in
    // may have grown around it), in one step to undo with adding it
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
  /** Connecting two things on L1 or L2 connects them on the canvas (e.g. a relationship between two systems) */
  const onLevelConnect = useStableCallback((connection: Connection) => {
    const onCanvas = new Set(nodesRef.current.map((node) => node.id));
    if (onCanvas.has(connection.source) && onCanvas.has(connection.target)) flow.onConnect(connection);
  });
  // Message edges' envelopes only move on what's selected (the edge, or a node at either end): any moving
  // envelope at all costs a style recalc and layout every frame, which an editing canvas can't afford at idle
  // (on L1 and L2, the level's edges: the level itself changes on every frame something on it is dragged)
  const levelEdges = levelShown?.edges;
  const shownEdges = useMemo(() => {
    const edges = levelEdges ?? flow.edges;
    const focused = new Set(selectedKey ? selectedKey.split(',') : []);
    return edges.map((edge) =>
      edge.type === 'animated' && !edge.selected && !focused.has(edge.source) && !focused.has(edge.target)
        ? withoutEnvelope(edge)
        : edge
    );
  }, [levelEdges, flow.edges, selectedKey]);
  // A canvas opened from a diagram has the levels the diagram has (until what's on it changes)
  const unavailableLevels = useMemo(() => {
    const reason = (level: 1 | 2) => {
      if (getDiagramLevel(flow.diagramLevels, level, flow.structureKey)) return undefined;
      return (
        getDiagramLevelUnavailable(flow.diagramLevels, level, flow.structureKey) ??
        getLevelUnavailableReason(nodesRef.current, level)
      );
    };
    return { 1: reason(1), 2: reason(2) };
  }, [structure, flow.structureKey, flow.diagramLevels]);

  // ---- People and agents ----

  /** Jump to where someone is: their view (and zoom), or for agents, what they last worked on */
  const jumpTo = useStableCallback((person: Peer) => {
    const peer = flow.presence?.getPeers().find((candidate) => candidate.clientId === person.clientId) ?? person;
    if (levelRef.current !== 3) changeLevel(3);
    if (peer.viewport) {
      void setCenter(peer.viewport.x, peer.viewport.y, { zoom: peer.viewport.zoom, duration: 500 });
    } else if (peer.pointer) {
      void setCenter(peer.pointer.x, peer.pointer.y, { zoom: Math.max(getZoom(), 1), duration: 500 });
    }
  });

  const [following, setFollowing] = useState(followChanges);
  const toggleFollowing = useCallback(() => setFollowing((on) => !on), []);

  const [shareOpen, setShareOpen] = useState(false);
  const openShare = useCallback(() => setShareOpen(true), []);
  const closeShare = useCallback(() => setShareOpen(false), []);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const openDelete = useCallback(() => setDeleteOpen(true), []);
  const closeDelete = useCallback(() => setDeleteOpen(false), []);
  // Deleted here: on the way to Studio. Set before asking, since the server closes the canvas before it answers
  // (the canvas closing as it's deleted isn't news)
  const [leaving, setLeaving] = useState(false);
  const deleteCanvas = useStableCallback(async () => {
    if (!canvasesApiUrl) return;
    setLeaving(true);
    try {
      await deleteCanvasThroughApi(canvasesApiUrl, canvasId);
    } catch (error) {
      setLeaving(false);
      throw error;
    }
    window.location.assign(studioUrl ?? '/');
  });
  const [connectOpen, setConnectOpen] = useState(false);
  const openConnect = useCallback(() => setConnectOpen(true), []);
  const closeConnect = useCallback(() => setConnectOpen(false), []);
  useEffect(() => {
    if (relayScriptPath && isRelayEnabled()) loadRelay(relayScriptPath);
  }, [relayScriptPath]);
  const agentLink = {
    canvasId,
    title: flow.title,
    canvasUrl: shareUrl ?? window.location.href,
    mcpUrl: new URL(mcpUrl, window.location.origin).href,
  };

  // ---- Comments ----

  // Keyboard shortcuts (react-hotkeys-hook: "mod" is ⌘ on a Mac and Ctrl elsewhere; ignored while typing in a field)
  const onCanvas = () => levelRef.current === 3;
  useHotkeys(
    'mod+a',
    () => {
      if (!onCanvas()) return;
      flow.onNodesChange(
        nodesRef.current.filter((node) => isOnLevel(node, 3)).map((node) => ({ type: 'select', id: node.id, selected: true }))
      );
      flow.onEdgesChange(edgesRef.current.map((edge) => ({ type: 'select', id: edge.id, selected: true })));
      // ...and the comments shown on it
      setSelectedThreads(new Set(threadsShown().map((thread) => thread.id)));
    },
    { preventDefault: true }
  );
  useHotkeys(
    'mod+d',
    () => {
      const content = onCanvas() && copyNodes(nodesRef.current, edgesRef.current, selectedIds());
      if (content) paste(content, { offset: { x: 40, y: 40 } });
    },
    { preventDefault: true }
  );
  // On every level: notes are changed on L1 and L2 too (and the levels show what's undone on the canvas)
  useHotkeys('mod+z', () => flow.undo(), { preventDefault: true });
  useHotkeys(['mod+shift+z', 'mod+y'], () => flow.redo(), { preventDefault: true });
  useHotkeys('c', () => onCanvas() && setCommentMode((on) => !on));
  useHotkeys('escape', () => {
    setCommentMode(false);
    setDraft(null);
    setOpenThreadId(null);
    clearSelectedThreads();
    setEditingId(null);
    flow.onNodesChange(
      nodesRef.current.filter((node) => node.selected).map((node) => ({ type: 'select', id: node.id, selected: false }))
    );
    flow.onEdgesChange(
      edgesRef.current.filter((edge) => edge.selected).map((edge) => ({ type: 'select', id: edge.id, selected: false }))
    );
  });
  // Selected comments are deleted with what's selected (React Flow deletes the nodes and edges)
  useHotkeys(DELETE_KEYS, () => {
    if (!onCanvas() || selectedThreads.size === 0) return;
    comments.deleteThreads([...selectedThreads]);
    clearSelectedThreads();
  });
  const toggleCommentMode = useCallback(() => setCommentMode((on) => !on), []);

  const startComment = (anchor: CommentAnchor) => {
    setOpenThreadId(null);
    setDraft(anchor);
    setCommentMode(false);
  };

  const flowPositionOf = (event: { clientX: number; clientY: number }) =>
    screenToFlowPosition({ x: event.clientX, y: event.clientY });

  const onPaneClick = useStableCallback((event: ReactMouseEvent) => {
    clearSelectedThreads();
    if (commentMode && editable) return startComment(anchorAt(flowPositionOf(event)));
    // A click inside a container (not on something in it) selects it: its body lets the pointer through so you can
    // drag a selection box in it, so the click lands on the canvas
    // (after React Flow clears the selection, which it does once this returns)
    const container = editable ? findGroupAtPoint(flowPositionOf(event), nodesRef.current) : undefined;
    if (container) queueMicrotask(() => flow.onNodesChange([{ type: 'select', id: container.id, selected: true }]));
    setDraft(null);
    setOpenThreadId(null);
  });

  // Double clicking a node edits its details (notes are edited on the canvas, by double clicking them too)
  const onNodeDoubleClick = useStableCallback((_: ReactMouseEvent, node: Node) => {
    // On L1 and L2 too: what's there is on the canvas (a system card is the system)
    if (!isWrittenOnCanvas(node.type) && nodesRef.current.some((other) => other.id === node.id)) setEditingId(node.id);
  });
  // ...and inside a container (not on something in it): its body lets the pointer through, so it's on the canvas
  const onCanvasDoubleClick = useStableCallback((event: ReactMouseEvent) => {
    if (!editable || !(event.target as Element).classList?.contains('react-flow__pane')) return;
    const container = findGroupAtPoint(flowPositionOf(event), nodesRef.current);
    if (container) setEditingId(container.id);
  });

  const onNodeClick = useStableCallback((event: ReactMouseEvent, node: Node) => {
    // Clicking one node selects just it (with shift or ⌘, it's added to what's selected)
    if (!event.shiftKey && !event.metaKey) clearSelectedThreads();
    if (commentMode && editable) startComment(anchorAt(flowPositionOf(event), node, lookupNodes()));
  });

  const openContextMenu = useStableCallback((event: ReactMouseEvent | MouseEvent, node?: Node) => {
    event.preventDefault();
    if (!editable) return;
    setContextMenu({ x: event.clientX, y: event.clientY, flowPosition: flowPositionOf(event), node });
  });
  const onPaneContextMenu = useCallback((event: ReactMouseEvent | MouseEvent) => openContextMenu(event), [openContextMenu]);
  const onNodeContextMenu = useCallback((event: ReactMouseEvent, node: Node) => openContextMenu(event, node), [openContextMenu]);
  const closeContextMenu = useCallback(() => setContextMenu(null), []);
  const commentFromMenu = useStableCallback(() => {
    if (contextMenu) startComment(anchorAt(contextMenu.flowPosition, contextMenu.node, lookupNodes()));
    setContextMenu(null);
  });
  /** The node right clicked, or the whole selection if it's part of it */
  const menuTargets = () => {
    const node = contextMenu?.node;
    if (!node) return [];
    const selected = selectedIds();
    return selected.includes(node.id) ? selected : [node.id];
  };
  const editFromMenu = useStableCallback(() => {
    if (contextMenu?.node) setEditingId(contextMenu.node.id);
    setContextMenu(null);
  });
  const copyFromMenu = useStableCallback(() => {
    // Through the copy event, so it's copied like ⌘C (to the system clipboard too)
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
    flow.deleteNodes(menuTargets());
    setContextMenu(null);
  });

  const openThread = useStableCallback((thread: Thread) => {
    const { x, y } = getAnchorPosition(thread, lookupNodes());
    // Leave room for the thread, which opens to the right of its pin
    void setCenter(x + 150, y, { zoom: getZoom(), duration: 300 });
    setDraft(null);
    setOpenThreadId(thread.id);
  });
  const toggleResolved = useCallback(() => setShowResolved((show) => !show), []);
  const openThreadById = useCallback((id: string | null) => {
    setDraft(null);
    setOpenThreadId(id);
  }, []);
  const createThread = useStableCallback((text: string) => {
    if (!draft) return;
    // Posted, it's a pin like the others (not opened): click it to see or reply to it
    comments.createThread(draft, text);
    setDraft(null);
  });
  const cancelDraft = useCallback(() => setDraft(null), []);
  const deleteThread = useStableCallback((id: string) => {
    comments.deleteThread(id);
    setOpenThreadId(null);
  });

  // ---- Selection ----

  useEffect(() => {
    onSelectionChange?.(
      selected.map((node) => {
        const link = getCatalogLink(node);
        return {
          id: node.id,
          name: getNodeName(node.type, node.data, node.id),
          type: getNodeLabel(node.type),
          ...(link && { catalogResource: `${link.key.replace(':', '/')} v${link.version}` }),
        };
      })
    );
  }, [selectedKey]);
  // The node whose details are being edited in the panel: opened by double clicking it, or "Edit details" in its
  // menu (selecting a node doesn't open it). Notes are edited on the canvas.
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = editingId ? flow.nodes.find((node) => node.id === editingId && !isWrittenOnCanvas(node.type)) : undefined;
  // What the panel shows (not the node's position, so dragging it doesn't re-render the panel)
  const inspected = useMemo(
    () => (editing ? { id: editing.id, type: editing.type, data: editing.data } : null),
    [editing?.id, editing?.type, editing?.data]
  );
  const closePanel = useCallback(() => setEditingId(null), []);
  // An accepted or rejected canvas, and when it was decided
  const { status: canvasStatus, history: statusHistory } = flow.canvasStatus;
  const decided = isDecided(canvasStatus)
    ? { status: canvasStatus, change: statusHistory.findLast((change) => change.status === canvasStatus) }
    : null;

  return (
    <UpdateNodeDataContext.Provider value={flow.updateNodeData}>
      <DropTargetContext.Provider value={dropTargetId}>
        <div className="flex h-full min-h-0 text-[rgb(var(--ec-page-text))]">
          <LeftPanel
            level={level}
            onShowAll={editInL3}
            resources={resources}
            keysOnCanvas={keysOnCanvas}
            onAddComponent={addComponent}
            onAddResource={addResourceFromPanel}
            threads={comments.threads}
            showResolved={showResolved}
            onToggleResolved={toggleResolved}
            onOpenThread={openThread}
          />

          <div
            ref={canvasRef}
            className={`eventcatalog-visualizer studio-canvas relative flex-1 min-w-0 ${commentMode ? 'comment-mode' : ''} ${
              transitioning ? 'is-layout-transition' : ''
            }`}
            onPointerMove={trackPointer}
            onPointerLeave={clearPointer}
            onDoubleClick={onCanvasDoubleClick}
          >
            <ReactFlow
              nodes={visibleNodes}
              edges={shownEdges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              nodesDraggable
              nodesConnectable
              elementsSelectable
              onNodesChange={editable ? flow.onNodesChange : onLevelNodesChange}
              onEdgesChange={editable ? flow.onEdgesChange : undefined}
              onConnect={editable ? flow.onConnect : onLevelConnect}
              // Drag either end of a connection to another node (dropped anywhere else, it stays where it was)
              edgesReconnectable={editable}
              onReconnect={editable ? flow.onReconnect : undefined}
              reconnectRadius={RECONNECT_RADIUS}
              onDragOver={onDragOver}
              onMoveStart={onMoveStart}
              onMoveEnd={onMoveEnd}
              onNodeDragStart={onNodeDragStart}
              onNodeDrag={onNodeDrag}
              onNodeDragStop={onNodeDragStop}
              onDrop={onDrop}
              onPaneClick={onPaneClick}
              onNodeClick={onNodeClick}
              onNodeDoubleClick={onNodeDoubleClick}
              onError={onFlowError}
              onSelectionStart={clearSelectedThreads}
              onPaneContextMenu={onPaneContextMenu}
              onNodeContextMenu={onNodeContextMenu}
              connectionLineType={ConnectionLineType.SmoothStep}
              connectionRadius={40}
              deleteKeyCode={DELETE_KEYS}
              multiSelectionKeyCode={MULTI_SELECTION_KEYS}
              selectionOnDrag
              // Read only levels can't select: dragging pans them
              panOnDrag={PAN_BUTTONS}
              panOnScroll
              zoomActivationKeyCode={ZOOM_KEYS}
              zoomOnDoubleClick={false}
              minZoom={0.1}
              maxZoom={2}
            >
              <DiagramBackground />
              <LegendPanel legend={legend} hiddenKeys={hiddenLegendKeys} onLegendClick={toggleLegendKey} />
              <ViewportSharer onChange={flow.setViewport} />
              {/* Pointers, selections and comments are on the canvas people edit (L3) */}
              {editable && <RemotePresence store={flow.presence} clientId={flow.clientId} />}
              {editable && (
                <CommentLayer
                  threads={comments.threads}
                  author={author}
                  openThreadId={openThreadId}
                  draft={draft}
                  showResolved={showResolved}
                  onOpen={openThreadById}
                  onCreate={createThread}
                  onCancelDraft={cancelDraft}
                  onReply={comments.reply}
                  onResolve={comments.setResolved}
                  onMove={comments.moveThread}
                  onMoveDraft={setDraft}
                  onDelete={deleteThread}
                  selectedIds={selectedThreads}
                  selectionOffset={threadsOffset}
                />
              )}
            </ReactFlow>

            <AgentActivity
              store={flow.presence}
              clientId={flow.clientId}
              enabled={editable}
              following={following}
              onToggleFollowing={toggleFollowing}
              pauseRef={pauseCamera}
            />

            {!editable && (
              <div className="absolute left-1/2 top-16 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full border px-4 py-1.5 text-xs shadow-sm bg-[rgb(var(--ec-accent-subtle))] border-[rgb(var(--ec-accent)/0.3)] text-[rgb(var(--ec-page-text))]">
                <span>
                  <span className="font-semibold">L{level}</span> · {LEVELS.find((entry) => entry.level === level)?.description}
                </span>
                <button onClick={editInL3} className="font-semibold text-[rgb(var(--ec-accent))] hover:underline">
                  Everything is on L3
                </button>
              </div>
            )}

            {/* Accepted or rejected: still editable, but changing it makes it a draft again (for everyone) */}
            {editable && decided && (
              <div
                className={`absolute left-1/2 top-16 z-10 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2 rounded-full border px-4 py-1.5 text-xs shadow-sm ${CANVAS_STATUS_LOOK[decided.status].pill}`}
              >
                <span className="truncate">
                  <span className="font-semibold">{CANVAS_STATUS_LOOK[decided.status].label}</span>
                  {decided.change && ` by ${decided.change.by.name} · ${timeAgo(decided.change.at)}`}
                  {decided.change?.note && ` · “${decided.change.note}”`} · changing it moves it back to Draft
                </span>
              </div>
            )}

            <CanvasControls
              level={level}
              onLevelChange={changeLevel}
              unavailableLevels={unavailableLevels}
              editable={editable}
              onReorder={onReorder}
              canUndo={flow.canUndo}
              canRedo={flow.canRedo}
              onUndo={flow.undo}
              onRedo={flow.redo}
              commentMode={commentMode}
              onToggleCommentMode={toggleCommentMode}
              onAddNote={addNote}
            />

            <CanvasContextMenu
              menu={contextMenu}
              onAddComment={commentFromMenu}
              onEditDetails={editFromMenu}
              onCopy={copyFromMenu}
              onDuplicate={duplicateFromMenu}
              onPaste={lastCopied ? pasteFromMenu : undefined}
              onDeleteNode={deleteFromMenu}
              onClose={closeContextMenu}
            />

            <CanvasHeader
              title={flow.title}
              onRetitle={flow.rename}
              status={flow.status}
              transport={flow.transport}
              presence={flow.presence}
              clientId={flow.clientId}
              onJumpTo={jumpTo}
              onRename={onRename}
              onConnectAgent={openConnect}
              onShare={openShare}
              webMcp={webMcp}
              shareUrl={shareUrl}
              newCanvasUrl={newCanvasUrl}
              canvasStatus={flow.canvasStatus.status}
              statusHistory={flow.canvasStatus.history}
              onStatusChange={flow.changeStatus}
              onDelete={canvasesApiUrl ? openDelete : undefined}
            />

            {flow.deleted && !leaving && (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-[rgb(var(--ec-page-bg)/0.85)] p-4">
                <div className="max-w-sm space-y-2 rounded-xl border p-5 text-center shadow-xl bg-[rgb(var(--ec-card-bg))] border-[rgb(var(--ec-page-border))]">
                  <h2 className="text-base font-semibold">This canvas was deleted</h2>
                  <p className="text-sm text-[rgb(var(--ec-page-text-muted))]">
                    Someone deleted it, so it can't be opened or changed any more.
                  </p>
                  {studioUrl && (
                    <a
                      href={studioUrl}
                      className="mt-2 inline-flex rounded-lg px-4 py-2 text-sm font-medium bg-[rgb(var(--ec-button-bg))] text-[rgb(var(--ec-button-text))] hover:bg-[rgb(var(--ec-button-bg-hover))]"
                    >
                      Back to Studio
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Only on an empty canvas (not over comments people have left on it) */}
            {flow.status === 'connected' && flow.nodes.length === 0 && comments.threads.length === 0 && !draft && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-[rgb(var(--ec-page-text-muted))]">
                  Drag components or catalog resources from the left onto the canvas, then share the link to work on it together.
                </p>
              </div>
            )}
          </div>

          {chooser && (
            <ContainerChooser
              resource={chooser.resource}
              contents={chooserContents}
              position={flowToScreenPosition(chooser.at.point)}
              onChoose={choose}
              onCancel={cancelChooser}
            />
          )}
          {connectionsChooser && (
            <ConnectionsChooser
              resource={connectionsChooser.resource}
              groups={connectionsChooser.groups}
              position={flowToScreenPosition(connectionsChooser.at.point)}
              onChoose={chooseConnections}
              onCancel={cancelConnectionsChooser}
            />
          )}
          {shareOpen && (
            <ShareDialog
              keptInMemory={keptInMemory}
              url={agentLink.canvasUrl}
              title={flow.title}
              presence={flow.presence}
              clientId={flow.clientId}
              onRename={onRename}
              onJumpTo={jumpTo}
              onConnectAgent={openConnect}
              onClose={closeShare}
            />
          )}
          {deleteOpen && (
            <DeleteCanvasDialog
              title={flow.title}
              presence={flow.presence}
              clientId={flow.clientId}
              onDelete={deleteCanvas}
              onClose={closeDelete}
            />
          )}
          {connectOpen && (
            <ConnectAgentDialog
              link={agentLink}
              webMcp={webMcp}
              relayScriptPath={relayScriptPath}
              onEnableWebMcp={turnOnWebMcp}
              onClose={closeConnect}
            />
          )}
          {inspected && (
            <PropertiesPanel
              key={inspected.id}
              node={inspected}
              onChange={flow.updateNodeData}
              onDelete={flow.deleteNodes}
              onClose={closePanel}
            />
          )}
        </div>
      </DropTargetContext.Provider>
    </UpdateNodeDataContext.Provider>
  );
}
