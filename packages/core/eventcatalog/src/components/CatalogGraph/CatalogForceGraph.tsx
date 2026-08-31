/**
 * CatalogForceGraph
 *
 * A D3 force-directed graph of every resource in the catalog and the
 * relationships between them. React owns the chrome (lens picker, search,
 * legend, tooltip); D3 owns the simulation, zoom and drag behaviours.
 *
 * Built to stay responsive on catalogs with thousands of resources:
 * - Renders to a single <canvas> instead of SVG (no per-node DOM cost).
 * - Draw calls are batched per collection colour; offscreen nodes are culled.
 * - Labels use collision-aware placement: drawn in priority order (hubs and
 *   high-degree nodes first) into a screen-space occupancy list, skipping any
 *   label that would overlap one already placed.
 * - Node icons are pre-rasterised sprites, drawn only when readable.
 * - Pointer events use simulation.find() hit-testing, not per-node listeners.
 * - Props use a compact wire format (index-based links) to keep the payload
 *   Astro serialises into the page small.
 * - Node positions persist across lens/filter changes so the layout doesn't
 *   restart from scratch.
 *
 * Interactions: click a node (or search) to focus its neighbourhood,
 * double-click to open its docs, click the background to clear focus.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3-force';
import { select } from 'd3-selection';
import { zoom, zoomIdentity } from 'd3-zoom';
import type { ZoomTransform } from 'd3-zoom';
import { drag } from 'd3-drag';
import { getColorForCollection, tailwind500RgbByColor } from '@utils/collection-colors';
import { getIconForCollection } from '@utils/collections/icons';
import { buildUrl } from '@utils/url-builder';
import type { CatalogGraphWireLink, CatalogGraphWireNode } from '@utils/node-graphs/catalog-force-graph';

export type { CatalogGraphWireLink, CatalogGraphWireNode };

interface Props {
  nodes: CatalogGraphWireNode[];
  links: CatalogGraphWireLink[];
  linkLabels: string[];
  /** Seed the initial lens. URL state wins when `syncUrl` is on. */
  initialLens?: string;
  /** Seed the initial focused node key, e.g. `domains/Orders`. URL state wins when `syncUrl` is on. */
  initialFocus?: string;
  /** Seed the initial focus depth (1–3). URL state wins when `syncUrl` is on. */
  initialFocusDepth?: number;
  /**
   * Read the view state from the URL and mirror changes back into it — the
   * standalone /visualiser/graph page. Off for graphs embedded in docs pages,
   * which must not rewrite their host page's query string.
   */
  syncUrl?: boolean;
  /** Show the lens picker / detail slider (hidden on embedded graphs, which pin a lens) */
  showLensPicker?: boolean;
  showSearch?: boolean;
  showLegend?: boolean;
  /** When off, plain scrolling over the canvas scrolls the page — zooming needs ctrl/cmd+scroll */
  zoomOnScroll?: boolean;
  /**
   * Base URL of the standalone /visualiser/graph page. When set, an "open"
   * link is rendered whose query string carries the CURRENT view state (focus,
   * depth, lens, hidden collections), so the full page opens on exactly the
   * view the embedded graph is showing.
   */
  openInGraphUrl?: string;
  openInGraphLabel?: string;
}

interface GraphNode extends CatalogGraphWireNode {
  /** Unique node key, e.g. `services/InventoryService` */
  key: string;
  url: string;
}

interface GraphLink {
  source: string;
  target: string;
  label: string;
}

// d3-force mutates its inputs, so we hand it disposable copies typed loosely.
type SimNode = GraphNode & {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  degree: number;
};
type SimLink = { source: SimNode | string; target: SimNode | string; label: string };

const COLLECTION_LABELS: Record<string, string> = {
  domains: 'Domains',
  systems: 'Systems',
  services: 'Services',
  events: 'Events',
  commands: 'Commands',
  queries: 'Queries',
  flows: 'Flows',
  entities: 'Entities',
  containers: 'Containers',
  'data-products': 'Data products',
  agents: 'Agents',
  teams: 'Teams',
};

interface Lens {
  label: string;
  description: string;
  /** Collections rendered as large anchor nodes in this view */
  hubCollections?: string[];
  /** Collections removed from this view entirely */
  excludeCollections?: string[];
  /** When set, only these relationship types are kept — and only the resources involved in them */
  edgeLabels?: string[];
  /** Collection whose nodes act as cluster centres: members are pulled together and wrapped in a hull */
  clusterBy?: string;
}

const LENSES: Record<string, Lens> = {
  all: {
    label: 'All resources',
    description: 'Every resource and relationship in the catalog',
    clusterBy: 'domains',
  },
  domains: {
    label: 'Domains',
    description: 'Domains as anchors, with their architecture radiating out',
    hubCollections: ['domains'],
    excludeCollections: ['teams'],
    clusterBy: 'domains',
  },
  systems: {
    label: 'Systems',
    description: 'Systems as anchors, with the services and infrastructure inside them',
    hubCollections: ['systems'],
    excludeCollections: ['teams'],
    clusterBy: 'systems',
  },
  services: {
    label: 'Services',
    description: 'Services and agents as anchors, with the messages and data they touch',
    hubCollections: ['services', 'agents'],
    excludeCollections: ['teams', 'domains', 'systems'],
    clusterBy: 'services',
  },
  teams: {
    label: 'Teams',
    description: 'Teams as anchors, with the resources they own',
    hubCollections: ['teams'],
    edgeLabels: ['owned by'],
    clusterBy: 'teams',
  },
  messages: {
    label: 'Message flow',
    description: 'Services, agents and domains connected only by the messages they exchange',
    edgeLabels: ['publishes', 'invokes', 'requests', 'subscribed by', 'accepts', 'sends', 'received by'],
  },
};

/** Ownership edges are social, not structural — never route cluster assignment through them */
const OWNERSHIP_EDGE_LABELS = new Set(['owned by']);

const nodeColor = (collection: string) => `rgb(${tailwind500RgbByColor[getColorForCollection(collection)]})`;

const nodeRadius = (degree: number, isHub = false) =>
  isHub ? Math.min(16 + Math.sqrt(degree) * 3, 38) : Math.min(6 + Math.sqrt(degree) * 2.5, 22);

/** Above this node count, expensive extras (collision force) are disabled. */
const LARGE_GRAPH_NODE_COUNT = 1500;

/** Sprite resolution for node icons (drawn scaled-down, so keep it crisp) */
const ICON_SPRITE_SIZE = 64;

/** Icons only draw once a node is at least this many pixels on screen */
const ICON_MIN_SCREEN_RADIUS = 7;

/** Hard cap on labels per frame — beyond this the view is unreadable anyway */
const MAX_LABELS_PER_FRAME = 200;

/**
 * Non-hub labels only draw once their node is at least this many pixels on
 * screen — raise to make the zoomed-out view reduce to hub labels sooner.
 */
const NON_HUB_LABEL_MIN_SCREEN_RADIUS = 8;

/** How strongly cluster members are pulled toward their cluster centre */
const CLUSTER_FORCE_STRENGTH = 0.03;

/** World-space padding around cluster hulls */
const HULL_PADDING = 28;

/** Extra padding per containment-ancestor ring around a focused node's bubble */
const ANCESTOR_RING_WIDTH = 44;

/** Auto-fit sizes the graph to this fraction of the viewport */
const FIT_VIEWPORT_FRACTION = 0.8;

