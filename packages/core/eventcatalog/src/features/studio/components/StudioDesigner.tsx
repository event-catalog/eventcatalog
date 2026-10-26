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
  type FitViewOptions,
  type NodeChange,
  type XYPosition,
} from '@xyflow/react';
import { DiagramBackground, edgeTypes, getLegend, LegendPanel, pauseEdgeAnimations } from '@eventcatalog/visualiser';
import { useHotkeys } from 'react-hotkeys-hook';
import { getCatalogConnections, indexCatalog, planWithConnections, type ConnectionGroup } from '../canvas-actions';
import {
  getDiagramLevel,
  getDiagramLevelUnavailable,
  isDecided,
  type LevelPlace,
  CLIPBOARD_TYPE,
  copyNodes,
  pasteNodes,
  readClipboard,
  type ClipboardContent,
  keepUnchanged,
  LOCAL_EDGE_KEYS,
  LOCAL_NODE_KEYS,
  findDropTargets,
  placeDropped,
  containerFor,
  findGroupAtPoint,
  getAbsolutePosition,
  getAbsoluteRect,
  previewContainerGrowth,
  sizeOf,
  sortByHierarchy,
  toRelativePosition,
  getLayoutPositions,
  layoutGraph,
  getLevelGraph,
  getLevelUnavailableReason,
  LEVELS,
  type Level,
  arrangeLevel,
  getLevelNodeSize,
  levelPlaces,
  withDiagramRoutes,
  canGoInContainer,
  getNodeDefinition,
  getNodeLabel,
  getNodeName,
  getNoteLevel,
  isOnLevel,
  isShownOnLevel,
  isWrittenOnCanvas,
  getResource,
  DropTargetContext,
  nodeTypes,
  UpdateNodeDataContext,
  anchorAt,
  ContextMenu,
  canvasToModel,
  modelToCanvas,
  toDiagramFile,
  readDiagramFile,
  pickDiagramFile,
  downloadFile,
  fileNameFor,
  DIAGRAM_FILE_EXTENSION,
  canvasImage,
  EmptyCanvas,
  type ModelCanvasContent,
  CommentLayer,
  CommentList,
  getAnchorPosition,
  timeAgo,
  type ContextMenuState,
  CANVAS_STATUS_LOOK,
  ContainerChooser,
  type ContainerChoice,
  CanvasControls,
  ViewControls,
  FIT_VIEW_OPTIONS,
  EditButton,
  LockedContext,
  StartWritingContext,
  EditingContext,
  HotspotLayer,
  HotspotList,
  topSeverity,
  isGroupType,
  type Hotspot,
  type HotspotDraft,
  type HotspotFields,
  type HotspotSeverity,
  type HotspotSpot,
  RemeasureHandles,
  ConnectChooser,
  isCardType,
  newCardData,
  notPlaceholder,
  useConnectNew,
  type NewLink,
} from '@eventcatalog/visualiser/studio';
import { X } from 'lucide-react';
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
import type { Peer } from '../hooks/presence-store';
import { useCanvasWebMcp } from '../hooks/use-canvas-webmcp';
import { useStudioFlow } from '../hooks/use-studio-flow';
import { useComments, type CommentAnchor, type Thread } from '../hooks/use-comments';
import type { ToolSync } from '../tool-sync';
import CanvasHeader from './CanvasHeader';
import ConnectAgentDialog, { enableWebMcp, isRelayEnabled, isWebMcpEnabled, loadRelay } from './ConnectAgentDialog';
import ConnectionsChooser, { type ConnectionsChoice } from './ConnectionsChooser';
import JoinForm from './JoinForm';
import { colorForName, getStoredColor, getStoredName, onStoredNameChange, storeColor, storeName } from '../identity';
import LeftPanel, { CATALOG_DRAG_TYPE, COMPONENT_DRAG_TYPE, type LeftPanelTab } from './LeftPanel';
import { AgentActivity, RemotePresence, ViewportSharer } from './Presence';
import NodeDetails, { type NodeConnection } from './NodeDetails';
import ShareDialog from './ShareDialog';
import DeleteCanvasDialog from './DeleteCanvasDialog';
import { createCanvasThroughApi, deleteCanvasThroughApi } from '../api/client';
import ShortcutsDialog from './ShortcutsDialog';

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
  /** Starts with the palette folded away (e.g. in a chat, where there's little room) */
  paletteCollapsed?: boolean;
  /** Told what's selected (e.g. a chat attaches it to the conversation, so you can ask about it) */
  onSelectionChange?: (selected: SelectedNode[]) => void;
  /** Join as this AI agent, with its name, colour and logo, instead of asking who you are (e.g. inside a chat, as the chat's agent) */
  asAgent?: { name: string; color: string };
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

/**
 * The drawing tools, as Studio on the web's: selecting (V), the hand (H) to move around, and what's put where the
 * canvas is next clicked: a sticky note (N), text (T), a comment (C) or a hotspot (A)
 */
type CanvasTool = 'select' | 'hand' | 'text' | 'note' | 'comment' | 'hotspot';

/**
 * A diagram file opened into a new canvas: kept in this tab until the new canvas has loaded (empty), then put on it.
 * By the new canvas's id.
 */
