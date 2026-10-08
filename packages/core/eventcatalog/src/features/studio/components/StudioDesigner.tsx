import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent as ReactMouseEvent } from 'react';
import {
  Background,
  ConnectionLineType,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeChange,
  type XYPosition,
} from '@xyflow/react';
import { edgeTypes } from '@eventcatalog/visualiser';
import { useHotkeys } from 'react-hotkeys-hook';
import { getCatalogConnections, indexCatalog, planWithConnections, type ConnectionGroup } from '../canvas-actions';
import { isDecided } from '../canvas-doc';
import { CLIPBOARD_TYPE, copyNodes, pasteNodes, readClipboard, type ClipboardContent } from '../clipboard';
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
  findGroupAtPoint,
  getAbsolutePosition,
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
import { getNodeDefinition, getNodeLabel, getNodeName, getNoteLevel, isOnLevel, isWrittenOnCanvas } from '../node-types';
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
const DELETE_KEYS = ['Backspace', 'Delete'];
const LEVEL_FIT_VIEW_OPTIONS = { ...FIT_VIEW_OPTIONS, maxZoom: 1 };
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
    select: (ids) =>
      flow.onNodesChange(nodesRef.current.map((node) => ({ type: 'select', id: node.id, selected: ids.includes(node.id) }))),
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
  const [chooser, setChooser] = useState<{ resource: CatalogResource; center: XYPosition } | null>(null);
  // A service or message that connects to things not on the canvas yet: asked whether to bring them too
  const [connectionsChooser, setConnectionsChooser] = useState<{
    resource: CatalogResource;
    center: XYPosition;
    groups: ConnectionGroup[];
  } | null>(null);

  // A catalog resource is added with edges to the related resources already on the canvas
  const addResource = useStableCallback((key: string, center: XYPosition = canvasCenter()) => {
    const resource = catalog.resourcesByKey.get(key);
    if (!resource) return;
    if (canBeContainer(resource)) return setChooser({ resource, center });
    const groups = getCatalogConnections(resource, catalog, keysOnCanvas);
    if (groups.length > 0) return setConnectionsChooser({ resource, center, groups });
    addCard(resource, center);
  });

  const addCard = (resource: CatalogResource, center: XYPosition) =>
    flow.insertNode(resource.node.type, catalogNodeData(resource), center, (id, existing) =>
      getRelatedEdges(resource, id, existing, catalog.relationsByKey)
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
  const addContainer = async (resource: CatalogResource, center: XYPosition, withContents: boolean) => {
    const existing = nodesRef.current;
    const built = withContents
      ? await buildContainerWithContents(resource, center, catalog, existing)
      : { nodes: [buildContainer(resource, center)], edges: [] };
    // Dropped in another container (e.g. a system in its domain): it goes in it
    const outer = findGroupAtPoint(center, existing);
    const nodes = outer
      ? built.nodes.map((node) =>
          node.parentId ? node : { ...node, parentId: outer.id, position: toRelativePosition(node.position, outer.id, existing) }
        )
      : built.nodes;
    // With its contents, the canvas is laid out again to make room for it all
    if (withContents && existing.length > 0) reorderOnceShown.current = nodes.map((node) => node.id);
    flow.insertNodes(nodes, built.edges);
  };

  const choose = useStableCallback((choice: ContainerChoice) => {
    if (!chooser) return;
    if (choice.as === 'card') addCard(chooser.resource, chooser.center);
    else void addContainer(chooser.resource, chooser.center, choice.withContents);
    setChooser(null);
  });
  const cancelChooser = useCallback(() => setChooser(null), []);

  const chooseConnections = useStableCallback((choice: ConnectionsChoice) => {
    if (!connectionsChooser) return;
    const { resource, center } = connectionsChooser;
    if (choice.as === 'card') addCard(resource, center);
    else {
      const { nodes, edges } = planWithConnections(nodesRef.current, resource, center, choice.include, catalog);
      flow.insertNodes(nodes, edges);
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
   * Where something added while L1 or L2 is shown goes: L1 and L2 are views of the canvas people edit (L3), so it's
   * added there (shown on L3), below what's on it
   */
  const centerOnCanvas = (center: XYPosition) => {
    if (levelRef.current === 3) return center;
    changeLevel(3);
    const roots = nodesRef.current.filter((node) => !node.parentId && isOnLevel(node, 3));
    if (roots.length === 0) return { x: 0, y: 0 };
    const left = Math.min(...roots.map((node) => node.position.x));
    const right = Math.max(...roots.map((node) => node.position.x + sizeOf(node).width));
    const bottom = Math.max(...roots.map((node) => node.position.y + sizeOf(node).height));
    return { x: (left + right) / 2, y: bottom + 160 };
  };
  const addComponentAt = (type: string, center: XYPosition) =>
    type === 'note' ? addNoteAt(center) : flow.addNode(type, centerOnCanvas(center));

  const addComponent = useStableCallback((type: string) => addComponentAt(type, canvasCenter()));
  const addNote = useStableCallback(() => addNoteAt(canvasCenter()));
  const addResourceFromPanel = useStableCallback((key: string) => addResource(key, centerOnCanvas(canvasCenter())));

  const onDrop = useStableCallback((event: DragEvent) => {
    event.preventDefault();
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const type = event.dataTransfer.getData(COMPONENT_DRAG_TYPE);
    const resourceKey = event.dataTransfer.getData(CATALOG_DRAG_TYPE);
    if (type) addComponentAt(type, position);
    if (resourceKey) addResource(resourceKey, centerOnCanvas(position));
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
    interactions.current[kind] = on;
    canvasRef.current?.classList.toggle('ec-interaction-active', interactions.current.moving || interactions.current.dragging);
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

  // Like EventCatalog's diagrams: L3 is the canvas people edit, L1 and L2 read only views of it
  const [level, setLevel] = useState<Level>(3);
  const levelRef = useRef(level);
  levelRef.current = level;
  const editable = level === 3;
  const [levelGraph, setLevelGraph] = useState<{ level: Level; nodes: Node[]; edges: Edge[] } | null>(null);

  // What a level shows depends on what's on the canvas and how it's connected, and names (not positions). Notes
  // aren't laid out with it: adding, moving or writing one doesn't lay the level out again.
  const levelKey =
    level === 3
      ? ''
      : `${flow.nodes
          .filter((node) => node.type !== 'note')
          .map((node) => `${node.id}:${node.type}:${node.parentId ?? ''}:${getNodeName(node.type, node.data)}`)
          .join('|')}#${flow.edges.map((edge) => `${edge.source}>${edge.target}:${String(edge.label ?? '')}`).join('|')}`;
  const shownLevelRef = useRef<Level | undefined>(undefined);
  shownLevelRef.current = levelGraph?.level;
  useEffect(() => {
    if (level === 3) return setLevelGraph(null);
    let cancelled = false;
    // Straight away when switching levels; after changes settle while one is shown
    const timer = setTimeout(
      () => {
        const collapsed = getLevelGraph(nodesRef.current, edgesRef.current, level);
        void layoutGraph(
          collapsed.nodes.map((node) => ({ ...node, selected: false })),
          collapsed.edges
        ).then((laidOut) => !cancelled && setLevelGraph({ level, ...laidOut }));
      },
      shownLevelRef.current === level ? LEVEL_RELAYOUT_MS : 0
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [level, levelKey]);

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

  // Fit the camera to a level once it's laid out (and to the canvas when going back to L3)
  const shownLevel = level === 3 ? 3 : levelGraph?.level;
  useEffect(() => {
    if (shownLevel === undefined) return;
    // Like the visualiser, a level isn't zoomed in past its real size
    const options = shownLevel === 3 ? FIT_VIEW_OPTIONS : LEVEL_FIT_VIEW_OPTIONS;
    const frame = requestAnimationFrame(() => void fitView({ ...options, duration: 450 }));
    return () => cancelAnimationFrame(frame);
  }, [shownLevel]);

  /** Lays the canvas out with the visualiser's layout, for everyone on it (everyone's nodes glide there) */
  const reorder = useStableCallback(async () => {
    if (levelRef.current !== 3) setLevel(3);
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
  /** On L1 and L2, only changes to the level's notes go to the canvas (its other nodes are drawn from it) */
  const onLevelNodesChange = useStableCallback((changes: NodeChange[]) => {
    const notes = new Set(nodesRef.current.filter((node) => getNoteLevel(node) === levelRef.current).map((node) => node.id));
    const ofNotes = changes.filter((change) => change.type !== 'add' && notes.has(change.id));
    if (ofNotes.length) flow.onNodesChange(ofNotes);
  });
  // Message edges' envelopes only move on what's selected (the edge, or a node at either end): any moving
  // envelope at all costs a style recalc and layout every frame, which an editing canvas can't afford at idle
  const shownEdges = useMemo(() => {
    const edges = levelShown ? levelShown.edges : flow.edges;
    const focused = new Set(selectedKey ? selectedKey.split(',') : []);
    return edges.map((edge) =>
      edge.type === 'animated' && !edge.selected && !focused.has(edge.source) && !focused.has(edge.target)
        ? withoutEnvelope(edge)
        : edge
    );
  }, [levelShown, flow.edges, selectedKey]);
  const unavailableLevels = useMemo(
    () => ({ 1: getLevelUnavailableReason(nodesRef.current, 1), 2: getLevelUnavailableReason(nodesRef.current, 2) }),
    [structure]
  );

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
    if (editable && !isWrittenOnCanvas(node.type)) setEditingId(node.id);
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
  const editing =
    editable && editingId ? flow.nodes.find((node) => node.id === editingId && !isWrittenOnCanvas(node.type)) : undefined;
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
              nodes={shownNodes}
              edges={shownEdges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              nodesDraggable={editable}
              nodesConnectable={editable}
              elementsSelectable={editable}
              onNodesChange={editable ? flow.onNodesChange : onLevelNodesChange}
              onEdgesChange={editable ? flow.onEdgesChange : undefined}
              onConnect={flow.onConnect}
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
              selectionOnDrag={editable}
              // Read only levels can't select: dragging pans them
              panOnDrag={editable ? PAN_BUTTONS : true}
              panOnScroll
              zoomActivationKeyCode={ZOOM_KEYS}
              zoomOnDoubleClick={false}
              minZoom={0.1}
              maxZoom={2}
            >
              <Background gap={10} bgColor="rgb(var(--ec-page-bg))" color="rgb(var(--ec-page-border))" />
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
                  <span className="font-semibold">L{level}</span> · {LEVELS.find((entry) => entry.level === level)?.description} ·
                  read only, sticky notes can be added
                </span>
                <button onClick={editInL3} className="font-semibold text-[rgb(var(--ec-accent))] hover:underline">
                  Edit in L3
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
              position={flowToScreenPosition(chooser.center)}
              onChoose={choose}
              onCancel={cancelChooser}
            />
          )}
          {connectionsChooser && (
            <ConnectionsChooser
              resource={connectionsChooser.resource}
              groups={connectionsChooser.groups}
              position={flowToScreenPosition(connectionsChooser.center)}
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