/** Auto-fit never zooms in past this, so a tiny focus subgraph doesn't look comical */
const MAX_FIT_SCALE = 2.5;

/** The lens detail slider's top position means "show everything" */
const MAX_LENS_DEPTH = 4;

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const readThemeColor = (element: HTMLElement, variable: string, fallback: string) => {
  const value = getComputedStyle(element).getPropertyValue(variable).trim();
  return value ? `rgb(${value})` : fallback;
};

/** Andrew's monotone chain convex hull — small enough to not warrant a dependency */
const convexHull = (points: [number, number][]): [number, number][] => {
  if (points.length <= 2) return points;
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: [number, number][] = [];
  for (const p of [...sorted].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
};

const distanceToSegment = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};

const pointInPolygon = (px: number, py: number, polygon: [number, number][]) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

/** Distance from a point to a hull outline — 0 when the point is inside it */
const distanceToHull = (px: number, py: number, hull: [number, number][]) => {
  if (hull.length >= 3 && pointInPolygon(px, py, hull)) return 0;
  let min = Infinity;
  for (let i = 0; i < hull.length; i++) {
    const [ax, ay] = hull[i];
    const [bx, by] = hull[(i + 1) % hull.length];
    min = Math.min(min, distanceToSegment(px, py, ax, ay, bx, by));
  }
  return min;
};

