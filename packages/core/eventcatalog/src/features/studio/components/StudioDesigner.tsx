import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent as ReactMouseEvent } from 'react';
import {
  Background,
  ConnectionLineType,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type XYPosition,
} from '@xyflow/react';
import { edgeTypes } from '@eventcatalog/visualiser';
import { useHotkeys } from 'react-hotkeys-hook';
import { indexCatalog } from '../canvas-actions';
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
import { findDropTarget, findGroupAtPoint, sortByHierarchy, toRelativePosition } from '../grouping';
import type { Peer } from '../hooks/presence-store';
import { useCanvasWebMcp } from '../hooks/use-canvas-webmcp';
import { useStudioFlow } from '../hooks/use-studio-flow';
import { useComments, type CommentAnchor, type Thread } from '../hooks/use-comments';
import { getLayoutPositions, layoutGraph } from '../layout';
import { getLevelGraph, getLevelUnavailableReason, LEVELS, type Level } from '../levels';
import { getNodeLabel, getNodeName } from '../node-types';
import type { ToolSync } from '../tool-sync';
import CanvasControls, { FIT_VIEW_OPTIONS } from './CanvasControls';
import CanvasHeader from './CanvasHeader';
import { DropTargetContext, nodeTypes, UpdateNodeDataContext } from './canvas-nodes';
import { anchorAt, CanvasContextMenu, CommentLayer, getAnchorPosition, type ContextMenuState } from './Comments';
import ConnectAgentDialog, { enableWebMcp, isRelayEnabled, isWebMcpEnabled, loadRelay } from './ConnectAgentDialog';
import ContainerChooser, { type ContainerChoice } from './ContainerChooser';
import JoinForm, { colorForName, getStoredName, storeName } from './JoinForm';
import LeftPanel, { CATALOG_DRAG_TYPE, COMPONENT_DRAG_TYPE } from './LeftPanel';
import { AgentActivity, RemotePresence, ViewportSharer } from './Presence';
import PropertiesPanel from './PropertiesPanel';

type CanvasProps = {
  canvasId: string;
  /** Path of the collaboration socket on this site, or `socketUrl` when embedded elsewhere (e.g. an MCP App) */
  socketPath?: string;
  socketUrl?: string;
  /** Where "New canvas" goes (hidden when not given, e.g. inside a chat) */
  newCanvasUrl?: string;
  /** The canvas's link, for Share (defaults to this page) */
  shareUrl?: string;
  /** The EventCatalog MCP server agents connect to (a path on this site, or a URL) */
  mcpUrl?: string;
  /** The WebMCP local relay's script, when this page can offer it (not inside a chat) */
  relayScriptPath?: string;
  /** Sync through MCP tool calls when the WebSocket can't connect (e.g. inside a chat's sandbox) */
  syncViaTools?: ToolSync;
  /** Follow agents' changes with the camera from the start (e.g. inside a chat, where you watch an agent work) */
  followChanges?: boolean;
  /** Told what's selected (e.g. a chat attaches it to the conversation, so you can ask about it) */
  onSelectionChange?: (selected: SelectedNode[]) => void;
  /** Join with this name instead of asking for one (e.g. inside a chat, where the agent or host knows who it is) */
  defaultName?: string;
  resources: CatalogResource[];
  relations: CatalogRelation[];
};
/** A selected node, as told to whoever embeds the canvas */
export type SelectedNode = { id: string; name: string; type: string; catalogResource?: string };

/** How long a level (L1, L2) waits for changes to settle before it's laid out again */
const LEVEL_RELAYOUT_MS = 300;
const DELETE_KEYS = ['Backspace', 'Delete'];
const MULTI_SELECTION_KEYS = ['Meta', 'Shift'];
/**
 * Like design tools: dragging on the canvas draws a box to select what's inside it, and the canvas pans with
 * space + drag, the middle mouse button, or scrolling (two fingers on a trackpad). Pinch, or cmd / ctrl + scroll,
 * zooms. The right button stays for the context menu.
 */
