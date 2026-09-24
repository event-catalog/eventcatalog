import {
  useCallback,
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import { type Edge, type Node, useReactFlow } from "@xyflow/react";
import {
  createEdge,
  getEdgeLabelForMessageAsSource,
  getEdgeLabelForServiceAsTarget,
} from "../utils/utils/utils";
import { layoutWithElk } from "../utils/elk-layout";
import {
  hideMessageNodes,
  hideNodes,
  isMessageNode,
} from "../utils/hide-messages";
import {
  animateLayout,
  getSystemMorphs,
  getLayoutBounds,
  LAYOUT_ANIMATION_DURATION,
  type GraphTransition,
} from "../utils/animate-layout";

// Keeps `?level=` in the URL so shared links open at the same level of detail
export const setLevelInUrl = (level: number) => {
  const url = new URL(window.location.href);
  url.searchParams.set("level", String(level));
  window.history.replaceState(window.history.state, "", url);
};

interface NodeVisibilityProps {
  nodes: Node[];
  edges: Edge[];
  setNodes: (nodes: Node[]) => void;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  hasChannels: boolean;
  hasMessages: boolean;
  /** The graph switched away from to show this one, to animate from */
  transitionFrom?: GraphTransition;
  /** React Flow's node origin, to line up nodes when animating */
  nodeOrigin?: [number, number];
  /** The graph laid out with messages and channels hidden, if precomputed */
  hiddenMessagesGraph?: { nodes: Node[]; edges: Edge[] };
  /** Prepares the edges of each graph shown (e.g. animating messages) */
  prepareEdges?: (edges: Edge[]) => Edge[];
  /** Whether a node is one a legend entry lists, to hide it from the legend */
  matchesLegendKey?: (node: Node, key: string) => boolean;
  /** Legend entries hidden to start with (e.g. kept when switching graphs) */
  initialHiddenLegendKeys?: string[];
  /** Called when legend entries are hidden or shown */
  onHiddenLegendKeysChange?: (keys: string[]) => void;
  /**
   * The kind of diagram (e.g. "services"), so the level is remembered for each
   * kind rather than one level for every diagram
   */
  preferenceScope?: string;
}

const matchesType = (node: Node, key: string) => node.type === key;

const hideChannelNodes = (nodes: Node[], edges: Edge[]) => {
  const channelIds = new Set(
    nodes.filter((node) => node.type === "channels").map((node) => node.id),
  );

  // By id, keeping the first edge with each id
  const newEdges = new Map<string, Edge>();
  const add = (edge: Edge) => {
    if (!newEdges.has(edge.id)) newEdges.set(edge.id, edge);
  };
  for (const edge of edges) {
    const { source, target, data } = edge;
    if (!channelIds.has(source) && !channelIds.has(target)) {
      add(edge);
      continue;
    }

    const rootSourceAndTarget = data?.rootSourceAndTarget as {
      source: { id: string; collection: string };
      target: { id: string; collection: string };
    };
    if (!rootSourceAndTarget) {
      add(edge);
      continue;
    }

    // is target a service-like resource?
    const targetIsService =
      rootSourceAndTarget?.target?.collection === "services" ||
      rootSourceAndTarget?.target?.collection === "agents";
    const edgeLabel = targetIsService
      ? getEdgeLabelForMessageAsSource(rootSourceAndTarget.source as any)
      : getEdgeLabelForServiceAsTarget(rootSourceAndTarget.target as any);

    add(
      createEdge({
        id: `${rootSourceAndTarget.source.id}-${rootSourceAndTarget.target.id}`,
        source: rootSourceAndTarget.source.id,
        target: rootSourceAndTarget.target.id,
        label: edgeLabel,
        ...(data?.crossDomain ? { data: { crossDomain: true } } : {}),
      }),
    );
  }

  return {
    nodes: nodes.filter((node) => !channelIds.has(node.id)),
    edges: Array.from(newEdges.values()),
  };
};

export const useNodeVisibility = ({
  nodes,
  edges,
  setNodes,
  setEdges,
  hasChannels,
  hasMessages,
  transitionFrom,
  nodeOrigin,
  hiddenMessagesGraph,
  prepareEdges = (edges) => edges,
  matchesLegendKey = matchesType,
  initialHiddenLegendKeys = [],
  onHiddenLegendKeysChange,
  preferenceScope,
}: NodeVisibilityProps) => {
  const hideMessagesKey = `EventCatalog:hideMessages${preferenceScope ? `:${preferenceScope}` : ""}`;
  const hideChannelsKey = `EventCatalog:hideChannels${preferenceScope ? `:${preferenceScope}` : ""}`;
  // Start from the URL (`?level=`), falling back to the saved preference, so
  // the first render is already at the right level. Level 1 is an overview
  // graph shown instead of this one, so without one this graph opens at level 2.
  const [urlLevel] = useState(() => {
    const level = Number(
      new URLSearchParams(window.location.search).get("level"),
    );
    if (level === 1 || level === 2) return 2;
    return level === 3 ? 3 : undefined;
  });
  const [hideChannels, setHideChannels] = useState(
    () => !urlLevel && localStorage.getItem(hideChannelsKey) === "true",
  );
  const [hideMessages, setHideMessages] = useState(() =>
    urlLevel
      ? urlLevel === 2
      : localStorage.getItem(hideMessagesKey) === "true",
  );
  // The full graph, to restore when showing everything again
  const fullGraph = useRef({ nodes, edges });
  const { fitView, fitBounds } = useReactFlow();
  // Changes the user makes animate; restoring saved settings on load doesn't
  const animateNextChange = useRef(false);
  const isAnimating = useRef(false);
  const cancelAnimation = useRef<(() => void) | undefined>(undefined);

  // Only hide things that actually exist in the graph.
  // Channels carry messages, so hiding messages hides channels too.
  const messagesHidden = hideMessages && hasMessages;
  const channelsHidden = hasChannels && (hideChannels || messagesHidden);

  // Legend entries whose nodes are hidden (clicking an entry hides or shows them)
  const [hiddenLegendKeys, setHiddenLegendKeys] = useState(
    initialHiddenLegendKeys,
  );
  const onHiddenLegendKeysChangeRef = useRef(onHiddenLegendKeysChange);
  onHiddenLegendKeysChangeRef.current = onHiddenLegendKeysChange;
  const toggleLegendKey = useCallback(
    (key: string) => {
      animateNextChange.current = true;
      const keys = hiddenLegendKeys.includes(key)
        ? hiddenLegendKeys.filter((hiddenKey) => hiddenKey !== key)
        : [...hiddenLegendKeys, key];
      setHiddenLegendKeys(keys);
      onHiddenLegendKeysChangeRef.current?.(keys);
    },
    [hiddenLegendKeys],
  );
  const matchesLegendKeyRef = useRef(matchesLegendKey);
  matchesLegendKeyRef.current = matchesLegendKey;
  const isHiddenByLegend = (node: Node) =>
    hiddenLegendKeys.some((key) => matchesLegendKeyRef.current(node, key));
  // Only when this graph has nodes to hide (entries can be hidden on another)
  const legendHidden = fullGraph.current.nodes.some(isHiddenByLegend);

  // Highlighting cross-domain communication picks out the edges crossing
  // domains on the graph shown (it doesn't change what's shown). Kept between visits.
  const [highlightCrossDomain, setHighlightCrossDomain] = useState(
    () => localStorage.getItem("EventCatalog:highlightCrossDomain") === "true",
  );
  const toggleHighlightCrossDomain = useCallback(() => {
    const highlight = !highlightCrossDomain;
    setHighlightCrossDomain(highlight);
    localStorage.setItem(
      "EventCatalog:highlightCrossDomain",
      JSON.stringify(highlight),
    );
  }, [highlightCrossDomain]);
  // Keep a snapshot of the full graph so it can be restored when toggling back.
  // Only runs on graph changes: a graph that still contains hidden node types
  // was set from outside this hook (e.g. message group expansion).
  useEffect(() => {
    // Mid-animation graphs are in between layouts, never a snapshot
    if (isAnimating.current) return;
    const containsHiddenNodes = nodes.some(
      (node) =>
        (channelsHidden && node.type === "channels") ||
        (messagesHidden && isMessageNode(node)) ||
        (legendHidden && isHiddenByLegend(node)),
    );
    if (
      (!channelsHidden && !messagesHidden && !legendHidden) ||
      containsHiddenNodes
    ) {
      fullGraph.current = { nodes, edges };
    }
  }, [nodes, edges]);

  const toggleChannelsVisibility = useCallback(() => {
    animateNextChange.current = true;
    const hide = !hideChannels;
    setHideChannels(hide);
    localStorage.setItem(hideChannelsKey, JSON.stringify(hide));
  }, [hideChannels]);

  const toggleMessagesVisibility = useCallback(() => {
    animateNextChange.current = true;
    const hide = !hideMessages;
    setHideMessages(hide);
    localStorage.setItem(hideMessagesKey, JSON.stringify(hide));
    setLevelInUrl(hide ? 2 : 3);
  }, [hideMessages]);

  // Level 2: services and data stores. Level 3: add messages and channels.
  const setDetailLevel = useCallback((level: 2 | 3) => {
    animateNextChange.current = true;
    const hide = level === 2;
    setHideMessages(hide);
    localStorage.setItem(hideMessagesKey, JSON.stringify(hide));
    if (!hide) {
      setHideChannels(false);
      localStorage.setItem(hideChannelsKey, "false");
    }
    setLevelInUrl(level);
  }, []);

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;
  // The latest, as layouts can finish after it changes
  const prepareEdgesRef = useRef(prepareEdges);
  prepareEdgesRef.current = prepareEdges;
  // Relayouts are async (ELK), so only the latest one is applied
  const latestRun = useRef(0);
  // While the first layout of a graph opening at a hidden level is worked out,
  // the graph stays out of sight rather than showing everything first
  const [isLayingOut, setIsLayingOut] = useState(false);

  // A layout effect, so the graph is at the right level before it's painted
  // (when its layout is already known)
  const isFirstRun = useRef(true);
  useLayoutEffect(() => {
    const firstRun = isFirstRun.current;
    isFirstRun.current = false;
    // Switched to this graph from another (e.g. its overview): animate from it
    const from = firstRun ? transitionFrom : undefined;
    // Otherwise the graph starts with everything shown
    if (
      firstRun &&
      !from &&
      !channelsHidden &&
      !messagesHidden &&
      !legendHidden
    )
      return;

    const run = ++latestRun.current;
    const animate = !!from || animateNextChange.current;
    animateNextChange.current = false;
    cancelAnimation.current?.();

    const apply = (
      { nodes: toNodes, edges: toEdges }: { nodes: Node[]; edges: Edge[] },
      laidOutLater = false,
    ) => {
      if (run !== latestRun.current) return;
      const target = {
        nodes: toNodes,
        edges: prepareEdgesRef.current(toEdges),
      };

      if (!animate) {
        setNodes(target.nodes);
        setEdges(target.edges);
        // React Flow fits the view on first render itself. Otherwise called
        // straight after setNodes so React Flow queues the fit until the new
        // nodes are measured (deferring it would fit the previous graph)
        if (!firstRun || laidOutLater)
          fitView({ maxZoom: 1, duration: 800, padding: 0.2 });
        return;
      }

      // Move from the current layout to the new one, fitting the view to where
      // the graph ends up while it moves
      const fromNodes = from?.nodes ?? nodesRef.current;
      isAnimating.current = true;
      const bounds = getLayoutBounds(target.nodes, fromNodes);
      if (bounds) {
        fitBounds(bounds, {
          padding: 0.2,
          duration: LAYOUT_ANIMATION_DURATION,
        });
      }
      cancelAnimation.current = animateLayout({
        fromNodes,
        fromEdges: from?.edges ?? edgesRef.current,
        toNodes: target.nodes,
        toEdges: target.edges,
        setNodes,
        setEdges,
        // When switching graphs, systems expand into their group (or back), e.g.
        // a system in its context diagram
        morphs: from ? getSystemMorphs(from.nodes, target.nodes) : [],
        nodeOrigin,
        onDone: () => {
          isAnimating.current = false;
          // Fit to the final graph now every node has its real size. Only its
          // nodes: React Flow can still have the nodes that faded out
          fitView({
            maxZoom: 1,
            duration: 400,
            padding: 0.2,
            nodes: target.nodes,
          });
        },
      });
    };

    // Graphs already laid out
    if (!legendHidden) {
      if (messagesHidden && hiddenMessagesGraph)
        return apply(hiddenMessagesGraph);
      if (!channelsHidden && !messagesHidden) return apply(fullGraph.current);
    }

    // Lay the graph out again without the hidden nodes: the level's, then
    // the legend's
    const { nodes: fullNodes, edges: fullEdges } = fullGraph.current;
    const level = messagesHidden
      ? (hiddenMessagesGraph ?? hideMessageNodes(fullNodes, fullEdges))
      : channelsHidden
        ? hideChannelNodes(fullNodes, fullEdges)
        : fullGraph.current;
    const graph = legendHidden
      ? hideNodes(level.nodes, level.edges, isHiddenByLegend)
      : level;
    if (firstRun) setIsLayingOut(true);
    layoutWithElk(graph).then((target) => {
      apply(target, true);
      if (firstRun) setIsLayingOut(false);
    });
  }, [channelsHidden, messagesHidden, hiddenLegendKeys]);

  return {
    hideChannels,
    toggleChannelsVisibility,
    hideMessages,
    toggleMessagesVisibility,
    setDetailLevel,
    hiddenLegendKeys,
    toggleLegendKey,
    highlightCrossDomain,
    toggleHighlightCrossDomain,
    isLayingOut,
  };
};