const CatalogForceGraph = ({
  nodes,
  links,
  linkLabels,
  initialLens,
  initialFocus,
  initialFocusDepth,
  syncUrl = true,
  showLensPicker = true,
  openInGraphUrl,
  openInGraphLabel,
  showSearch = true,
  showLegend = true,
  zoomOnScroll = true,
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const iconSourceRef = useRef<HTMLDivElement>(null);
  // Positions survive lens/filter switches so the layout doesn't restart from scratch
  const positionsRef = useRef(new Map<string, { x: number; y: number }>());
  // Per-collection icons pre-rasterised to offscreen canvases — drawImage from a
  // cached bitmap is cheap enough to run per node per frame
  const iconSpritesRef = useRef(new Map<string, HTMLCanvasElement>());
  const drawRef = useRef<() => void>(() => {});
  // View state initialises from the URL so people can share what they're looking
  // at (?lens=domains&focus=services/OrderService&depth=2&detail=3&hide=teams,entities).
  // Embedded graphs (syncUrl off) seed from the initial* props instead — their
  // host page's query string is not theirs to read or write.
  const urlParam = (key: string) => (syncUrl ? new URLSearchParams(window.location.search).get(key) : null);
  const [hiddenCollections, setHiddenCollections] = useState<Set<string>>(() => {
    const hide = urlParam('hide');
    return new Set(hide ? hide.split(',').filter(Boolean) : []);
  });
  const [lensKey, setLensKey] = useState(() => {
    const lens = urlParam('lens') ?? initialLens;
    return lens && lens in LENSES ? lens : 'all';
  });
  const [focusKey, setFocusKey] = useState<string | null>(() => urlParam('focus') ?? initialFocus ?? null);
  const [focusDepth, setFocusDepth] = useState(() =>
    Math.min(3, Math.max(1, Number(urlParam('depth')) || initialFocusDepth || 1))
  );
  // How many hops of detail radiate out from a lens's anchor nodes (4 = everything)
  const [lensDepth, setLensDepth] = useState(() => Math.min(MAX_LENS_DEPTH, Math.max(1, Number(urlParam('detail')) || 1)));

  // Serialise the current view state into query params — shared between the
  // URL sync below and the embedded graphs' "open in graph" link
  const applyViewParams = (params: URLSearchParams) => {
    const setOrDelete = (key: string, value: string | null) => (value ? params.set(key, value) : params.delete(key));
    setOrDelete('lens', lensKey !== 'all' ? lensKey : null);
    setOrDelete('focus', focusKey);
    setOrDelete('depth', focusKey && focusDepth !== 1 ? String(focusDepth) : null);
    setOrDelete('detail', lensDepth !== 1 ? String(lensDepth) : null);
    setOrDelete('hide', hiddenCollections.size > 0 ? [...hiddenCollections].sort().join(',') : null);
    return params;
  };

  // Reflect the view state back into the URL (replaceState, so no history spam);
  // unrelated params — e.g. the stress page's ?nodes — are preserved
  useEffect(() => {
    if (!syncUrl) return;
    const query = applyViewParams(new URLSearchParams(window.location.search)).toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
  }, [lensKey, focusKey, focusDepth, lensDepth, hiddenCollections]);

  // The "open in graph" link tracks the live view, so what opens is what's shown
  const openInGraphHref = (() => {
    if (!openInGraphUrl) return undefined;
    const query = applyViewParams(new URLSearchParams()).toString();
    return `${openInGraphUrl}${query ? `?${query}` : ''}`;
  })();
  const [searchValue, setSearchValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const lens = LENSES[lensKey] ?? LENSES.all;

  const graph = useMemo(() => {
    const expandedNodes: GraphNode[] = nodes.map((node) => ({
      ...node,
      key: `${node.collection}/${node.id}`,
      url:
        node.collection === 'teams' || node.collection === 'users'
          ? buildUrl(`/docs/${node.collection}/${node.id}`)
          : buildUrl(`/docs/${node.collection}/${node.id}/${node.version ?? 'latest'}`),
    }));
    const expandedLinks: GraphLink[] = links.map(([source, target, label]) => ({
      source: expandedNodes[source].key,
      target: expandedNodes[target].key,
      label: linkLabels[label],
    }));
    return { nodes: expandedNodes, links: expandedLinks };
  }, [nodes, links, linkLabels]);

  const { lensNodes, lensLinks } = useMemo(() => {
    let lensNodes = lens.excludeCollections
      ? graph.nodes.filter((n) => !lens.excludeCollections!.includes(n.collection))
      : graph.nodes;
    const nodeKeys = new Set(lensNodes.map((n) => n.key));
    let lensLinks = graph.links.filter((l) => nodeKeys.has(l.source) && nodeKeys.has(l.target));
    if (lens.edgeLabels) {
      lensLinks = lensLinks.filter((l) => lens.edgeLabels!.includes(l.label));
      const connected = new Set(lensLinks.flatMap((l) => [l.source, l.target]));
      lensNodes = lensNodes.filter((n) => connected.has(n.key) || lens.hubCollections?.includes(n.collection));
    }
    return { lensNodes, lensLinks };
  }, [graph, lens]);

  // The focused node's containment chain, nearest parent first (a service may
  // sit inside a system inside a domain). Drawn as nested rings around the
  // focus bubble so drilling in reads as descending the architecture.
  const focusAncestors = useMemo(() => {
    if (!focusKey) return [];
    const nodeByKey = new Map(lensNodes.map((n) => [n.key, n]));
    const ancestors: { key: string; collection: string; label: string }[] = [];
    const visited = new Set([focusKey]);
    let frontier = new Set([focusKey]);
    while (frontier.size > 0 && ancestors.length < 4) {
      const parents = new Set<string>();
      for (const link of lensLinks) {
        if (link.label !== 'contains') continue;
        if (frontier.has(link.target) && !visited.has(link.source)) {
          visited.add(link.source);
          parents.add(link.source);
        }
      }
      for (const parent of parents) {
        const node = nodeByKey.get(parent);
        if (node) ancestors.push({ key: parent, collection: node.collection, label: node.label });
      }
      frontier = parents;
    }
    return ancestors;
  }, [focusKey, lensNodes, lensLinks]);

  // Lens overview detail: for hub lenses, only show what's within `lensDepth`
  // hops of an anchor node — the full graph is unreadable at scale, so the
  // default is a tight containment overview that users can widen.
  const { overviewNodes, overviewLinks } = useMemo(() => {
    if (!lens.hubCollections || lensDepth >= MAX_LENS_DEPTH) return { overviewNodes: lensNodes, overviewLinks: lensLinks };
    const hubCollections = new Set(lens.hubCollections);
    const adjacency = new Map<string, string[]>();
    for (const link of lensLinks) {
      if (!adjacency.has(link.source)) adjacency.set(link.source, []);
      if (!adjacency.has(link.target)) adjacency.set(link.target, []);
      adjacency.get(link.source)!.push(link.target);
      adjacency.get(link.target)!.push(link.source);
    }
    const keep = new Set<string>();
    let frontier: string[] = [];
    for (const node of lensNodes) {
      if (hubCollections.has(node.collection)) {
        keep.add(node.key);
        frontier.push(node.key);
      }
    }
    for (let depth = 0; depth < lensDepth; depth++) {
      const next: string[] = [];
      for (const key of frontier) {
        for (const neighbour of adjacency.get(key) ?? []) {
          if (keep.has(neighbour)) continue;
          keep.add(neighbour);
          next.push(neighbour);
        }
      }
      frontier = next;
    }
    return {
      overviewNodes: lensNodes.filter((n) => keep.has(n.key)),
      overviewLinks: lensLinks.filter((l) => keep.has(l.source) && keep.has(l.target)),
    };
  }, [lensNodes, lensLinks, lens, lensDepth]);

  // Focus mode: reduce the view to a node and its neighbourhood, out to a
  // user-chosen number of hops. Containment ancestors are represented by the
  // rings around the bubble, so their nodes are left out — and the BFS never
  // routes through them, or a wrapper would leak its whole contents into view.
  // Focus deliberately works on the FULL lens graph, not the depth-limited
  // overview — drilling into a node should always show its complete detail.
  const { viewNodes, viewLinks } = useMemo(() => {
    if (!focusKey || !lensNodes.some((n) => n.key === focusKey)) return { viewNodes: overviewNodes, viewLinks: overviewLinks };
    const ancestorKeys = new Set(focusAncestors.map((ancestor) => ancestor.key));
    const adjacency = new Map<string, string[]>();
    for (const link of lensLinks) {
      if (ancestorKeys.has(link.source) || ancestorKeys.has(link.target)) continue;
      if (!adjacency.has(link.source)) adjacency.set(link.source, []);
      if (!adjacency.has(link.target)) adjacency.set(link.target, []);
      adjacency.get(link.source)!.push(link.target);
      adjacency.get(link.target)!.push(link.source);
    }
    const keep = new Set([focusKey]);
    let frontier = [focusKey];
    for (let depth = 0; depth < focusDepth; depth++) {
      const next: string[] = [];
      for (const key of frontier) {
        for (const neighbour of adjacency.get(key) ?? []) {
          if (keep.has(neighbour)) continue;
          keep.add(neighbour);
          next.push(neighbour);
        }
      }
      frontier = next;
    }
    return {
      viewNodes: lensNodes.filter((n) => keep.has(n.key)),
      viewLinks: lensLinks.filter((l) => keep.has(l.source) && keep.has(l.target)),
    };
  }, [lensNodes, lensLinks, overviewNodes, overviewLinks, focusKey, focusDepth, focusAncestors]);

  // Clear a focus that no longer exists in the current lens
  useEffect(() => {
    if (focusKey && !lensNodes.some((n) => n.key === focusKey)) setFocusKey(null);
  }, [lensNodes, focusKey]);

  // Assign every node to a cluster centre (its nearest domain/system/team) via
  // multi-source BFS over the lens graph. Powers the cluster force and hulls.
  const clusterAssignments = useMemo(() => {
    const assignments = new Map<string, string>();
    const clusterCollection = lens.clusterBy;
    if (!clusterCollection) return assignments;
    const adjacency = new Map<string, string[]>();
    for (const link of lensLinks) {
      if (clusterCollection !== 'teams' && OWNERSHIP_EDGE_LABELS.has(link.label)) continue;
      if (!adjacency.has(link.source)) adjacency.set(link.source, []);
      if (!adjacency.has(link.target)) adjacency.set(link.target, []);
      adjacency.get(link.source)!.push(link.target);
      adjacency.get(link.target)!.push(link.source);
    }
    const queue: string[] = [];
    for (const node of lensNodes) {
      if (node.collection === clusterCollection) {
        assignments.set(node.key, node.key);
        queue.push(node.key);
      }
    }
    for (let i = 0; i < queue.length; i++) {
      const current = queue[i];
      const cluster = assignments.get(current)!;
      for (const neighbour of adjacency.get(current) ?? []) {
        if (assignments.has(neighbour)) continue;
        assignments.set(neighbour, cluster);
        queue.push(neighbour);
      }
    }
    return assignments;
  }, [lensNodes, lensLinks, lens]);

  const collectionsInGraph = useMemo(() => {
    const counts = new Map<string, number>();
    for (const node of overviewNodes) counts.set(node.collection, (counts.get(node.collection) ?? 0) + 1);
    // Stable order: the well-known collections first, anything unexpected after
    const known = Object.keys(COLLECTION_LABELS).filter((c) => counts.has(c));
    const unknown = [...counts.keys()].filter((c) => !(c in COLLECTION_LABELS));
    return [...known, ...unknown].map((collection) => ({ collection, count: counts.get(collection) ?? 0 }));
  }, [overviewNodes]);

  const searchSuggestions = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    const matches = query
      ? lensNodes.filter((n) => n.label.toLowerCase().includes(query) || n.id.toLowerCase().includes(query))
      : lensNodes;
    return matches.slice(0, 50);
  }, [lensNodes, searchValue]);

  const selectSuggestion = (node: GraphNode) => {
    setFocusKey(node.key);
    setSearchValue('');
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (searchSuggestions.length === 0) return;
      setShowSuggestions(true);
      setSelectedSuggestionIndex((previous) => (previous < searchSuggestions.length - 1 ? previous + 1 : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (searchSuggestions.length === 0) return;
      setShowSuggestions(true);
      setSelectedSuggestionIndex((previous) => (previous > 0 ? previous - 1 : searchSuggestions.length - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const pick = selectedSuggestionIndex >= 0 ? searchSuggestions[selectedSuggestionIndex] : searchSuggestions[0];
      if (pick && searchValue.trim()) selectSuggestion(pick);
    } else if (event.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  // Chip/badge colours derive from the collection palette (inline styles because
  // the class names would be dynamic, which Tailwind can't see)
  const collectionChipStyle = (collection: string) => {
    const rgb = tailwind500RgbByColor[getColorForCollection(collection)];
    return {
      border: `1px solid rgb(${rgb} / 0.25)`,
      backgroundColor: `rgb(${rgb} / 0.1)`,
      color: `rgb(${rgb})`,
    };
  };

  // Close the search dropdown when clicking anywhere else
  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as globalThis.Node)) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  // Rasterise the collection icons (rendered hidden by React below) into sprite
  // canvases once on mount. Loads are async — each arrival triggers a redraw.
  useEffect(() => {
    const source = iconSourceRef.current;
    if (!source) return;
    const serializer = new XMLSerializer();
    source.querySelectorAll('span[data-collection]').forEach((span) => {
      const collection = span.getAttribute('data-collection')!;
      const svg = span.querySelector('svg');
      if (!svg || iconSpritesRef.current.has(collection)) return;
      const image = new Image();
      image.onload = () => {
        const sprite = document.createElement('canvas');
        sprite.width = ICON_SPRITE_SIZE;
        sprite.height = ICON_SPRITE_SIZE;
        sprite.getContext('2d')?.drawImage(image, 0, 0, ICON_SPRITE_SIZE, ICON_SPRITE_SIZE);
        iconSpritesRef.current.set(collection, sprite);
        drawRef.current();
      };
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serializer.serializeToString(svg))}`;
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const tooltip = tooltipRef.current;
    const context = canvas?.getContext('2d');
    if (!container || !canvas || !tooltip || !context) return;

    const hubs = new Set(lens.hubCollections ?? []);
    // In focus mode only the focused node is the anchor — everything else renders
    // normal-sized, whatever the lens's usual hubs are
    const isHub = (d: SimNode) => (focusKey ? d.key === focusKey : hubs.has(d.collection));

    const visibleNodes: SimNode[] = viewNodes
      .filter((n) => !hiddenCollections.has(n.collection))
      .map((n) => ({ ...n, degree: 0, ...positionsRef.current.get(n.key) }));
    const nodeByKey = new Map(visibleNodes.map((n) => [n.key, n]));
    const visibleLinks: SimLink[] = viewLinks
      .filter((l) => nodeByKey.has(l.source) && nodeByKey.has(l.target))
      .map((l) => ({ ...l }));

    for (const link of visibleLinks) {
      nodeByKey.get(link.source as string)!.degree += 1;
      nodeByKey.get(link.target as string)!.degree += 1;
    }

    // Adjacency for hover highlighting (ego network of the hovered node)
    const neighbours = new Map<string, Set<string>>();
    for (const link of visibleLinks) {
      const s = link.source as string;
      const t = link.target as string;
      if (!neighbours.has(s)) neighbours.set(s, new Set());
      if (!neighbours.has(t)) neighbours.set(t, new Set());
      neighbours.get(s)!.add(t);
      neighbours.get(t)!.add(s);
    }

    // Batch draw calls by colour so the canvas state changes once per collection
    const nodesByCollection = new Map<string, SimNode[]>();
    for (const node of visibleNodes) {
      if (!nodesByCollection.has(node.collection)) nodesByCollection.set(node.collection, []);
      nodesByCollection.get(node.collection)!.push(node);
    }

    // Label priority: hubs first, then by connectedness
    const labelOrder = [...visibleNodes].sort((a, b) => (isHub(b) ? 1e6 : 0) + b.degree - ((isHub(a) ? 1e6 : 0) + a.degree));
    const labelWidthCache = new Map<string, number>();

    // In focus mode the whole neighbourhood becomes one bubble in the focused
    // node's colour (a domain wraps its view in yellow, a service in pink, …);
    // otherwise assignments come from the lens's clusterBy BFS.
    const effectiveAssignments =
      focusKey && nodeByKey.has(focusKey) ? new Map(visibleNodes.map((node) => [node.key, focusKey])) : clusterAssignments;

    // Cluster groups for the hull backdrops (members keep a reference into the sim)
    const clusterGroups = new Map<string, SimNode[]>();
    for (const node of visibleNodes) {
      const cluster = effectiveAssignments.get(node.key);
      if (!cluster || !nodeByKey.has(cluster)) continue;
      if (!clusterGroups.has(cluster)) clusterGroups.set(cluster, []);
      clusterGroups.get(cluster)!.push(node);
    }

    let width = container.clientWidth;
    let height = container.clientHeight;
    const devicePixelRatio = window.devicePixelRatio || 1;
    const isLargeGraph = visibleNodes.length > LARGE_GRAPH_NODE_COUNT;

    // Canvas colours can't use CSS variables directly — resolve them, and
    // re-resolve when the theme flips.
    let theme = { bg: '', text: '', muted: '' };
    const resolveTheme = () => {
      theme = {
        bg: readThemeColor(container, '--ec-page-bg', 'rgb(255 255 255)'),
        text: readThemeColor(container, '--ec-page-text', 'rgb(17 24 39)'),
        muted: readThemeColor(container, '--ec-page-text-muted', 'rgb(107 114 128)'),
      };
    };
    resolveTheme();

    const sizeCanvas = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = Math.round(width * devicePixelRatio);
      canvas.height = Math.round(height * devicePixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };
    sizeCanvas();

    let transform: ZoomTransform = zoomIdentity;
    let hovered: SimNode | null = null;
    // The camera auto-fits the settling layout until the user zooms, pans or drags
    let userAdjustedView = false;

    const drawNodeBatch = (batch: SimNode[], minX: number, minY: number, maxX: number, maxY: number) => {
      context.beginPath();
      for (const node of batch) {
        const r = nodeRadius(node.degree, isHub(node));
        if (node.x! < minX - r || node.x! > maxX + r || node.y! < minY - r || node.y! > maxY + r) continue;
        context.moveTo(node.x! + r, node.y!);
        context.arc(node.x!, node.y!, r, 0, 2 * Math.PI);
      }
      context.fill();
      context.stroke();
    };

    // Arrowheads sit at the target node's rim, showing edge direction
    // (e.g. service → event = publishes, event → service = consumed)
    const drawArrowheads = (links: SimLink[], minX: number, minY: number, maxX: number, maxY: number) => {
      const size = 5;
      context.beginPath();
      for (const link of links) {
        const source = link.source as SimNode;
        const target = link.target as SimNode;
        if (Math.max(source.x!, target.x!) < minX || Math.min(source.x!, target.x!) > maxX) continue;
        if (Math.max(source.y!, target.y!) < minY || Math.min(source.y!, target.y!) > maxY) continue;
        const angle = Math.atan2(target.y! - source.y!, target.x! - source.x!);
        const r = nodeRadius(target.degree, isHub(target));
        const tipX = target.x! - Math.cos(angle) * (r + 1);
        const tipY = target.y! - Math.sin(angle) * (r + 1);
        context.moveTo(tipX, tipY);
        context.lineTo(tipX - size * Math.cos(angle - 0.45), tipY - size * Math.sin(angle - 0.45));
        context.lineTo(tipX - size * Math.cos(angle + 0.45), tipY - size * Math.sin(angle + 0.45));
        context.closePath();
      }
      context.fill();
    };

    const draw = () => {
      context.save();
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.translate(transform.x, transform.y);
      context.scale(transform.k, transform.k);

      // Visible world-space bounds, for culling offscreen work
      const [minX, minY] = transform.invert([0, 0]);
      const [maxX, maxY] = transform.invert([width, height]);

      const ego = hovered ? (neighbours.get(hovered.key) ?? new Set<string>()) : null;
      const egoLinks = hovered
        ? visibleLinks.filter((l) => (l.source as SimNode).key === hovered!.key || (l.target as SimNode).key === hovered!.key)
        : [];

      // Cluster hulls: a soft tinted backdrop per domain/system/team neighbourhood.
      // The thick round-joined stroke pads the hull outward from the member nodes.
      const drawHull = (members: SimNode[], colour: string, padding: number) => {
        if (members.length < 2) return;
        context.globalAlpha = 0.05;
        context.lineJoin = 'round';
        context.lineCap = 'round';
        context.lineWidth = padding * 2;
        context.fillStyle = colour;
        context.strokeStyle = colour;
        const hull = convexHull(members.map((m) => [m.x!, m.y!] as [number, number]));
        context.beginPath();
        context.moveTo(hull[0][0], hull[0][1]);
        for (let i = 1; i < hull.length; i++) context.lineTo(hull[i][0], hull[i][1]);
        context.closePath();
        context.stroke();
        context.fill();
      };

      if (clusterGroups.size > 0) {
        // In focus mode, wrap the bubble in one outer ring per containment
        // ancestor (a system inside a domain gets the domain's yellow ring) —
        // outermost ancestor first, so the rings nest like the hierarchy does
        const focusMembers = focusKey ? clusterGroups.get(focusKey) : undefined;
        if (focusMembers) {
          for (let i = focusAncestors.length - 1; i >= 0; i--) {
            drawHull(focusMembers, nodeColor(focusAncestors[i].collection), HULL_PADDING + (i + 1) * ANCESTOR_RING_WIDTH);
          }
          // Name each wrapping ring, sitting inside its band at the top of the
          // bubble, with a small icon badge so the wrapper's type reads at a glance
          if (focusMembers.length >= 2 && focusAncestors.length > 0) {
            let topY = Infinity;
            let sumX = 0;
            for (const member of focusMembers) {
              if (member.y! < topY) topY = member.y!;
              sumX += member.x!;
            }
            const centreX = sumX / focusMembers.length;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.font = `600 ${11 / transform.k}px sans-serif`;
            context.lineWidth = 3 / transform.k;
            context.strokeStyle = theme.bg;
            const badgeRadius = 9 / transform.k;
            const badgeGap = 5 / transform.k;
            for (let i = 0; i < focusAncestors.length; i++) {
              const ancestor = focusAncestors[i];
              const colour = nodeColor(ancestor.collection);
              const labelY = topY - (HULL_PADDING + i * ANCESTOR_RING_WIDTH + ANCESTOR_RING_WIDTH / 2);
              const textWidth = context.measureText(ancestor.label).width;
              const startX = centreX - (badgeRadius * 2 + badgeGap + textWidth) / 2;
              const badgeX = startX + badgeRadius;
              context.globalAlpha = 1;
              context.fillStyle = colour;
              context.beginPath();
              context.arc(badgeX, labelY, badgeRadius, 0, 2 * Math.PI);
              context.fill();
              const sprite = iconSpritesRef.current.get(ancestor.collection);
              if (sprite) {
                const iconSize = badgeRadius * 1.3;
                context.drawImage(sprite, badgeX - iconSize / 2, labelY - iconSize / 2, iconSize, iconSize);
              }
              const textX = startX + badgeRadius * 2 + badgeGap + textWidth / 2;
              context.globalAlpha = 0.9;
              context.fillStyle = colour;
              context.strokeText(ancestor.label, textX, labelY);
              context.fillText(ancestor.label, textX, labelY);
            }
          }
        }
        for (const [clusterKey, members] of clusterGroups) {
          drawHull(members, nodeColor(nodeByKey.get(clusterKey)!.collection), HULL_PADDING);
        }
      }

      // Links: one batched path for the base layer…
      context.lineWidth = 1;
      context.strokeStyle = theme.muted;
      context.globalAlpha = hovered ? 0.06 : 0.2;
      context.beginPath();
      for (const link of visibleLinks) {
        const source = link.source as SimNode;
        const target = link.target as SimNode;
        if (Math.max(source.x!, target.x!) < minX || Math.min(source.x!, target.x!) > maxX) continue;
        if (Math.max(source.y!, target.y!) < minY || Math.min(source.y!, target.y!) > maxY) continue;
        context.moveTo(source.x!, source.y!);
        context.lineTo(target.x!, target.y!);
      }
      context.stroke();

      // Arrowheads are sub-pixel noise when zoomed far out — skip them there
      if (transform.k >= 0.4) {
        context.fillStyle = theme.muted;
        drawArrowheads(visibleLinks, minX, minY, maxX, maxY);
      }

      // …and a highlight pass for the hovered node's edges
      if (hovered) {
        context.strokeStyle = nodeColor(hovered.collection);
        context.globalAlpha = 0.9;
        context.beginPath();
        for (const link of egoLinks) {
          context.moveTo((link.source as SimNode).x!, (link.source as SimNode).y!);
          context.lineTo((link.target as SimNode).x!, (link.target as SimNode).y!);
        }
        context.stroke();
        context.fillStyle = nodeColor(hovered.collection);
        drawArrowheads(egoLinks, minX, minY, maxX, maxY);

        // Relationship labels at the midpoint of each highlighted edge, so the
        // semantics (publishes / subscribed by / contains…) read on hover.
        // Skipped on mega-hubs where the labels would just pile up.
        if (egoLinks.length <= 40) {
          // Divide by the zoom scale so the labels stay a constant 9px on
          // screen — same treatment as the screen-space node labels
          context.font = `${9 / transform.k}px sans-serif`;
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.lineWidth = 3 / transform.k;
          context.strokeStyle = theme.bg;
          context.fillStyle = theme.text;
          for (const link of egoLinks) {
            const source = link.source as SimNode;
            const target = link.target as SimNode;
            const midX = (source.x! + target.x!) / 2;
            const midY = (source.y! + target.y!) / 2;
            context.strokeText(link.label, midX, midY);
            context.fillText(link.label, midX, midY);
          }
        }
      }

      // Nodes, batched per collection colour
      context.lineWidth = 1.5;
      context.strokeStyle = theme.bg;
      for (const [collection, batch] of nodesByCollection) {
        context.fillStyle = nodeColor(collection);
        if (!ego) {
          context.globalAlpha = 0.9;
          drawNodeBatch(batch, minX, minY, maxX, maxY);
        } else {
          const dimmed = batch.filter((n) => n.key !== hovered!.key && !ego.has(n.key));
          const focused = batch.filter((n) => n.key === hovered!.key || ego.has(n.key));
          context.globalAlpha = 0.12;
          drawNodeBatch(dimmed, minX, minY, maxX, maxY);
          context.globalAlpha = 1;
          drawNodeBatch(focused, minX, minY, maxX, maxY);
        }
      }

      // Icons: cached-bitmap blits, only once a node is big enough on screen to read
      for (const node of visibleNodes) {
        const r = nodeRadius(node.degree, isHub(node));
        if (r * transform.k < ICON_MIN_SCREEN_RADIUS) continue;
        const sprite = iconSpritesRef.current.get(node.collection);
        if (!sprite) continue;
        if (node.x! < minX - r || node.x! > maxX + r || node.y! < minY - r || node.y! > maxY + r) continue;
        context.globalAlpha = ego ? (node.key === hovered!.key || ego.has(node.key) ? 1 : 0.12) : 0.9;
        const size = r * 1.1;
        context.drawImage(sprite, node.x! - size / 2, node.y! - size / 2, size, size);
      }

      context.restore();

      // Labels: collision-aware placement in screen space at fixed font size.
      // Placed in priority order — a label that would overlap an already-placed
      // one is skipped, so dense areas show only their most connected resources.
      context.save();
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      context.textAlign = 'center';
      context.textBaseline = 'top';
      const placed: [number, number, number, number][] = [];
      const overlapsPlaced = (x: number, y: number, w: number, h: number) =>
        placed.some(([px, py, pw, ph]) => x < px + pw && px < x + w && y < py + ph && py < y + h);

      const tryLabel = (node: SimNode, force = false) => {
        if (placed.length >= MAX_LABELS_PER_FRAME) return;
        const hub = isHub(node);
        const focused = hovered && (node.key === hovered.key || ego?.has(node.key));
        if (hovered && !focused && !hub && !force) return;
        const r = nodeRadius(node.degree, hub);
        const screenR = r * transform.k;
        if (!hub && !focused && screenR < NON_HUB_LABEL_MIN_SCREEN_RADIUS) return;
        const sx = transform.applyX(node.x!);
        const sy = transform.applyY(node.y!);
        if (sx < -100 || sx > width + 100 || sy < -30 || sy > height + 30) return;
        const font = hub ? '600 12px sans-serif' : '10px sans-serif';
        const cacheKey = `${font}|${node.label}`;
        let textWidth = labelWidthCache.get(cacheKey);
        if (textWidth === undefined) {
          context.font = font;
          textWidth = context.measureText(node.label).width;
          labelWidthCache.set(cacheKey, textWidth);
        }
        const boxX = sx - textWidth / 2 - 2;
        const boxY = sy + screenR + 2;
        const boxW = textWidth + 4;
        const boxH = hub ? 16 : 14;
        if (overlapsPlaced(boxX, boxY, boxW, boxH)) return;
        placed.push([boxX, boxY, boxW, boxH]);
        context.font = font;
        context.lineWidth = 3;
        context.strokeStyle = theme.bg;
        context.fillStyle = hub ? theme.text : theme.muted;
        context.globalAlpha = 1;
        context.strokeText(node.label, sx, sy + screenR + 4);
        context.fillText(node.label, sx, sy + screenR + 4);
      };

      if (hovered) {
        tryLabel(hovered, true);
        for (const node of labelOrder) {
          if (ego?.has(node.key)) tryLabel(node, true);
        }
      }
      for (const node of labelOrder) tryLabel(node);
      context.restore();
    };
    drawRef.current = draw;

    const simulation = forceSimulation(visibleNodes)
      .force(
        'link',
        forceLink<SimNode, any>(visibleLinks)
          .id((d) => d.key)
          .distance(120)
          .strength(0.3)
      )
      // distanceMax bounds the many-body cost on large graphs with little visual impact
      .force('charge', forceManyBody().strength(-400).distanceMax(1000))
      .force('center', forceCenter(width / 2, height / 2))
      .force('x', forceX(width / 2).strength(visibleNodes.length < 150 ? 0.08 : 0.03))
      .force('y', forceY(height / 2).strength(visibleNodes.length < 150 ? 0.08 : 0.03))
      // Settle faster on large graphs — fewer total ticks, each tick is O(n log n)
      .alphaDecay(isLargeGraph ? 0.06 : 0.0228)
      // While settling, the camera follows the layout (auto-fit); once the user
      // has zoomed/panned/dragged, ticks just redraw under their chosen view
      .on('tick', () => {
        if (userAdjustedView) draw();
        else fitToView();
      });

    // Pull cluster members toward their cluster centre so domains/systems/teams
    // form visible neighbourhoods instead of one tangle
    if (clusterGroups.size > 0) {
      simulation.force('cluster', (alpha: number) => {
        for (const node of visibleNodes) {
          const clusterKey = effectiveAssignments.get(node.key);
          if (!clusterKey || clusterKey === node.key) continue;
          const centre = nodeByKey.get(clusterKey);
          if (!centre) continue;
          node.vx! += (centre.x! - node.x!) * alpha * CLUSTER_FORCE_STRENGTH;
          node.vy! += (centre.y! - node.y!) * alpha * CLUSTER_FORCE_STRENGTH;
        }
      });
    }

    // Collision is the most expensive force and mostly cosmetic — skip it at scale
    if (!isLargeGraph) {
      simulation.force(
        'collide',
        forceCollide<SimNode>().radius((d) => nodeRadius(d.degree, isHub(d)) + 16)
      );
    }

    const findNode = (canvasX: number, canvasY: number): SimNode | null => {
      if (Number.isNaN(canvasX) || Number.isNaN(canvasY)) return null;
      const x = transform.invertX(canvasX);
      const y = transform.invertY(canvasY);
      const candidate = simulation.find(x, y, 50) as SimNode | undefined;
      if (!candidate) return null;
      const r = nodeRadius(candidate.degree, isHub(candidate));
      const distance = Math.hypot(candidate.x! - x, candidate.y! - y);
      return distance <= r + 4 ? candidate : null;
    };

    // Touch events carry their coordinates on touches[0], not the event itself
    const pointerPosition = (event: MouseEvent | TouchEvent | Touch): [number, number] => {
      const source = 'touches' in event ? event.touches[0] : event;
      if (!source) return [NaN, NaN];
      const rect = canvas.getBoundingClientRect();
      return [source.clientX - rect.left, source.clientY - rect.top];
    };

    const zoomBehaviour = zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.1, 4])
      // Let node drags win over panning: ignore presses that start on a node
      .filter((event) => {
        // Embedded graphs must not trap touch scrolling — a one-finger swipe over
        // the canvas scrolls the page; a two-finger gesture pans/zooms the graph
        if (event.type === 'touchstart' && !zoomOnScroll && event.touches.length < 2) return false;
        if (event.type === 'mousedown' || event.type === 'touchstart') {
          const [x, y] = pointerPosition(event);
          return !findNode(x, y);
        }
        // Embedded graphs must not hijack page scrolling — zooming needs ctrl/cmd there
        if (event.type === 'wheel' && !zoomOnScroll && !event.ctrlKey && !event.metaKey) return false;
        return !event.ctrlKey || event.type === 'wheel';
      })
      .on('zoom', (event) => {
        // sourceEvent is null for programmatic transforms (auto-fit) — only a
        // real user gesture takes the camera off auto-fit
        if (event.sourceEvent) userAdjustedView = true;
        transform = event.transform;
        draw();
      });

    const dragBehaviour = drag<HTMLCanvasElement, unknown>()
      // On embeds, touch node-drags would also swallow page swipes that happen to
      // start on a node — leave touch to the page there (tap-to-focus still works)
      .filter((event) => (zoomOnScroll || event.type !== 'touchstart') && !event.ctrlKey && !event.button)
      .subject((event) => {
        const [x, y] = pointerPosition(event.sourceEvent);
        const node = findNode(x, y);
        if (!node) return undefined as any;
        // d3-drag works in screen space; hand it screen coordinates for the node
        return { node, x: transform.applyX(node.x!), y: transform.applyY(node.y!) };
      })
      .clickDistance(4)
      .on('start', (event) => {
        userAdjustedView = true;
        if (!event.active) simulation.alphaTarget(0.3).restart();
        const node = event.subject.node as SimNode;
        node.fx = node.x;
        node.fy = node.y;
      })
      .on('drag', (event) => {
        const node = event.subject.node as SimNode;
        node.fx = transform.invertX(event.x);
        node.fy = transform.invertY(event.y);
      })
      .on('end', (event) => {
        if (!event.active) simulation.alphaTarget(0);
        const node = event.subject.node as SimNode;
        node.fx = null;
        node.fy = null;
      });

    const selection = select(canvas);
    selection.call(dragBehaviour).call(zoomBehaviour).call(zoomBehaviour.transform, zoomIdentity);
    // Double-click opens docs instead of zooming
    selection.on('dblclick.zoom', null);

    // Fit the whole visible graph into ~80% of the viewport. Runs every tick
    // during settle so the camera smoothly tracks the layout — clicking into a
    // focus therefore fills the screen with that neighbourhood.
    const fitToView = () => {
      if (visibleNodes.length === 0) return;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const node of visibleNodes) {
        const r = nodeRadius(node.degree, isHub(node)) + 30;
        if (node.x! - r < minX) minX = node.x! - r;
        if (node.x! + r > maxX) maxX = node.x! + r;
        if (node.y! - r < minY) minY = node.y! - r;
        if (node.y! + r > maxY) maxY = node.y! + r;
      }
      const scale = Math.min(
        MAX_FIT_SCALE,
        Math.max(0.1, FIT_VIEWPORT_FRACTION * Math.min(width / (maxX - minX), height / (maxY - minY)))
      );
      const fitted = zoomIdentity
        .translate(width / 2, height / 2)
        .scale(scale)
        .translate(-(minX + maxX) / 2, -(minY + maxY) / 2);
      selection.call(zoomBehaviour.transform, fitted);
    };

    const handleMouseMove = (event: MouseEvent) => {
      const [x, y] = pointerPosition(event);
      const node = findNode(x, y);
      if (node !== hovered) {
        hovered = node;
        canvas.style.cursor = node ? 'pointer' : 'default';
        if (node) {
          const connections = neighbours.get(node.key)?.size ?? 0;
          tooltip.innerHTML = `
            <div class="font-semibold">${escapeHtml(node.label)}</div>
            <div class="text-[rgb(var(--ec-page-text-muted))]">
              ${escapeHtml(COLLECTION_LABELS[node.collection] ?? node.collection)}${node.version ? ` · v${escapeHtml(node.version)}` : ''} · ${connections} connection${connections === 1 ? '' : 's'}
            </div>
            <div class="mt-1 text-[10px] text-[rgb(var(--ec-page-text-muted))]">Click to focus · double-click to open</div>`;
          tooltip.style.opacity = '1';
        } else {
          tooltip.style.opacity = '0';
        }
        draw();
      }
      if (node) {
        const rect = container.getBoundingClientRect();
        tooltip.style.left = `${event.clientX - rect.left + 12}px`;
        tooltip.style.top = `${event.clientY - rect.top + 12}px`;
      } else {
        // Wrapper rings are clickable (drill up) — signal it with the cursor
        canvas.style.cursor = findAncestorRing(x, y) ? 'pointer' : 'default';
      }
    };

    const handleMouseLeave = () => {
      if (!hovered) return;
      hovered = null;
      canvas.style.cursor = 'default';
      tooltip.style.opacity = '0';
      draw();
    };

    // Which ancestor ring (if any) a canvas point falls in — measured by the
    // point's distance outward from the focus bubble's hull
    const findAncestorRing = (canvasX: number, canvasY: number): string | null => {
      if (!focusKey || focusAncestors.length === 0) return null;
      const members = clusterGroups.get(focusKey);
      if (!members || members.length < 2) return null;
      const x = transform.invertX(canvasX);
      const y = transform.invertY(canvasY);
      const hull = convexHull(members.map((m) => [m.x!, m.y!] as [number, number]));
      const distance = distanceToHull(x, y, hull);
      if (distance <= HULL_PADDING) return null;
      const ring = Math.floor((distance - HULL_PADDING) / ANCESTOR_RING_WIDTH);
      return ring < focusAncestors.length ? focusAncestors[ring].key : null;
    };

    const handleClick = (event: MouseEvent) => {
      const [x, y] = pointerPosition(event);
      const node = findNode(x, y);
      // The graph is about to re-layout under the pointer — drop the tooltip
      // rather than leave it describing whatever was clicked
      hovered = null;
      tooltip.style.opacity = '0';
      canvas.style.cursor = 'default';
      if (node) {
        setFocusKey(node.key);
        return;
      }
      // Clicking a wrapper ring drills up to that ancestor; beyond the rings clears
      setFocusKey(findAncestorRing(x, y));
    };

    const handleDoubleClick = (event: MouseEvent) => {
      const [x, y] = pointerPosition(event);
      const node = findNode(x, y);
      if (node?.url) window.location.href = node.url;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('dblclick', handleDoubleClick);

    const resizeObserver = new ResizeObserver(() => {
      sizeCanvas();
      // Refit to the new container size unless the user has taken the camera —
      // the settled layout would otherwise stay clipped or under-sized
      if (userAdjustedView) draw();
      else fitToView();
    });
    resizeObserver.observe(container);

    // Redraw with fresh colours when the user flips light/dark mode
    const themeObserver = new MutationObserver(() => {
      resolveTheme();
      draw();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      for (const node of visibleNodes) {
        if (node.x !== undefined && node.y !== undefined) positionsRef.current.set(node.key, { x: node.x, y: node.y });
      }
      simulation.stop();
      // The tooltip outlives this effect — never leave it showing stale content
      tooltip.style.opacity = '0';
      canvas.style.cursor = 'default';
      selection.on('.zoom', null).on('.drag', null);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('dblclick', handleDoubleClick);
      resizeObserver.disconnect();
      themeObserver.disconnect();
    };
  }, [viewNodes, viewLinks, lens, hiddenCollections, clusterAssignments, focusKey, focusAncestors, zoomOnScroll]);

  const toggleCollection = (collection: string) => {
    setHiddenCollections((current) => {
      const next = new Set(current);
      if (next.has(collection)) next.delete(collection);
      else next.add(collection);
      return next;
    });
  };

  const focusedNode = focusKey ? graph.nodes.find((n) => n.key === focusKey) : undefined;

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      {/* Hidden icon sources: React renders them once, the sprite effect rasterises
          them for the canvas. Both lucide (color prop) and heroicons (currentColor
          via style) end up with white strokes. */}
      <div ref={iconSourceRef} className="hidden" aria-hidden="true">
        {Object.keys(COLLECTION_LABELS).map((collection) => {
          const Icon = getIconForCollection(collection);
          return (
            <span key={collection} data-collection={collection}>
              <Icon width={24} height={24} color="#ffffff" style={{ color: '#ffffff' }} strokeWidth={2} />
            </span>
          );
        })}
      </div>
      <canvas ref={canvasRef} role="img" aria-label="Catalog resource graph" />
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute z-10 rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] px-3 py-2 text-xs text-[rgb(var(--ec-page-text))] shadow-md transition-opacity duration-100"
        style={{ opacity: 0 }}
      />
      {/* Top-left chrome stacks in one column so the link and lens picker never overlap */}
      <div className="absolute left-3 top-3 z-10 flex flex-col items-start gap-2">
        {showLensPicker && (
          <div className="flex flex-col gap-2 rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] px-3 py-2 text-xs shadow-xs">
            <div className="flex items-center gap-2">
              <label htmlFor="catalog-graph-lens" className="font-semibold text-[rgb(var(--ec-page-text))]">
                Lens
              </label>
              <select
                id="catalog-graph-lens"
                value={lensKey}
                onChange={(event) => {
                  // A new lens is a fresh view — drop any focus and legend filters
                  setLensKey(event.target.value);
                  setFocusKey(null);
                  setFocusDepth(1);
                  setHiddenCollections(new Set());
                }}
                title={lens.description}
                className="rounded-sm border border-[rgb(var(--ec-input-border))] bg-[rgb(var(--ec-input-bg))] px-2 py-1 text-[rgb(var(--ec-input-text))]"
              >
                {Object.entries(LENSES).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            {lens.hubCollections && !focusedNode && (
              <label
                className="flex items-center gap-2 text-[rgb(var(--ec-page-text-muted))]"
                title="How many relationship hops to show around the anchor nodes"
              >
                Detail
                <input
                  type="range"
                  min={1}
                  max={MAX_LENS_DEPTH}
                  step={1}
                  value={lensDepth}
                  onChange={(event) => setLensDepth(Number(event.target.value))}
                  className="w-24 accent-[rgb(var(--ec-accent))]"
                />
                <span className="w-5 text-[rgb(var(--ec-page-text))]">{lensDepth >= MAX_LENS_DEPTH ? 'All' : lensDepth}</span>
              </label>
            )}
          </div>
        )}
        {openInGraphHref && (
          <a
            href={openInGraphHref}
            className="rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] px-3 py-2 text-xs text-[rgb(var(--ec-page-text))] shadow-xs hover:bg-[rgb(var(--ec-accent-subtle))]"
          >
            {openInGraphLabel ?? 'Open full screen'} →
          </a>
        )}
      </div>
      {(showSearch || focusedNode) && (
        // z-20: the search dropdown must paint over the Resources legend below it
        <div className="absolute right-3 top-3 z-20 flex flex-col gap-2 rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] px-3 py-2 text-xs shadow-xs">
          {showSearch && (
            <div ref={searchContainerRef} className="relative">
              <input
                type="text"
                placeholder="Search &amp; focus…"
                value={searchValue}
                onChange={(event) => {
                  setSearchValue(event.target.value);
                  setShowSuggestions(true);
                  setSelectedSuggestionIndex(-1);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleSearchKeyDown}
                className="w-56 rounded-sm border border-[rgb(var(--ec-input-border))] bg-[rgb(var(--ec-input-bg))] py-1 pl-2 pr-7 text-[rgb(var(--ec-input-text))] placeholder:text-[rgb(var(--ec-page-text-muted))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ec-accent))]"
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={() => setSearchValue('')}
                  aria-label="Clear search"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))]"
                >
                  ×
                </button>
              )}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] shadow-lg">
                  {searchSuggestions.map((node, index) => {
                    const Icon = getIconForCollection(node.collection);
                    const chipStyle = collectionChipStyle(node.collection);
                    const isSelected = index === selectedSuggestionIndex;
                    return (
                      <button
                        key={node.key}
                        type="button"
                        onClick={() => selectSuggestion(node)}
                        onMouseEnter={() => setSelectedSuggestionIndex(index)}
                        className={`flex w-full items-center gap-2 px-2 py-1.5 text-left ${isSelected ? 'bg-[rgb(var(--ec-accent-subtle))]' : ''}`}
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={chipStyle}>
                          <Icon width={13} height={13} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-[rgb(var(--ec-page-text))]">{node.label}</span>
                          {node.version && (
                            <span className="block truncate text-[10px] text-[rgb(var(--ec-page-text-muted))]">
                              v{node.version}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium" style={chipStyle}>
                          {COLLECTION_LABELS[node.collection] ?? node.collection}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {focusedNode && (
            <>
              <button
                type="button"
                onClick={() => setFocusKey(null)}
                className="flex items-center gap-1 self-start rounded-full border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-accent-subtle))] px-2 py-0.5 text-[rgb(var(--ec-page-text))] hover:opacity-80"
                title="Clear focus"
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: nodeColor(focusedNode.collection) }}
                />
                Focused: {focusedNode.label}
                <span aria-hidden="true">×</span>
              </button>
              <label className="flex items-center gap-2 text-[rgb(var(--ec-page-text-muted))]">
                Depth
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={1}
                  value={focusDepth}
                  onChange={(event) => setFocusDepth(Number(event.target.value))}
                  className="w-24 accent-[rgb(var(--ec-accent))]"
                />
                <span className="w-3 text-[rgb(var(--ec-page-text))]">{focusDepth}</span>
              </label>
            </>
          )}
        </div>
      )}
      {focusedNode && (
        <div className="absolute bottom-3 left-3 z-10 rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] p-3 text-xs shadow-xs">
          <div className="mb-2 font-semibold text-[rgb(var(--ec-page-text))]">You are here</div>
          <ul className="space-y-1">
            {[...focusAncestors].reverse().map((ancestor, index) => (
              <li key={ancestor.key} style={{ paddingLeft: index * 14 }}>
                <button
                  type="button"
                  onClick={() => setFocusKey(ancestor.key)}
                  title={`Focus ${ancestor.label}`}
                  className="flex w-full items-center gap-1.5 rounded-sm px-1 py-0.5 text-left hover:bg-[rgb(var(--ec-accent-subtle))]"
                >
                  {index > 0 && <span className="text-[rgb(var(--ec-page-text-muted))]">↳</span>}
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: nodeColor(ancestor.collection) }}
                  />
                  <span className="text-[rgb(var(--ec-page-text))]">{ancestor.label}</span>
                  <span className="text-[10px] text-[rgb(var(--ec-page-text-muted))]">
                    {COLLECTION_LABELS[ancestor.collection] ?? ancestor.collection}
                  </span>
                </button>
              </li>
            ))}
            <li style={{ paddingLeft: focusAncestors.length * 14 }}>
              <span className="flex items-center gap-1.5 px-1 py-0.5 font-semibold">
                {focusAncestors.length > 0 && <span className="text-[rgb(var(--ec-page-text-muted))]">↳</span>}
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: nodeColor(focusedNode.collection) }}
                />
                <span className="text-[rgb(var(--ec-page-text))]">{focusedNode.label}</span>
                <span className="text-[10px] font-normal text-[rgb(var(--ec-page-text-muted))]">
                  {COLLECTION_LABELS[focusedNode.collection] ?? focusedNode.collection}
                </span>
              </span>
            </li>
          </ul>
        </div>
      )}
      {showLegend && (
        <div className="absolute bottom-3 right-3 z-10 rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] p-3 text-xs shadow-xs">
          <div className="mb-2 font-semibold text-[rgb(var(--ec-page-text))]">Resources</div>
          <ul className="space-y-1">
            {collectionsInGraph.map(({ collection, count }) => {
              const hidden = hiddenCollections.has(collection);
              return (
                <li key={collection}>
                  <button
                    type="button"
                    onClick={() => toggleCollection(collection)}
                    className={`flex w-full items-center gap-2 rounded-sm px-1 py-0.5 text-left hover:bg-[rgb(var(--ec-accent-subtle))] ${hidden ? 'opacity-40' : ''}`}
                  >
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: nodeColor(collection) }} />
                    <span className="text-[rgb(var(--ec-page-text))]">
                      {COLLECTION_LABELS[collection] ?? collection} ({count})
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CatalogForceGraph;