const PAN_BUTTONS = [1];
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
const structureOf = (nodes: Node[]) => nodes.map((node) => `${node.id}:${node.type}:${node.parentId ?? ''}`).join('|');

export default function StudioDesigner({ defaultName, ...props }: CanvasProps) {
  const [name, setName] = useState(() => getStoredName() ?? defaultName ?? null);

  const saveName = useCallback((next: string) => {
    setName(next);
    storeName(next);
  }, []);

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
  shareUrl,
  mcpUrl = '/docs/mcp',
  relayScriptPath,
  syncViaTools,
  followChanges = false,
  onSelectionChange,
  resources,
  relations,
  name,
  onRename,
}: Omit<CanvasProps, 'defaultName'> & { name: string; onRename: (name: string) => void }) {
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

  const flow = useStudioFlow({
    canvasId,
    socketUrl: socketUrl ?? toSocketUrl(socketPath),
    name,
    color,
    syncViaTools,
    onLayout: glide,
  });
  const author = useMemo(() => ({ name, color }), [name, color]);
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

  // A catalog resource is added with edges to the related resources already on the canvas
  const addResource = useStableCallback((key: string, center: XYPosition = canvasCenter()) => {
    const resource = catalog.resourcesByKey.get(key);
    if (!resource) return;
    if (canBeContainer(resource)) return setChooser({ resource, center });
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

  const addComponent = useStableCallback((type: string) => flow.addNode(type, canvasCenter()));
  const addNote = useStableCallback(() => flow.addNode('note', canvasCenter()));

  const onDrop = useStableCallback((event: DragEvent) => {
    event.preventDefault();
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const type = event.dataTransfer.getData(COMPONENT_DRAG_TYPE);
    const resourceKey = event.dataTransfer.getData(CATALOG_DRAG_TYPE);
    if (type) flow.addNode(type, position);
    if (resourceKey) addResource(resourceKey, position);
  });

  // ---- Pointer, panning and dragging ----

  // React Flow's node drag and panning (d3) stop mousemove from propagating, so follow the
  // pointer with pointer events, and with dragover while something is dragged in from the palette
  const trackPointer = useStableCallback((event: { clientX: number; clientY: number }) => {
    flow.setPointer(screenToFlowPosition({ x: event.clientX, y: event.clientY }));
  });
  const clearPointer = useCallback(() => flow.setPointer(null), [flow.setPointer]);

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
  const onNodeDragStart = useCallback(() => {
    pauseCamera.current();
    setInteraction('dragging', true);
  }, [setInteraction]);
  const onNodeDrag = useStableCallback((_: unknown, __: Node, dragged: Node[]) => {
    const [root] = dragRoots(dragged);
    const current = root && nodesRef.current.find((node) => node.id === root.id);
    const target = root ? findDropTarget(root.id, nodesRef.current) : undefined;
    setDropTargetId(target && target.id !== current?.parentId ? target.id : null);
  });
  const onNodeDragStop = useStableCallback((_: unknown, __: Node, dragged: Node[]) => {
    setInteraction('dragging', false);
    setDropTargetId(null);
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

  // What a level shows depends on what's on the canvas and how it's connected, and names (not positions)
  const levelKey =
    level === 3
      ? ''
      : `${flow.nodes.map((node) => `${node.id}:${node.type}:${node.parentId ?? ''}:${getNodeName(node.type, node.data)}`).join('|')}#${flow.edges
          .map((edge) => `${edge.source}>${edge.target}:${String(edge.label ?? '')}`)
          .join('|')}`;
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
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);

  const changeLevel = useStableCallback((next: Level) => {
    if (next === level) return;
    glide();
    setCommentMode(false);
    setDraft(null);
    setOpenThreadId(null);
    setLevel(next);
  });
  const editInL3 = useCallback(() => changeLevel(3), [changeLevel]);

  // Fit the camera to a level once it's laid out (and to the canvas when going back to L3)
  const shownLevel = level === 3 ? 3 : levelGraph?.level;
  useEffect(() => {
    if (shownLevel === undefined) return;
    const frame = requestAnimationFrame(() => void fitView({ ...FIT_VIEW_OPTIONS, duration: 450 }));
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
  const shownNodes = levelShown ? levelShown.nodes : sortedNodes;
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
      flow.onNodesChange(nodesRef.current.map((node) => ({ type: 'select', id: node.id, selected: true })));
      flow.onEdgesChange(edgesRef.current.map((edge) => ({ type: 'select', id: edge.id, selected: true })));
    },
    { preventDefault: true }
  );
  useHotkeys('mod+z', () => onCanvas() && flow.undo(), { preventDefault: true });
  useHotkeys(['mod+shift+z', 'mod+y'], () => onCanvas() && flow.redo(), { preventDefault: true });
  useHotkeys('c', () => onCanvas() && setCommentMode((on) => !on));
  useHotkeys('escape', () => {
    setCommentMode(false);
    setDraft(null);
    setOpenThreadId(null);
    if (!onCanvas()) return;
    flow.onNodesChange(
      nodesRef.current.filter((node) => node.selected).map((node) => ({ type: 'select', id: node.id, selected: false }))
    );
    flow.onEdgesChange(
      edgesRef.current.filter((edge) => edge.selected).map((edge) => ({ type: 'select', id: edge.id, selected: false }))
    );
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
    if (commentMode && editable) return startComment(anchorAt(flowPositionOf(event)));
    setDraft(null);
    setOpenThreadId(null);
  });

  const onNodeClick = useStableCallback((event: ReactMouseEvent, node: Node) => {
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
  const deleteFromMenu = useStableCallback((id: string) => {
    flow.deleteNodes([id]);
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
    setOpenThreadId(comments.createThread(draft, text) ?? null);
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
  const single = editable && selected.length === 1 && selected[0].type !== 'note' ? selected[0] : null;
  const inspected = useMemo(
    () => (single ? { id: single.id, type: single.type, data: single.data } : null),
    [single?.id, single?.type, single?.data]
  );

  return (
    <UpdateNodeDataContext.Provider value={flow.updateNodeData}>
      <DropTargetContext.Provider value={dropTargetId}>
        <div className="flex h-full min-h-0 text-[rgb(var(--ec-page-text))]">
          <LeftPanel
            resources={resources}
            keysOnCanvas={keysOnCanvas}
            onAddComponent={addComponent}
            onAddResource={addResource}
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
          >
            <ReactFlow
              nodes={shownNodes}
              edges={shownEdges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              nodesDraggable={editable}
              nodesConnectable={editable}
              elementsSelectable={editable}
              onNodesChange={editable ? flow.onNodesChange : undefined}
              onEdgesChange={editable ? flow.onEdgesChange : undefined}
              onConnect={flow.onConnect}
              onDragOver={onDragOver}
              onMoveStart={onMoveStart}
              onMoveEnd={onMoveEnd}
              onNodeDragStart={onNodeDragStart}
              onNodeDrag={editable ? onNodeDrag : undefined}
              onNodeDragStop={editable ? onNodeDragStop : undefined}
              onDrop={onDrop}
              onPaneClick={onPaneClick}
              onNodeClick={onNodeClick}
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
                  read only
                </span>
                <button onClick={editInL3} className="font-semibold text-[rgb(var(--ec-accent))] hover:underline">
                  Edit in L3
                </button>
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
              webMcp={webMcp}
              shareUrl={shareUrl}
              newCanvasUrl={newCanvasUrl}
            />

            {flow.status === 'connected' && flow.nodes.length === 0 && (
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
          {connectOpen && (
            <ConnectAgentDialog
              link={agentLink}
              webMcp={webMcp}
              relayScriptPath={relayScriptPath}
              onEnableWebMcp={turnOnWebMcp}
              onClose={closeConnect}
            />
          )}
          {inspected && <PropertiesPanel node={inspected} onChange={flow.updateNodeData} onDelete={flow.deleteNodes} />}
        </div>
      </DropTargetContext.Provider>
    </UpdateNodeDataContext.Provider>
  );
}