const openedKey = (canvasId: string) => `eventcatalog-studio-opened:${canvasId}`;
const keepOpened = (canvasId: string, { nodes, edges, threads, hotspots, levelLayouts }: ModelCanvasContent) => {
  try {
    sessionStorage.setItem(
      openedKey(canvasId),
      JSON.stringify({ nodes, edges, threads, hotspots, levelLayouts: { 1: [...levelLayouts[1]], 2: [...levelLayouts[2]] } })
    );
    return true;
  } catch {
    return false;
  }
};
const takeOpened = (canvasId: string): ModelCanvasContent | undefined => {
  try {
    const raw = sessionStorage.getItem(openedKey(canvasId));
    if (!raw) return undefined;
    sessionStorage.removeItem(openedKey(canvasId));
    const saved = JSON.parse(raw);
    return { ...saved, levelLayouts: { 1: new Map(saved.levelLayouts[1]), 2: new Map(saved.levelLayouts[2]) } };
  } catch {
    return undefined;
  }
};

export default function StudioDesigner({ asAgent, signedInAs, ...props }: CanvasProps) {
  const [name, setName] = useState(getStoredName);

  const saveName = useCallback((next: string) => {
    setName(next);
    storeName(next);
  }, []);
  // Renamed on the Studio page or another canvas in this browser
  useEffect(() => onStoredNameChange((next) => next && setName(next)), []);
  // The colour picked (kept in this browser), else the one that follows from the name
  const [chosenColor, setChosenColor] = useState(getStoredColor);
  const recolor = useCallback((next: string) => {
    setChosenColor(next);
    storeColor(next);
  }, []);

  if (asAgent) {
    return (
      <ReactFlowProvider>
        <Canvas {...props} name={asAgent.name} chosenColor={asAgent.color} agent onRecolor={() => {}} />
      </ReactFlowProvider>
    );
  }
  if (signedInAs) {
    return (
      <ReactFlowProvider>
        <Canvas {...props} name={signedInAs.name} picture={signedInAs.picture} chosenColor={chosenColor} onRecolor={recolor} />
      </ReactFlowProvider>
    );
  }
  if (!name)
    return (
      <JoinForm
        color={chosenColor}
        onJoin={(me) => {
          recolor(me.color);
          saveName(me.name);
        }}
      />
    );

  return (
    <ReactFlowProvider>
      <Canvas {...props} name={name} onRename={saveName} chosenColor={chosenColor} onRecolor={recolor} />
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
  paletteCollapsed,
  onSelectionChange,
  resources,
  relations,
  name,
  picture,
  agent,
  onRename,
  chosenColor,
  onRecolor,
}: Omit<CanvasProps, 'asAgent' | 'signedInAs'> & {
  name: string;
  picture?: string;
  /** You're here as an AI agent (shown with its logo, and can't change who you are) */
  agent?: boolean;
  /** Not given when you're signed in (your name is the one you signed in with) */
  onRename?: (name: string) => void;
  /** The colour you picked (else it follows from your name) */
  chosenColor?: string | null;
  onRecolor: (color: string) => void;
}) {
  const color = chosenColor ?? colorForName(name);
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
    agent,
    syncViaTools,
    onLayout: glide,
    onContainerResize: animateContainers,
  });
  const author = useMemo(
    () => ({ name, color, ...(picture && { picture }), ...(agent && { agent }) }),
    [name, color, picture, agent]
  );
  const comments = useComments(flow.doc, author);
  // Locked (looked at, not changed): for everyone on it, by whoever locked it
  const locked = !!flow.lockedBy;
  const lockedRef = useRef(locked);
  lockedRef.current = locked;
  // Fitted clear of the palette on the left (shown unless the canvas is locked)
  const fitOptions = useMemo<FitViewOptions>(
    () => (locked ? FIT_VIEW_OPTIONS : { ...FIT_VIEW_OPTIONS, padding: { ...FIT_VIEW_OPTIONS.padding, left: '304px' } }),
    [locked]
  );
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
    else void addContainer(chooser.resource, chooser.at, !!choice.withContents);
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

  /** A sticky note on the level shown (it's only shown on that level), written on straight away */
  const addNoteAt = (center: XYPosition) => {
    const data = getNodeDefinition('note')!.createData();
    const id = flow.insertNode('note', levelRef.current === 3 ? data : { ...data, level: levelRef.current }, center);
    if (id) setStartWriting(id);
  };
  // The note or text just put on the canvas: written on straight away (see canvas-nodes)
  const [startWriting, setStartWriting] = useState<string | null>(null);
  /** Text written on the canvas, its first line where it's put (on the level shown, as notes are) */
  const writeTextAt = (point: XYPosition) => {
    const size = getNodeDefinition('text')!.defaultSize!;
    const data = levelRef.current === 3 ? { text: '' } : { text: '', level: levelRef.current };
    const id = flow.insertNode('text', data, { x: point.x + size.width / 2 - 4, y: point.y + size.height / 2 - 16 });
    if (id) setStartWriting(id);
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
  /**
   * A component (its type, or its key in the components list: the kinds of data store share a type), connected to
   * the node a connection was dragged from when there is one
   */
  const addComponentAt = (component: string, point: XYPosition, link?: NewLink) => {
    if (component === 'note') return void addNoteAt(point);
    const at = landingAt(point, getNodeDefinition(component)?.type ?? component);
    const id = flow.addNode(component, at.center, at.inside, link);
    keepOnLevel(at, id);
    return id;
  };
  /** A new domain or system as a card (the visualiser's, as Studio on the web makes them), connected to `link`'s node */
  const addCardAt = (type: 'context-domain' | 'system', point: XYPosition, link: NewLink) => {
    const at = landingAt(point, type);
    const id = flow.insertNode(type, newCardData(type), at.center, undefined, at.inside, link);
    keepOnLevel(at, id);
    return id;
  };

  const addComponent = useStableCallback((type: string) => addComponentAt(type, canvasCenter()));
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

  // ---- Connecting to something new: a connection let go of on empty canvas ----

  // A placeholder where it was let go of, connected to the node it came from, until what it is is chosen beside it
  const connect = useConnectNew({
    canvasRef,
    getNode: (id) => nodesRef.current.find((node) => node.id === id),
    getLevel: () => levelRef.current,
    locked,
    onMake: (option, center, link) => {
      const id = isCardType(option.type) ? addCardAt(option.type, center, link) : addComponentAt(option.key, center, link);
      // Selected, and its details open to name it, once it's on the canvas
      if (id) editOnceShown.current = id;
    },
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
  const onNodeDrag = useStableCallback((_: unknown, held: Node, dragged: Node[]) => {
    growContainers(dragged);
    moveThreadsWith(dragged);
    const moves = findDropTargets(
      held.id,
      dragged.map((node) => node.id),
      nodesRef.current
    );
    setDropTargetId(moves.find(({ target }) => target)?.target?.id ?? null);
  });
  const onNodeDragStop = useStableCallback((_: unknown, held: Node, dragged: Node[]) => {
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
    // The containers it grew are saved with the drop; dropped in another container (or out of one), it moves there,
    // and what's selected with it goes too, into free space there (gliding off anything it was dropped on)
    const moves = findDropTargets(
      held.id,
      dragged.map((node) => node.id),
      nodesRef.current
    );
    if (!moves.length) return;
    const { places, nudged } = placeDropped(nodesRef.current, moves);
    if (nudged) glide();
    flow.setParents(moves.map(({ id, target }) => ({ id, parentId: target?.id, at: places.get(id) })));
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
        // (with sizes guessed from the nodes' types: laid out again once they're drawn, see below)
        if (!flow.presence?.getPeers().length) relayoutWhenMeasured.current = level;
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

  // The tool picked (see CanvasTool): comments are right click > Add comment, or C then click (like Figma)
  const [tool, setTool] = useState<CanvasTool>('select');
  const commentMode = tool === 'comment';
  const placing = tool === 'text' || tool === 'note';
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

  // A level's first layout is worked out before its nodes have been drawn, so with sizes guessed from their types: a
  // little off once they're drawn at their real sizes. Once they all have been (measured), it's laid out again with
  // them, as Reorder would, gliding there. Only that first time, and not while others are on the canvas: it would
  // move what they're looking at (the level stays as first laid out, and Reorder tidies it)
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

  const changeLevel = useStableCallback((next: Level) => {
    if (next === level) return;
    glide();
    setTool('select');
    setDraft(null);
    setOpenThreadId(null);
    connect.cancel();
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
    const frame = requestAnimationFrame(() => void fitView({ ...fitOptions, duration: 450 }));
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
      // As they're drawn on the level (its cards and boxes aren't the canvas's), where they have been
      const drawn = new Map(
        (levelGraphRef.current?.level === level ? levelGraphRef.current.nodes : []).map((node) => [node.id, node.measured])
      );
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
  const shownNodesRef = useRef(shownNodes);
  shownNodesRef.current = shownNodes;
  // The nodes shown now (on L1 and L2 they're the level's, where they are there)
  const shownLookup = () => new Map<string, Node>(shownNodesRef.current.map((node) => [node.id, node]));

  // ---- Hotspots: what's flagged for people to know (risks, problems, the key parts), on nodes or places ----

  const [hotspotDraft, setHotspotDraft] = useState<HotspotDraft | null>(null);
  const [openHotspot, setOpenHotspot] = useState<string | null>(null);
  const [listingHotspots, setListingHotspots] = useState(false);
  // The node a hotspot being dragged would go on: it lights up in the hotspot's colour
  const [hotspotDropTarget, setHotspotDropTarget] = useState<{ nodeId: string; severity: HotspotSeverity } | null>(null);
  // Hotspots where they show on this level: on L3 on their node (or at their place); on L1 and L2 on their node if
  // it's shown, else on what it's in that is (so they're found from the overview). From what's on the canvas and the
  // level, read through refs: the nodes arrays are new on every drag frame, and which node holds which doesn't
  // change while things move.
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
        if ((hotspot.level ?? 3) === level)
          places.push({ key: `place:${hotspot.id}`, position: hotspot.position, hotspots: [hotspot] });
        continue;
      }
      const own = target;
      target = shownAround(own);
      // Not in anything shown (e.g. a message on L2): on what it's connected to (its sender first), or what that's in
      if (!target) {
        const linked = flow.edges
          .filter((edge) => edge.source === own || edge.target === own)
          .sort((a) => (a.target === own ? -1 : 1));
        target = linked.map((edge) => shownAround(edge.source === own ? edge.target : edge.source)).find(Boolean);
      }
      if (!target) continue;
      if (target !== hotspot.nodeId) holding.add(target);
      onNodes.set(target, [...(onNodes.get(target) ?? []), hotspot]);
    }
    return [
      ...[...onNodes].map(([nodeId, hotspots]) => ({ key: `node:${nodeId}`, nodeId, hotspots, inside: holding.has(nodeId) })),
      ...places,
    ];
  }, [flow.hotspots, structure, shownStructure, flow.edges, level]);

  const visibleNodes = useMemo(() => {
    // A node with hotspots glows in the colour of the most important (see studio.css)
    const glowing = new Map(
      hotspotSpots.flatMap((spot) => (spot.nodeId ? [[spot.nodeId, topSeverity(spot.hotspots)] as const] : []))
    );
    const dropOn = hotspotDropTarget?.nodeId;
    if (!hiddenLegendKeys.length && !glowing.size && !dropOn) return shownNodes;
    return shownNodes.map((node) => {
      const hidden = hiddenLegendKeys.includes(node.type ?? '');
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
    setHotspotDraft(null);
  });
  const cancelHotspot = useCallback(() => setHotspotDraft(null), []);
  const deleteHotspot = useStableCallback((id: string) => flow.deleteHotspot(id));
  // Dragged onto a node (they move with it), or to a place; open where it lands if it was open
  const moveHotspots = useStableCallback((ids: string[], to: { nodeId?: string; position: XYPosition }) => {
    const at = to.nodeId ? {} : placeLevel();
    ids.forEach((id) =>
      flow.updateHotspot(id, { nodeId: to.nodeId, position: to.position, level: 'level' in at ? at.level : undefined })
    );
    setOpenHotspot((open) => (open ? (to.nodeId ? `node:${to.nodeId}` : ids.length === 1 ? `place:${ids[0]}` : null) : open));
  });
  // From the list (or inside a node on L1 and L2): the canvas goes to it, and it opens
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
    const node = nodesRef.current.find((candidate) => candidate.id === id);
    return node ? getNodeName(node.type, node.data, id) : undefined;
  });
  const toggleHotspotList = useCallback(() => {
    setListingComments(false);
    setListingHotspots((shown) => !shown);
  }, []);
  const hotspotsCount = flow.hotspots.length;
  const hotspotsSeverity = topSeverity(flow.hotspots);
  // What the bottom left controls show (the same objects while that's the same: they're memoised)
  const hotspotsControl = useMemo(
    () => ({ count: hotspotsCount, severity: hotspotsSeverity, onToggle: toggleHotspotList, active: listingHotspots }),
    [hotspotsCount, hotspotsSeverity, toggleHotspotList, listingHotspots]
  );

  // A node's details open from its Edit button (and by double clicking it): one selected node on the canvas
  const selectedNodes = visibleNodes.filter((node) => node.selected);
  const toEdit =
    selectedNodes.length === 1 &&
    !isWrittenOnCanvas(selectedNodes[0].type) &&
    nodesRef.current.some((node) => node.id === selectedNodes[0].id)
      ? selectedNodes[0]
      : undefined;
  const editSelected = useStableCallback(() => toEdit && setEditingId(toEdit.id));
  /**
   * Changes on L1 and L2. The level's notes are on the canvas, so changes to them go there; removing something
   * removes it from the canvas (the level is drawn from it); and moving or resizing something arranges the level,
   * kept when it's dropped.
   */
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
  /** Changes on the canvas (L3), apart from the placeholder's */
  const onCanvasNodesChange = useStableCallback((allChanges: NodeChange[]) => {
    const changes = allChanges.filter(notPlaceholder);
    if (changes.length) flow.onNodesChange(changes);
  });
  /** Connecting two things on L1 or L2 connects them on the canvas (e.g. a relationship between two systems) */
  const onLevelConnect = useStableCallback((connection: Connection) => {
    const onCanvas = new Set(nodesRef.current.map((node) => node.id));
    if (onCanvas.has(connection.source) && onCanvas.has(connection.target)) flow.onConnect(connection);
  });
  // Message edges' envelopes only move under the pointer (the connection, or a node at either end): any moving
  // envelope needs a main-thread frame on every frame (one selected node's cost ~200–300 ms of every 3 seconds and
  // dropped frames), which an editing canvas can't afford at idle
  // (on L1 and L2, the level's edges: the level itself changes on every frame something on it is dragged)
  const [hovered, setHovered] = useState<{ node?: string; edge?: string }>({});
  const onNodeMouseEnter = useCallback((_: ReactMouseEvent, node: Node) => setHovered({ node: node.id }), []);
  const onEdgeMouseEnter = useCallback((_: ReactMouseEvent, edge: Edge) => setHovered({ edge: edge.id }), []);
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
  // With the placeholder, while a connection let go of on empty canvas is waiting to be told what it connects to
  const { placeholder } = connect;
  const flowNodes = useMemo(
    () => (placeholder ? [...visibleNodes, placeholder.node] : visibleNodes),
    [visibleNodes, placeholder]
  );
  const flowEdges = useMemo(() => (placeholder ? [...shownEdges, placeholder.edge] : shownEdges), [shownEdges, placeholder]);
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

  const [shareOpen, setShareOpen] = useState<false | 'choose' | 'invite'>(false);
  const openShare = useCallback(() => setShareOpen('choose'), []);
  const openLiveCollaboration = useCallback(() => setShareOpen('invite'), []);
  const closeShare = useCallback(() => setShareOpen(false), []);
  const [helpOpen, setHelpOpen] = useState(false);
  const openHelp = useCallback(() => setHelpOpen(true), []);
  const closeHelp = useCallback(() => setHelpOpen(false), []);

  // ---- Files and images (as Studio on the web's: the same .eventcatalog files, so diagrams move between them) ----

  // A short message at the top (a file that couldn't be opened or saved)
  const [notice, setNotice] = useState<string>();
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(undefined), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  /** The canvas as a diagram (the model a .eventcatalog file holds) */
  const canvasModel = () =>
    canvasToModel(
      nodesRef.current,
      edgesRef.current,
      flow.levelLayouts,
      { title: flow.title || 'Untitled canvas', resources: [], relations: [] },
      comments.threads,
      flow.hotspots
    );
  const saveToFile = useStableCallback(() => {
    const text = toDiagramFile(canvasModel());
    downloadFile({ name: fileNameFor(flow.title || 'canvas', DIAGRAM_FILE_EXTENSION), mimeType: 'application/json', text });
  });
  const exportImage = useStableCallback(async () => {
    const image = canvasRef.current && (await canvasImage(canvasRef.current));
    if (!image) return setNotice('Nothing to export yet: put something on the canvas first.');
    downloadFile({ name: fileNameFor(flow.title || 'canvas', '.png'), mimeType: 'image/png', base64: image.split(',')[1] });
  });
  /**
   * A .eventcatalog file (from Studio on the web, or saved here), opened on this canvas while it's empty, else as a
   * new canvas (this one stays as it is)
   */
  const openFile = useStableCallback(async () => {
    if (!canvasesApiUrl) return;
    const file = await pickDiagramFile();
    if (!file) return;
    const opened = await readDiagramFile(file);
    if ('error' in opened) return setNotice(opened.error);
    try {
      const content = await modelToCanvas(opened.model);
      if (!nodesRef.current.length && !comments.threads.length && !flow.hotspots.length) {
        flow.addContent(content);
        if (!flow.title || flow.title === 'Untitled canvas') flow.rename(opened.model.title);
        setTimeout(() => void fitView({ ...fitOptions, duration: 450 }), 100);
        return;
      }
      const created = await createCanvasThroughApi(canvasesApiUrl, { title: opened.model.title, createdBy: name });
      if (!keepOpened(created.id, content))
        return setNotice("Couldn't open it in a new canvas here (this browser's storage is blocked).");
      window.location.assign(created.url);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Couldn't open that file.");
    }
  });
  // A file opened into this canvas (just made for it): put on it once it's loaded, if it's still empty
  useEffect(() => {
    if (!flow.synced) return;
    const content = takeOpened(canvasId);
    if (!content || nodesRef.current.length) return;
    flow.addContent(content);
    setTimeout(() => void fitView({ ...fitOptions, duration: 450 }), 100);
  }, [flow.synced, canvasId]);
  useHotkeys('mod+o', () => void openFile(), { preventDefault: true, enabled: !!canvasesApiUrl });
  useHotkeys('mod+s', () => saveToFile(), { preventDefault: true });
  useHotkeys('mod+shift+e', () => void exportImage(), { preventDefault: true });
  // ? for help (by the character typed, so it works on every keyboard layout)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.closest?.('input, textarea, [contenteditable]')) return;
      if (event.key === '?') {
        event.preventDefault();
        setHelpOpen(true);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
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
  useHotkeys('mod+z', () => !lockedRef.current && flow.undo(), { preventDefault: true });
  useHotkeys(['mod+shift+z', 'mod+y'], () => !lockedRef.current && flow.redo(), { preventDefault: true });
  // Drawing tools' keys: V to select, H for the hand, N, T, C and A to put something down, 1-3 for the levels,
  // Shift+1 to fit
  useHotkeys('n', () => pickTool('note'));
  useHotkeys('t', () => pickTool('text'));
  useHotkeys('c', () => pickTool('comment'));
  // A for attention: a hotspot
  useHotkeys('a', () => pickTool('hotspot'));
  useHotkeys('v', () => setTool('select'));
  useHotkeys('h', () => setTool('hand'));
  useHotkeys(['1', '2', '3'], (event) => {
    const next = Number(event.code.replace('Digit', '')) as Level;
    if (next === 3 || !unavailableLevels[next]) changeLevel(next);
  });
  useHotkeys('shift+1', () => void fitView({ ...fitOptions, duration: 500 }), { useKey: false });
  useHotkeys('escape', () => {
    setHotspotDraft(null);
    setOpenHotspot(null);
    setTool('select');
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
  /** A tool that puts something down: picked, or put back to selecting if it was already */
  const pickTool = useStableCallback((next: 'text' | 'note' | 'comment' | 'hotspot') => {
    // (comments can be left on a locked canvas: reviewing it changes nothing on it)
    if (lockedRef.current && next !== 'comment') return;
    // Comments are pinned to the canvas people edit (L3)
    if (next === 'comment' && levelRef.current !== 3) changeLevel(3);
    setTool((current) => (current === next ? 'select' : next));
  });
  const toggleCommentMode = useCallback(() => pickTool('comment'), [pickTool]);
  const toggleNoteMode = useCallback(() => pickTool('note'), [pickTool]);
  const toggleTextMode = useCallback(() => pickTool('text'), [pickTool]);
  const toggleHotspotMode = useCallback(() => pickTool('hotspot'), [pickTool]);
  const selectTool = useCallback(() => setTool('select'), []);
  const handTool = useCallback(() => setTool('hand'), []);
  const toggleLock = useStableCallback(() => {
    setTool('select');
    flow.setLocked(lockedRef.current ? null : name);
  });

  const startComment = (anchor: CommentAnchor) => {
    setOpenThreadId(null);
    setDraft(anchor);
    setTool('select');
  };

  const flowPositionOf = (event: { clientX: number; clientY: number }) =>
    screenToFlowPosition({ x: event.clientX, y: event.clientY });

  // A place on L1 or L2 is on that level (they're laid out on their own): what's put there says so
  const placeLevel = () => (levelRef.current === 3 ? {} : { level: levelRef.current as 1 | 2 });
  const onPaneClick = useStableCallback((event: ReactMouseEvent) => {
    clearSelectedThreads();
    if (tool === 'hand') return;
    if (commentMode && editable) return startComment(anchorAt(flowPositionOf(event)));
    // Flagging: a hotspot where it's clicked
    if (tool === 'hotspot') return startHotspot({ position: flowPositionOf(event), ...placeLevel() });
    // The text and note tools: put where it's clicked, then back to selecting
    if (placing) {
      setTool('select');
      if (tool === 'text') return writeTextAt(flowPositionOf(event));
      return addNoteAt(flowPositionOf(event));
    }
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
  // ...and anywhere else on the canvas writes there, as on Excalidraw's (and Studio on the web's)
  const onCanvasDoubleClick = useStableCallback((event: ReactMouseEvent) => {
    if (!(event.target as Element).classList?.contains('react-flow__pane')) return;
    const container = editable ? findGroupAtPoint(flowPositionOf(event), nodesRef.current) : undefined;
    if (container) return setEditingId(container.id);
    if (!lockedRef.current) writeTextAt(flowPositionOf(event));
  });

  const onNodeClick = useStableCallback((event: ReactMouseEvent, node: Node) => {
    // Clicking one node selects just it (with shift or ⌘, it's added to what's selected)
    if (!event.shiftKey && !event.metaKey) clearSelectedThreads();
    // Not on notes and text: they're written on, not what's being flagged or commented on
    if (isWrittenOnCanvas(node.type)) return;
    // A hotspot on it (it shows on the node, wherever it goes, on every level it's on)
    if (tool === 'hotspot') return startHotspot({ nodeId: node.id, position: flowPositionOf(event) });
    if (commentMode && editable) startComment(anchorAt(flowPositionOf(event), node, lookupNodes()));
  });

  const openContextMenu = useStableCallback((event: ReactMouseEvent | MouseEvent, node?: Node) => {
    event.preventDefault();
    if (!editable || lockedRef.current) return;
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
  /** A sticky note where the menu was opened, or to the right of the node right clicked (about it) */
  const noteFromMenu = useStableCallback(() => {
    if (!contextMenu) return;
    const node = contextMenu.node && lookupNodes().get(contextMenu.node.id);
    if (node) {
      const at = getAbsolutePosition(node, lookupNodes());
      const width = node.measured?.width ?? node.width ?? 240;
      addNoteAt({ x: at.x + width + 140, y: at.y + 88 });
    } else addNoteAt(contextMenu.flowPosition);
    setContextMenu(null);
  });
  const hotspotFromMenu = useStableCallback(() => {
    if (!contextMenu) return;
    startHotspot({ ...(contextMenu.node ? { nodeId: contextMenu.node.id } : placeLevel()), position: contextMenu.flowPosition });
    setContextMenu(null);
  });
  const reorderFromMenu = useStableCallback(() => {
    setContextMenu(null);
    onReorder();
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
    setListingComments(false);
    const { x, y } = getAnchorPosition(thread, lookupNodes());
    // Leave room for the thread, which opens to the right of its pin
    void setCenter(x + 150, y, { zoom: getZoom(), duration: 300 });
    setDraft(null);
    setOpenThreadId(thread.id);
  });
  const toggleResolved = useCallback(() => setShowResolved((show) => !show), []);
  const [panelTab, setPanelTab] = useState<LeftPanelTab>('components');
  // All the comments, listed over the bottom left controls (as Studio on the web's): clicking one goes to it
  const [listingComments, setListingComments] = useState(false);
  const toggleCommentList = useCallback(() => {
    setListingHotspots(false);
    setListingComments((shown) => !shown);
  }, []);
  const openComments = comments.threads.filter((thread) => !thread.resolved).length;
  const commentsControl = useMemo(
    () => ({ open: openComments, onToggle: toggleCommentList, active: listingComments }),
    [openComments, toggleCommentList, listingComments]
  );
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
  // The node whose details are being edited in its card: opened with the edit button over it, by double clicking it,
  // or "Edit details" in its menu (selecting a node doesn't open it). Notes are edited on the canvas.
  const [editingId, setEditingId] = useState<string | null>(null);
  // Made at the end of a connection: selected and its details opened once it's on the canvas (looked for as what's on
  // it changes, not as things move), its name empty to type it straight in. NodeDetails is keyed by the node, so its
  // name starts empty when its card opens, and only then (the next card opened, even its own again, doesn't).
  const editOnceShown = useRef<string | null>(null);
  const [justMadeId, setJustMadeId] = useState<string | null>(null);
  useEffect(() => {
    const id = editOnceShown.current;
    if (!id || !nodesRef.current.some((node) => node.id === id)) return;
    editOnceShown.current = null;
    select(new Set([id]));
    setEditingId(id);
    setJustMadeId(id);
  }, [flow.structureKey]);
  useEffect(() => setJustMadeId((id) => (id === editingId ? id : null)), [editingId]);
  const editing = editingId ? flow.nodes.find((node) => node.id === editingId && !isWrittenOnCanvas(node.type)) : undefined;
  // What the card shows (not the node's position, so dragging it doesn't re-render the card)
  const inspected = useMemo(
    () => (editing ? { id: editing.id, type: editing.type, data: editing.data } : null),
    [editing?.id, editing?.type, editing?.data]
  );
  // The domain or system it's in
  const parent = editing?.parentId ? flow.nodes.find((node) => node.id === editing.parentId) : undefined;
  const inspectedParent = parent ? String(getResource(parent.type, parent.data).name ?? '') || undefined : undefined;
  // What it's connected to, for its card
  const inspectedConnections = useMemo((): NodeConnection[] => {
    if (!editingId) return [];
    const byId = new Map(flow.nodes.map((node) => [node.id, node]));
    return flow.edges.flatMap((edge) => {
      const outgoing = edge.source === editingId;
      if (!outgoing && edge.target !== editingId) return [];
      const other = byId.get(outgoing ? edge.target : edge.source);
      if (!other || isWrittenOnCanvas(other.type)) return [];
      const name = String(getResource(other.type, other.data).name ?? '') || getNodeLabel(other.type);
      return [{ id: other.id, name, type: other.type, label: typeof edge.label === 'string' ? edge.label : undefined, outgoing }];
    });
  }, [editingId, flow.nodes, flow.edges]);
  // Goes to a node it's connected to, and shows its card
  const openConnected = useStableCallback((id: string) => {
    setEditingId(id);
    select(new Set([id]));
    void fitView({ nodes: [{ id }], duration: 400, padding: 0.3, maxZoom: 1.2 });
  });
  const closePanel = useCallback(() => setEditingId(null), []);
  // An accepted or rejected canvas, and when it was decided
  const { status: canvasStatus, history: statusHistory } = flow.canvasStatus;
  const decided = isDecided(canvasStatus)
    ? { status: canvasStatus, change: statusHistory.findLast((change) => change.status === canvasStatus) }
    : null;

  return (
    <UpdateNodeDataContext.Provider value={flow.updateNodeData}>
      <DropTargetContext.Provider value={dropTargetId}>
        <EditingContext.Provider value={flow.sendEditing}>
          <StartWritingContext.Provider value={startWriting}>
            <LockedContext.Provider value={locked}>
              <div className="flex h-full min-h-0 text-[rgb(var(--ec-page-text))]">
                <div
                  ref={canvasRef}
                  className={`eventcatalog-visualizer studio-canvas relative flex-1 min-w-0 ${commentMode ? 'comment-mode' : ''} ${
                    transitioning ? 'is-layout-transition' : ''
                  } ${placing || tool === 'comment' || tool === 'hotspot' ? 'is-placing' : ''} ${tool === 'hand' ? 'is-panning' : ''}`}
                  onPointerMove={trackPointer}
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
                    onConnect={editable ? flow.onConnect : onLevelConnect}
                    onConnectEnd={connect.onConnectEnd}
                    // Drag either end of a connection to another node (dropped anywhere else, it stays where it was)
                    edgesReconnectable={editable && !locked}
                    onReconnect={editable ? flow.onReconnect : undefined}
                    onReconnectStart={connect.onReconnectStart}
                    onReconnectEnd={connect.onReconnectEnd}
                    reconnectRadius={RECONNECT_RADIUS}
                    onDragOver={locked ? undefined : onDragOver}
                    onMoveStart={onMoveStart}
                    onMoveEnd={onMoveEnd}
                    onNodeDragStart={onNodeDragStart}
                    onNodeDrag={onNodeDrag}
                    onNodeDragStop={onNodeDragStop}
                    onDrop={locked ? undefined : onDrop}
                    onPaneClick={onPaneClick}
                    onNodeClick={onNodeClick}
                    onNodeDoubleClick={onNodeDoubleClick}
                    onError={onFlowError}
                    onSelectionStart={clearSelectedThreads}
                    onPaneContextMenu={onPaneContextMenu}
                    onNodeContextMenu={onNodeContextMenu}
                    connectionLineType={ConnectionLineType.SmoothStep}
                    connectionRadius={40}
                    deleteKeyCode={locked ? null : DELETE_KEYS}
                    multiSelectionKeyCode={MULTI_SELECTION_KEYS}
                    selectionOnDrag={tool !== 'hand'}
                    // The hand drags the canvas around; otherwise dragging selects (space, the middle button or scrolling pan)
                    panOnDrag={tool === 'hand' ? true : PAN_BUTTONS}
                    panOnScroll
                    zoomActivationKeyCode={ZOOM_KEYS}
                    zoomOnDoubleClick={false}
                    minZoom={0.1}
                    maxZoom={2}
                  >
                    <DiagramBackground />
                    <RemeasureHandles />
                    {/* Above the selected node's top right corner: its details, to edit them */}
                    {toEdit && <EditButton nodeId={toEdit.id} locked={locked} onClick={editSelected} />}
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
                    {/* Hotspots on every level (on L1 and L2, on what they're in) */}
                    <HotspotLayer
                      spots={hotspotSpots}
                      openKey={openHotspot}
                      draft={hotspotDraft}
                      locked={locked}
                      movable={!locked}
                      selectedIds={null}
                      onMove={moveHotspots}
                      onDropTarget={setHotspotDropTarget}
                      onOpen={setOpenHotspot}
                      onCreate={createHotspot}
                      onCancelDraft={cancelHotspot}
                      onUpdate={flow.updateHotspot}
                      onDelete={deleteHotspot}
                      onGo={goToHotspot}
                    />
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
                        <span className="font-semibold">L{level}</span> ·{' '}
                        {LEVELS.find((entry) => entry.level === level)?.description}
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

                  {/* At the top, as drawing tools have their tools (and Studio on the web has them) */}
                  <CanvasControls
                    level={level}
                    onLevelChange={changeLevel}
                    unavailableLevels={unavailableLevels}
                    editable={editable}
                    locked={locked}
                    onToggleLock={toggleLock}
                    lockedBy={flow.lockedBy}
                    selectMode={tool === 'select'}
                    onSelectMode={selectTool}
                    handMode={tool === 'hand'}
                    onHandMode={handTool}
                    noteMode={tool === 'note'}
                    onToggleNoteMode={toggleNoteMode}
                    textMode={tool === 'text'}
                    onToggleTextMode={toggleTextMode}
                    commentMode={commentMode}
                    onToggleCommentMode={toggleCommentMode}
                    hotspotMode={tool === 'hotspot'}
                    onToggleHotspotMode={toggleHotspotMode}
                  />

                  {/* The palette: components, the catalog and the comments, under the canvas's title */}
                  {!locked && (
                    <LeftPanel
                      level={level}
                      onShowAll={editInL3}
                      resources={resources}
                      keysOnCanvas={keysOnCanvas}
                      onAddComponent={addComponent}
                      onAddResource={addResourceFromPanel}
                      tab={panelTab}
                      onTabChange={setPanelTab}
                      startCollapsed={paletteCollapsed}
                    />
                  )}

                  {/* All the hotspots, most important first, over the bottom left controls: clicking one goes to it */}
                  {listingComments && (
                    <div className="absolute bottom-[64px] left-3 z-20 flex max-h-[min(480px,calc(100%-140px))] w-80 flex-col overflow-hidden rounded-xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] shadow-xl">
                      <div className="flex flex-none items-center justify-between border-b border-[rgb(var(--ec-page-border))] px-3 py-2 text-sm font-semibold">
                        Comments
                        <button
                          type="button"
                          aria-label="Close"
                          onClick={toggleCommentList}
                          className="rounded p-1 text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-content-hover))]"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-2">
                        <CommentList
                          threads={comments.threads}
                          showResolved={showResolved}
                          onToggleResolved={toggleResolved}
                          onOpen={openThread}
                        />
                      </div>
                    </div>
                  )}
                  {listingHotspots && (
                    <div className="absolute bottom-[64px] left-3 z-20 flex max-h-[min(480px,calc(100%-140px))] w-80 flex-col overflow-hidden rounded-xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] shadow-xl">
                      <div className="flex flex-none items-center justify-between border-b border-[rgb(var(--ec-page-border))] px-3 py-2 text-sm font-semibold">
                        Hotspots
                        <button
                          type="button"
                          aria-label="Close"
                          onClick={toggleHotspotList}
                          className="rounded p-1 text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-content-hover))]"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="min-h-0 flex-1 overflow-y-auto">
                        <HotspotList hotspots={flow.hotspots} nameOf={nameOfNode} onOpen={goToHotspot} />
                      </div>
                    </div>
                  )}

                  {/* Bottom left: zoom, undo and redo (as Excalidraw's), fitting and reordering, the comments and hotspots */}
                  <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
                    <ViewControls
                      canUndo={flow.canUndo && !locked}
                      canRedo={flow.canRedo && !locked}
                      onUndo={flow.undo}
                      onRedo={flow.redo}
                      onReorder={onReorder}
                      reorderLabel={
                        editable ? "Reorder diagram (the visualiser's layout)" : `Reorder L${level} (the visualiser's layout)`
                      }
                      locked={locked}
                      fitOptions={fitOptions}
                      comments={commentsControl}
                      hotspots={hotspotsControl}
                    />
                  </div>

                  <ContextMenu
                    menu={contextMenu}
                    onAddComment={commentFromMenu}
                    onAddHotspot={hotspotFromMenu}
                    onAddNote={noteFromMenu}
                    onEditDetails={editFromMenu}
                    onCopy={copyFromMenu}
                    onDuplicate={duplicateFromMenu}
                    onPaste={lastCopied ? pasteFromMenu : undefined}
                    onReorder={reorderFromMenu}
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
                    me={author}
                    onRename={onRename}
                    onRecolor={onRecolor}
                    onConnectAgent={openConnect}
                    onShare={openShare}
                    onOpenFile={canvasesApiUrl ? openFile : undefined}
                    onSaveToFile={saveToFile}
                    onExportImage={exportImage}
                    onLiveCollaboration={openLiveCollaboration}
                    onHelp={openHelp}
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

                  {/* Only on an empty canvas (not over comments people have left on it): what it's for, and what to do */}
                  {flow.status === 'connected' &&
                    flow.nodes.length === 0 &&
                    comments.threads.length === 0 &&
                    flow.hotspots.length === 0 &&
                    !draft && (
                      <EmptyCanvas
                        // Just the hints to the palette, levels and Share (the catalog is around it, not a blank page)
                        welcome={false}
                        onOpen={canvasesApiUrl ? openFile : undefined}
                        onHelp={openHelp}
                        onConnect={openConnect}
                        palette={!locked}
                        live
                      />
                    )}

                  {/* The node being edited: its card, next to it (as Studio on the web's) */}
                  {inspected && (
                    <NodeDetails
                      key={inspected.id}
                      node={inspected}
                      parentName={inspectedParent}
                      connections={inspectedConnections}
                      onOpenNode={openConnected}
                      containerRef={canvasRef}
                      nameEmpty={inspected.id === justMadeId}
                      locked={locked}
                      onChange={flow.updateNodeData}
                      onClose={closePanel}
                    />
                  )}
                </div>

                {connect.chooser && <ConnectChooser {...connect.chooser} />}
                {chooser && (
                  <ContainerChooser
                    kind={chooser.resource.collection === 'domains' ? 'domain' : 'system'}
                    name={chooser.resource.name}
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
                    initialView={shareOpen}
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
                {helpOpen && <ShortcutsDialog onClose={closeHelp} />}
                {notice && (
                  <div
                    role="status"
                    className="absolute left-1/2 top-[72px] z-30 max-w-md -translate-x-1/2 rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] px-4 py-2 text-sm shadow-lg"
                  >
                    {notice}
                  </div>
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
              </div>
            </LockedContext.Provider>
          </StartWritingContext.Provider>
        </EditingContext.Provider>
      </DropTargetContext.Provider>
    </UpdateNodeDataContext.Provider>
  );
}
