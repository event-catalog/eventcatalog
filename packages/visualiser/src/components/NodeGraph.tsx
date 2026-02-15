import { useEffect, useMemo, useState, useCallback, useRef, memo } from "react";
import { createPortal } from "react-dom";
import {
  ReactFlow,
  Background,
  ConnectionLineType,
  Controls,
  Panel,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  type Edge,
  type Node,
  type NodeChange,
  useReactFlow,
  getNodesBounds,
  getViewportForBounds,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ExternalLink,
  HistoryIcon,
  CheckIcon,
  ClipboardIcon,
  MoreVertical,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { toPng } from "html-to-image";
// Nodes and edges
// Studio-2 nodes (named exports from directories)
import { Service as ServiceNode } from "../nodes/service";
import { Event as EventNode } from "../nodes/event";
import { Query as QueryNode } from "../nodes/query";
import { Command as CommandNode } from "../nodes/command";
import { Channel as ChannelNode } from "../nodes/channel";
import { Data as DataNode } from "../nodes/data";
import { View as ViewNode } from "../nodes/view";
import { Actor as ActorNode } from "../nodes/actor";
import { ExternalSystem as ExternalSystemNode } from "../nodes/external-system";
import { Note as NoteNode } from "../nodes/note";
// Core nodes (default exports from flat files)
import FlowNode from "../nodes/Flow";
import EntityNode from "../nodes/Entity";
import UserNode from "../nodes/User";
import StepNode from "../nodes/Step";
import DomainNode from "../nodes/Domain";
import GroupNode from "../nodes/GroupNode";
import CustomNode from "../nodes/Custom";
import ExternalSystemNode2 from "../nodes/ExternalSystem2";
import DataProductNode from "../nodes/DataProduct";
// Edges
import AnimatedMessageEdge from "../edges/AnimatedMessageEdge";
import MultilineEdgeLabel from "../edges/MultilineEdgeLabel";
import FlowEdge from "../edges/FlowEdge";
import VisualiserSearch, { type VisualiserSearchRef } from "./VisualiserSearch";
import StepWalkthrough from "./StepWalkthrough";
import StudioModal from "./StudioModal";
import FocusModeModal from "./FocusModeModal";
import MermaidView from "./MermaidView";
import VisualizerDropdownContent from "./VisualizerDropdownContent";
import NodeContextMenu from "./NodeContextMenu";
import { convertToMermaid } from "../utils/export-mermaid";
import { copyToClipboard } from "../utils/clipboard";
import { layoutGraph } from "../utils/layout";
import { AllNotesModal, getNotesFromNode } from "./NotesToolbarButton";
import type { DslGraph } from "../types";

// Minimum pixel change to detect layout modifications (avoids floating point comparison issues)
const POSITION_CHANGE_THRESHOLD = 1;

// Static props for ReactFlow - defined outside component to avoid new references on every render
const NODE_ORIGIN: [number, number] = [0.1, 0.1];
const MINIMAP_STYLE = {
  backgroundColor: "rgb(var(--ec-page-bg))",
  border: "1px solid rgb(var(--ec-page-border))",
  borderRadius: "8px",
} as const;
const LAYOUT_CHANGE_PANEL_STYLE_WITH_WALKTHROUGH = {
  marginBottom: "20px",
  marginLeft: "410px",
} as const;
const LAYOUT_CHANGE_PANEL_STYLE_DEFAULT = { marginLeft: "60px" } as const;
const LEGEND_PANEL_STYLE_WITH_MINIMAP = { marginRight: "230px" } as const;

type LegendEntry = { count: number; colorClass: string; groupId?: string };

const LegendPanel = memo(function LegendPanel({
  legend,
  showMinimap,
  onLegendClick,
}: {
  legend: Record<string, LegendEntry>;
  showMinimap: boolean;
  onLegendClick: (key: string, groupId?: string) => void;
}) {
  return (
    <Panel
      position="bottom-right"
      style={showMinimap ? LEGEND_PANEL_STYLE_WITH_MINIMAP : undefined}
    >
      <div className="bg-[rgb(var(--ec-card-bg))] border border-[rgb(var(--ec-page-border))] font-light px-4 text-[12px] shadow-md py-1 rounded-md">
        <ul className="m-0 p-0 ">
          {Object.entries(legend).map(
            ([key, { count, colorClass, groupId }]) => (
              <li
                key={key}
                className="flex space-x-2 items-center text-[10px] cursor-pointer text-[rgb(var(--ec-page-text))] hover:text-[rgb(var(--ec-accent))] hover:underline"
                onClick={() => onLegendClick(key, groupId)}
              >
                <span className={`w-2 h-2 block ${colorClass}`} />
                <span className="block capitalize">
                  {key} ({count})
                </span>
              </li>
            ),
          )}
        </ul>
      </div>
    </Panel>
  );
});

interface Props {
  nodes: any;
  edges: any;
  title?: string;
  subtitle?: string;
  includeBackground?: boolean;
  includeControls?: boolean;
  linkTo?: "docs" | "visualiser";
  includeKey?: boolean;
  linksToVisualiser?: boolean;
  links?: { label: string; url: string }[];
  mode?: "full" | "simple";
  showFlowWalkthrough?: boolean;
  showSearch?: boolean;
  zoomOnScroll?: boolean;
  designId?: string;
  isStudioModalOpen?: boolean;
  setIsStudioModalOpen?: (isOpen: boolean) => void;
  isChatEnabled?: boolean;
  maxTextSize?: number;
  isDevMode?: boolean;
  resourceKey?: string;
  /** Controls whether message flow animation is enabled. When set, overrides URL params and localStorage. */
  animated?: boolean;

  // Callback API for framework integration
  /** Called when a node is clicked */
  onNodeClick?: (node: Node) => void;
  /** Called to build URLs for navigation (used in links dropdown) */
  onBuildUrl?: (path: string) => string;
  /** Called when navigation should occur */
  onNavigate?: (url: string) => void;
  /** Called to save layout positions (dev mode only) */
  onSaveLayout?: (
    resourceKey: string,
    positions: Record<string, { x: number; y: number }>,
  ) => Promise<boolean>;
  /** Called to reset layout positions (dev mode only) */
  onResetLayout?: (resourceKey: string) => Promise<boolean>;
}

const NodeGraphBuilder = ({
  nodes: initialNodes,
  edges: initialEdges,
  title,
  includeBackground = true,
  linkTo: _linkTo = "docs",
  includeKey = true,
  linksToVisualiser = false,
  links = [],
  mode = "full",
  showFlowWalkthrough = true,
  showSearch = true,
  zoomOnScroll = false,
  isStudioModalOpen,
  setIsStudioModalOpen = () => {},
  isChatEnabled = false,
  maxTextSize,
  isDevMode = false,
  resourceKey,
  animated,
  onNodeClick,
  onBuildUrl: _onBuildUrl,
  onNavigate,
  onSaveLayout,
  onResetLayout,
}: Props) => {
  const nodeTypes = useMemo(() => {
    const wrapWithContextMenu = (Component: React.ComponentType<any>) => {
      const Wrapped = memo((props: any) => {
        const items = props.data?.contextMenu;
        if (!items?.length) return <Component {...props} />;
        return (
          <NodeContextMenu items={items}>
            <Component {...props} />
          </NodeContextMenu>
        );
      });
      Wrapped.displayName = `WithContextMenu(${Component.displayName || Component.name || "Component"})`;
      return Wrapped;
    };

    return {
      service: wrapWithContextMenu(ServiceNode),
      services: wrapWithContextMenu(ServiceNode),
      flow: wrapWithContextMenu(FlowNode),
      flows: wrapWithContextMenu(FlowNode),
      event: wrapWithContextMenu(EventNode),
      events: wrapWithContextMenu(EventNode),
      channel: wrapWithContextMenu(ChannelNode),
      channels: wrapWithContextMenu(ChannelNode),
      query: wrapWithContextMenu(QueryNode),
      queries: wrapWithContextMenu(QueryNode),
      command: wrapWithContextMenu(CommandNode),
      commands: wrapWithContextMenu(CommandNode),
      domain: wrapWithContextMenu(DomainNode),
      domains: wrapWithContextMenu(DomainNode),
      step: StepNode,
      user: UserNode,
      custom: CustomNode,
      externalSystem: wrapWithContextMenu(ExternalSystemNode),
      "external-system": wrapWithContextMenu(ExternalSystemNode2),
      entity: wrapWithContextMenu(EntityNode),
      entities: wrapWithContextMenu(EntityNode),
      data: wrapWithContextMenu(DataNode),
      view: wrapWithContextMenu(ViewNode),
      actor: ActorNode,
      container: wrapWithContextMenu(DataNode),
      "data-product": wrapWithContextMenu(DataProductNode),
      "data-products": wrapWithContextMenu(DataProductNode),
      group: GroupNode,
      note: memo((props: any) => <NoteNode {...props} readOnly={true} />),
    } as unknown as NodeTypes;
  }, []);
  const edgeTypes = useMemo(
    () =>
      ({
        animated: AnimatedMessageEdge,
        multiline: MultilineEdgeLabel,
        "flow-edge": FlowEdge,
      }) as Record<string, any>,
    [],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { fitView, getNodes } = useReactFlow();

  // Sync when parent passes new nodes/edges (e.g. playground re-parse)
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    // fitView after React Flow processes the new nodes
    requestAnimationFrame(() => {
      fitView({ duration: 300, padding: 0.2 });
    });
  }, [initialNodes, initialEdges, setNodes, setEdges, fitView]);

  const [animateMessages, setAnimateMessages] = useState(true);
  const [_activeStepIndex, _setActiveStepIndex] = useState<number | null>(null);
  const [_isFullscreen, _setIsFullscreen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrlCopySuccess, setShareUrlCopySuccess] = useState(false);
  const [isMermaidView, setIsMermaidView] = useState(false);
  const [showMinimap, setShowMinimap] = useState(false);
  const [hasLayoutChanges, setHasLayoutChanges] = useState(false);
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const initialPositionsRef = useRef<Record<string, { x: number; y: number }>>(
    {},
  );
  // const [isStudioModalOpen, setIsStudioModalOpen] = useState(false);
  const [focusModeOpen, setFocusModeOpen] = useState(false);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const openNotesModal = useCallback(() => setIsNotesModalOpen(true), []);

  // Track user interaction (drag/pan/zoom) to pause expensive SVG animations.
  // Uses a ref + direct DOM manipulation to avoid React re-renders.
  const interactionCountRef = useRef(0);

  const startInteraction = useCallback(() => {
    interactionCountRef.current += 1;
    if (interactionCountRef.current === 1) {
      reactFlowWrapperRef.current?.classList.add("ec-interaction-active");
    }
  }, []);

  const endInteraction = useCallback(() => {
    interactionCountRef.current = Math.max(0, interactionCountRef.current - 1);
    if (interactionCountRef.current === 0) {
      reactFlowWrapperRef.current?.classList.remove("ec-interaction-active");
    }
  }, []);

  // Highlight source/target nodes when hovering an edge.
  // Uses direct DOM manipulation (like startInteraction) to avoid re-renders.
  const hoveredEdgeNodesRef = useRef<Element[]>([]);

  const handleEdgeMouseEnter = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      const wrapper = reactFlowWrapperRef.current;
      if (!wrapper) return;
      const nodes = wrapper.querySelectorAll(
        `[data-id="${edge.source}"], [data-id="${edge.target}"]`,
      );
      nodes.forEach((el) => el.classList.add("ec-edge-hover-node"));
      hoveredEdgeNodesRef.current = Array.from(nodes);
    },
    [],
  );

  const handleEdgeMouseLeave = useCallback(() => {
    hoveredEdgeNodesRef.current.forEach((el) =>
      el.classList.remove("ec-edge-hover-node"),
    );
    hoveredEdgeNodesRef.current = [];
  }, []);

  // Highlight all connected edges + their other-end nodes when hovering a node.
  // Looks up connected edges from the edges array, then queries DOM by edge ID.
  // Uses direct DOM manipulation to avoid re-renders.
  const hoveredNodeEdgesRef = useRef<Element[]>([]);
  const hoveredNodePeersRef = useRef<Element[]>([]);

  const handleNodeMouseEnter = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const wrapper = reactFlowWrapperRef.current;
      if (!wrapper) return;

      const peerIds = new Set<string>();
      const edgeEls: Element[] = [];

      for (const edge of edgesRef.current) {
        if (edge.source !== node.id && edge.target !== node.id) continue;
        const el = wrapper.querySelector(
          `.react-flow__edge[data-id="${edge.id}"]`,
        );
        if (el) {
          el.classList.add("ec-node-hover-edge");
          edgeEls.push(el);
        }
        if (edge.source !== node.id) peerIds.add(edge.source);
        if (edge.target !== node.id) peerIds.add(edge.target);
      }
      hoveredNodeEdgesRef.current = edgeEls;

      // Highlight the hovered node + all peer nodes
      peerIds.add(node.id);
      const selector = Array.from(peerIds)
        .map((id) => `[data-id="${id}"]`)
        .join(", ");
      if (selector) {
        const peerEls = wrapper.querySelectorAll(selector);
        peerEls.forEach((el) => el.classList.add("ec-edge-hover-node"));
        hoveredNodePeersRef.current = Array.from(peerEls);
      }
    },
    [],
  );

  const handleNodeMouseLeave = useCallback(() => {
    hoveredNodeEdgesRef.current.forEach((el) =>
      el.classList.remove("ec-node-hover-edge"),
    );
    hoveredNodeEdgesRef.current = [];
    hoveredNodePeersRef.current.forEach((el) =>
      el.classList.remove("ec-edge-hover-node"),
    );
    hoveredNodePeersRef.current = [];
  }, []);

  // Check if there are channels to determine if we need the visualizer functionality
  const hasChannels = useMemo(
    () => initialNodes.some((node: any) => node.type === "channels"),
    [initialNodes],
  );
  // TODO: Re-enable channel visibility feature
  // const { hideChannels, toggleChannelsVisibility } = useChannelVisibility({
  //   nodes,
  //   edges,
  //   setNodes,
  //   setEdges,
  //   skipProcessing: !hasChannels,
  // });
  // Temporary implementation
  const hideChannels = false;
  const toggleChannelsVisibility = () => {};
  const searchRef = useRef<VisualiserSearchRef>(null);
  const reactFlowWrapperRef = useRef<HTMLDivElement>(null);
  const scrollableContainerRef = useRef<HTMLElement | null>(null);

  // Stable refs for nodes/edges - avoids recreating callbacks on every drag/state change
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;

  // Store initial node positions for change detection (dev mode only)
  useEffect(() => {
    if (isDevMode && initialNodes.length > 0) {
      const positions: Record<string, { x: number; y: number }> = {};
      initialNodes.forEach((node: Node) => {
        positions[node.id] = { x: node.position.x, y: node.position.y };
      });
      initialPositionsRef.current = positions;
    }
  }, [isDevMode, initialNodes]);

  // Detect layout changes by comparing current positions to initial positions
  const checkForLayoutChanges = useCallback(() => {
    if (!isDevMode) return;
    const initial = initialPositionsRef.current;
    if (Object.keys(initial).length === 0) return;

    const hasChanges = nodesRef.current.some((node) => {
      const initialPos = initial[node.id];
      return (
        initialPos &&
        (Math.abs(node.position.x - initialPos.x) > POSITION_CHANGE_THRESHOLD ||
          Math.abs(node.position.y - initialPos.y) > POSITION_CHANGE_THRESHOLD)
      );
    });

    setHasLayoutChanges(hasChanges);
  }, [isDevMode]);

  // Wrap onNodesChange to detect layout changes after node drag
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      // Check for position changes after drag ends
      const hasDragEnd = changes.some(
        (change) => change.type === "position" && !change.dragging,
      );
      if (hasDragEnd) {
        // Use setTimeout to ensure state is updated
        setTimeout(checkForLayoutChanges, 0);
      }
    },
    [onNodesChange, checkForLayoutChanges],
  );

  const resetNodesAndEdges = useCallback(() => {
    setNodes((nds) =>
      nds.map((node) => {
        node.style = { ...node.style, opacity: 1 };
        return { ...node, animated: animateMessages };
      }),
    );
    setEdges((eds) =>
      eds.map((edge) => {
        edge.style = { ...edge.style, opacity: 1 };
        edge.labelStyle = { ...edge.labelStyle, opacity: 1 };
        return {
          ...edge,
          data: { ...edge.data, opacity: 1, animated: animateMessages },
          animated: animateMessages,
        };
      }),
    );
  }, [setNodes, setEdges, animateMessages]);

  const handleNodeClick = useCallback(
    (_: any, node: Node) => {
      // If custom onNodeClick is provided, use it
      if (onNodeClick) {
        onNodeClick(node);
        return;
      }

      // Legacy behavior for linksToVisualiser (deprecated - use onNodeClick instead)
      if (linksToVisualiser && onNavigate) {
        // Consumer should handle navigation - but onNodeClick wasn't provided
        return;
      }

      // Disable focus mode for flow and entity visualizations
      const isFlow = edgesRef.current.some(
        (edge: Edge) => edge.type === "flow-edge",
      );
      const isEntityVisualizer = nodesRef.current.some(
        (n: Node) => n.type === "entities",
      );
      if (isFlow || isEntityVisualizer) return;

      // Disable focus mode for domain nodes
      if (node.type === "domain" || node.type === "domains") return;

      // Open focus mode modal
      setFocusedNodeId(node.id);
      setFocusModeOpen(true);
    },
    [onNodeClick, linksToVisualiser, onNavigate],
  );

  const toggleAnimateMessages = useCallback(() => {
    setAnimateMessages((prev) => {
      const next = !prev;
      localStorage.setItem(
        "EventCatalog:animateMessages",
        JSON.stringify(next),
      );
      return next;
    });
  }, []);

  // Handle fit to view
  const handleFitView = useCallback(() => {
    fitView({ duration: 400, padding: 0.2 });
  }, [fitView]);

  // animate messages, between views
  // Priority: animated prop > URL parameter > localStorage
  useEffect(() => {
    if (animated !== undefined) {
      setAnimateMessages(animated);
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const animateParam = urlParams.get("animate");

    if (animateParam === "true") {
      setAnimateMessages(true);
    } else if (animateParam === "false") {
      setAnimateMessages(false);
    } else {
      // Fall back to localStorage if no URL parameter
      const storedAnimateMessages = localStorage.getItem(
        "EventCatalog:animateMessages",
      );
      if (storedAnimateMessages !== null) {
        setAnimateMessages(storedAnimateMessages === "true");
      }
    }
  }, [animated]);

  useEffect(() => {
    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        animated: animateMessages,
        type:
          edge.type === "flow-edge" || edge.type === "multiline"
            ? edge.type
            : animateMessages
              ? "animated"
              : "smoothstep",
        data: { ...edge.data, animateMessages, animated: animateMessages },
      })),
    );
  }, [animateMessages]);

  useEffect(() => {
    setTimeout(() => {
      fitView({ duration: 800 });
    }, 150);
  }, []);

  // Generate mermaid code lazily (only when needed for copy)
  const generateMermaidCode = useCallback(() => {
    try {
      return convertToMermaid(nodesRef.current, edgesRef.current, {
        includeStyles: true,
        direction: "LR",
      });
    } catch (error) {
      console.error("Error generating mermaid code:", error);
      return "";
    }
  }, []);

  // Handle scroll wheel events to forward to page when no modifier keys are pressed
  // Only when zoomOnScroll is disabled
  // This is a fix for when we embed node graphs into pages, and users are scrolling the documentation pages
  // We dont want REACT FLOW to swallow the scroll events, so we forward them to the parent page
  useEffect(() => {
    // Skip scroll handling if zoomOnScroll is enabled
    if (zoomOnScroll) return;

    // Cache the scrollable container on mount (expensive operation done once)
    const findScrollableContainer = (): HTMLElement | null => {
      // Try specific known selectors first (fast)
      const selectors = [
        ".docs-layout .overflow-y-auto",
        ".overflow-y-auto",
        '[style*="overflow-y:auto"]',
        '[style*="overflow-y: auto"]',
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector) as HTMLElement;
        if (element) return element;
      }

      return null;
    };

    // Find and cache the scrollable container once
    if (!scrollableContainerRef.current) {
      scrollableContainerRef.current = findScrollableContainer();
    }

    const handleWheel = (event: WheelEvent) => {
      // Only forward scroll if no modifier keys are pressed
      if (!event.ctrlKey && !event.shiftKey && !event.metaKey) {
        event.preventDefault();

        const scrollableContainer = scrollableContainerRef.current;

        if (scrollableContainer) {
          scrollableContainer.scrollBy({
            top: event.deltaY,
            left: event.deltaX,
            behavior: "instant",
          });
        } else {
          // Fallback to window scroll
          window.scrollBy({
            top: event.deltaY,
            left: event.deltaX,
            behavior: "instant",
          });
        }
      }
    };

    const wrapper = reactFlowWrapperRef.current;
    if (wrapper) {
      wrapper.addEventListener("wheel", handleWheel, { passive: false });
      return () => {
        wrapper.removeEventListener("wheel", handleWheel);
      };
    }
  }, [zoomOnScroll]);

  const handlePaneClick = useCallback(() => {
    searchRef.current?.hideSuggestions();
    resetNodesAndEdges();
    fitView({ duration: 800 });
  }, [resetNodesAndEdges, fitView]);

  const handleNodeSelect = useCallback(
    (node: Node) => {
      handleNodeClick(null, node);
    },
    [handleNodeClick],
  );

  const handleSearchClear = useCallback(() => {
    resetNodesAndEdges();
    fitView({ duration: 800 });
  }, [resetNodesAndEdges, fitView]);

  const downloadImage = useCallback((dataUrl: string, filename?: string) => {
    const a = document.createElement("a");
    a.setAttribute("download", `${filename || "eventcatalog"}.png`);
    a.setAttribute("href", dataUrl);
    a.click();
  }, []);

  const openStudioModal = useCallback(() => {
    setIsStudioModalOpen(true);
  }, [setIsStudioModalOpen]);

  const openChat = useCallback(() => {
    window.dispatchEvent(new CustomEvent("eventcatalog:open-chat"));
  }, []);

  // Layout persistence handlers (dev mode only)
  const handleSaveLayout = useCallback(async (): Promise<boolean> => {
    if (!resourceKey || !onSaveLayout) return false;

    const positions: Record<string, { x: number; y: number }> = {};
    nodesRef.current.forEach((node) => {
      positions[node.id] = {
        x: node.position.x,
        y: node.position.y,
      };
    });

    return await onSaveLayout(resourceKey, positions);
  }, [resourceKey, onSaveLayout]);

  const handleResetLayout = useCallback(async (): Promise<boolean> => {
    if (!resourceKey || !onResetLayout) return false;
    return await onResetLayout(resourceKey);
  }, [resourceKey, onResetLayout]);

  // Quick save handler for the change detection UI
  const handleQuickSaveLayout = useCallback(async () => {
    setIsSavingLayout(true);
    const success = await handleSaveLayout();
    setIsSavingLayout(false);
    if (success) {
      // Update initial positions to current positions after save
      const positions: Record<string, { x: number; y: number }> = {};
      nodesRef.current.forEach((node) => {
        positions[node.id] = { x: node.position.x, y: node.position.y };
      });
      initialPositionsRef.current = positions;
      setHasLayoutChanges(false);
    }
  }, [handleSaveLayout]);

  const handleCopyArchitectureCode = useCallback(async () => {
    const code = generateMermaidCode();
    await copyToClipboard(code);
  }, [generateMermaidCode]);

  const handleCopyShareUrl = useCallback(async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    await copyToClipboard(url);
    setShareUrlCopySuccess(true);
    setTimeout(() => setShareUrlCopySuccess(false), 2000);
  }, []);

  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      reactFlowWrapperRef.current?.requestFullscreen().catch((err) => {
        console.error(
          `Error attempting to enable full-screen mode: ${err.message} (${err.name})`,
        );
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      _setIsFullscreen(!!document.fullscreenElement);
      setTimeout(() => {
        fitView({ duration: 800 });
      }, 100);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [fitView]);

  const handleExportVisual = useCallback(() => {
    const imageWidth = 1024;
    const imageHeight = 768;
    const nodesBounds = getNodesBounds(getNodes());
    const width =
      imageWidth > nodesBounds.width ? imageWidth : nodesBounds.width;
    const height =
      imageHeight > nodesBounds.height ? imageHeight : nodesBounds.height;
    const viewport = getViewportForBounds(
      nodesBounds,
      width,
      height,
      0.5,
      2,
      0,
    );

    // Hide controls during export
    const controls = document.querySelector(
      ".react-flow__controls",
    ) as HTMLElement;
    if (controls) controls.style.display = "none";

    toPng(document.querySelector(".react-flow__viewport") as HTMLElement, {
      backgroundColor: "#f1f1f1",
      width,
      height,
      style: {
        width: width.toString(),
        height: height.toString(),
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      },
    }).then((dataUrl: string) => {
      downloadImage(dataUrl, title);
      // Restore controls
      if (controls) controls.style.display = "block";
    });
  }, [getNodes, downloadImage, title]);

  const handleLegendClick = useCallback(
    (collectionType: string, groupId?: string) => {
      const updatedNodes = nodes.map((node: Node<any>) => {
        // Check if the groupId is set first
        if (groupId && node.data.group && node.data.group?.id === groupId) {
          return { ...node, style: { ...node.style, opacity: 1 } };
        } else {
          if (node.type === collectionType) {
            return { ...node, style: { ...node.style, opacity: 1 } };
          }
        }
        return { ...node, style: { ...node.style, opacity: 0.1 } };
      });

      const updatedEdges = edges.map((edge) => {
        return {
          ...edge,
          data: { ...edge.data, opacity: 0.1 },
          style: { ...edge.style, opacity: 0.1 },
          labelStyle: { ...edge.labelStyle, opacity: 0.1 },
          animated: animateMessages,
        };
      });

      setNodes(updatedNodes);
      setEdges(updatedEdges);

      fitView({
        padding: 0.2,
        duration: 800,
        nodes: updatedNodes.filter((node) => node.type === collectionType),
      });
    },
    [nodes, edges, setNodes, setEdges, fitView],
  );

  const getNodesByCollectionWithColors = useCallback((nodes: Node<any>[]) => {
    const colorClasses = {
      events: "bg-orange-600",
      services: "bg-pink-600",
      flows: "bg-teal-600",
      commands: "bg-blue-600",
      queries: "bg-green-600",
      channels: "bg-gray-600",
      externalSystem: "bg-pink-600",
      actor: "bg-yellow-500",
      step: "bg-gray-700",
      data: "bg-blue-600",
      "data-products": "bg-indigo-600",
    };

    let legendForDomains: {
      [key: string]: { count: number; colorClass: string; groupId: string };
    } = {};

    // Find any groups
    const domainGroups = [
      ...new Set(
        nodes
          .filter(
            (node) => node.data.group && node.data.group?.type === "Domain",
          )
          .map((node) => node.data.group?.id),
      ),
    ];

    domainGroups.forEach((groupId) => {
      const group = nodes.filter(
        (node) => node.data.group && node.data.group?.id === groupId,
      );
      legendForDomains[`${groupId} (Domain)`] = {
        count: group.length,
        colorClass: "bg-yellow-600",
        groupId,
      };
    });

    const legendForNodes = nodes.reduce(
      (
        acc: {
          [key: string]: {
            count: number;
            colorClass: string;
            groupId?: string;
          };
        },
        node,
      ) => {
        const collection = node.type;
        if (collection) {
          if (acc[collection]) {
            acc[collection].count += 1;
          } else {
            acc[collection] = {
              count: 1,
              colorClass:
                colorClasses[collection as keyof typeof colorClasses] ||
                "bg-black",
            };
          }
        }
        return acc;
      },
      {},
    );

    return { ...legendForDomains, ...legendForNodes };
  }, []);

  // Legend only depends on node types and groups, not positions.
  // Use a ref to avoid recomputing the key string on every drag tick.
  const legendKeyRef = useRef("");
  const computedLegendKey = nodes
    .map((n: Node<any>) => `${n.id}:${n.type}:${n.data.group?.id || ""}`)
    .join(",");
  if (computedLegendKey !== legendKeyRef.current) {
    legendKeyRef.current = computedLegendKey;
  }
  const legendKey = legendKeyRef.current;

  const legend = useMemo(
    () => getNodesByCollectionWithColors(nodes),
    [getNodesByCollectionWithColors, legendKey],
  );

  // Stable key derived from node IDs — only changes when nodes are added/removed,
  // not when positions change during drag. Used by search, legend, and notes.
  const nodeIdsKeyRef = useRef("");
  const computedNodeIdsKey = nodes.map((n) => n.id).join(",");
  if (computedNodeIdsKey !== nodeIdsKeyRef.current) {
    nodeIdsKeyRef.current = computedNodeIdsKey;
  }
  const nodeIdsKey = nodeIdsKeyRef.current;

  const searchNodes = useMemo(() => nodes, [nodeIdsKey]);

  // Collect notes across all nodes for the dropdown menu item.
  // Notes don't change during drag — use nodeIdsKey for stability.
  const allNoteGroups = useMemo(() => {
    const groups: {
      nodeId: string;
      name: string;
      notes: any[];
      nodeType: string;
    }[] = [];
    for (const node of nodes) {
      const result = getNotesFromNode(node);
      if (result) {
        groups.push({
          nodeId: node.id,
          name: result.name,
          notes: result.notes,
          nodeType: result.nodeType,
        });
      }
    }
    return groups;
  }, [nodeIdsKey]);

  const totalNotesCount = useMemo(
    () => allNoteGroups.reduce((sum, g) => sum + g.notes.length, 0),
    [allNoteGroups],
  );

  const handleStepChange = useCallback(
    (
      nodeId: string | null,
      highlightPaths?: string[],
      shouldZoomOut?: boolean,
    ) => {
      if (nodeId === null) {
        // Reset all nodes and edges
        resetNodesAndEdges();
        _setActiveStepIndex(null);

        // If shouldZoomOut is true, fit the entire view
        if (shouldZoomOut) {
          setTimeout(() => {
            fitView({ duration: 800, padding: 0.1 });
          }, 100);
        }
        return;
      }

      const activeNode = nodes.find((node: Node) => node.id === nodeId);
      if (!activeNode) return;

      // Create set of highlighted nodes and edges
      const highlightedNodeIds = new Set<string>();
      const highlightedEdgeIds = new Set<string>();

      // Add current node
      highlightedNodeIds.add(activeNode.id);

      // Add incoming edges and their source nodes
      edges.forEach((edge: Edge) => {
        if (edge.target === activeNode.id) {
          highlightedEdgeIds.add(edge.id);
          highlightedNodeIds.add(edge.source);
        }
      });

      // Add outgoing edges
      if (highlightPaths) {
        // Highlight all possible paths when at a fork
        highlightPaths.forEach((pathId) => {
          const [source, target] = pathId.split("-");
          edges.forEach((edge: Edge) => {
            if (edge.source === source && edge.target === target) {
              highlightedEdgeIds.add(edge.id);
              highlightedNodeIds.add(edge.target);
            }
          });
        });
      } else {
        // Highlight all outgoing edges normally
        edges.forEach((edge: Edge) => {
          if (edge.source === activeNode.id) {
            highlightedEdgeIds.add(edge.id);
            highlightedNodeIds.add(edge.target);
          }
        });
      }

      // Update nodes
      const updatedNodes = nodes.map((node: Node) => {
        if (highlightedNodeIds.has(node.id)) {
          return { ...node, style: { ...node.style, opacity: 1 } };
        }
        return { ...node, style: { ...node.style, opacity: 0.2 } };
      });

      // Update edges
      const updatedEdges = edges.map((edge: Edge) => {
        if (highlightedEdgeIds.has(edge.id)) {
          return {
            ...edge,
            data: { ...edge.data, opacity: 1, animated: true },
            style: { ...edge.style, opacity: 1, strokeWidth: 3 },
            labelStyle: { ...edge.labelStyle, opacity: 1 },
            animated: true,
          };
        }
        return {
          ...edge,
          data: { ...edge.data, opacity: 0.2, animated: false },
          style: { ...edge.style, opacity: 0.2, strokeWidth: 2 },
          labelStyle: { ...edge.labelStyle, opacity: 0.2 },
          animated: false,
        };
      });

      setNodes(updatedNodes);
      setEdges(updatedEdges);

      // Fit view to active node
      fitView({
        padding: 0.4,
        duration: 800,
        nodes: [activeNode],
      });
    },
    [nodes, edges, setNodes, setEdges, resetNodesAndEdges, fitView],
  );

  // Check if this is a flow visualization by checking if edges use flow-edge type
  const isFlowVisualization = useMemo(
    () => edges.some((edge: Edge) => edge.type === "flow-edge"),
    [edges],
  );

  return (
    <div
      ref={reactFlowWrapperRef}
      className="w-full h-full bg-[rgb(var(--ec-page-bg))] flex flex-col eventcatalog-visualizer"
    >
      {isMermaidView ? (
        <>
          {/* Menu Bar for Mermaid View */}
          <div className="w-full pr-6 flex space-x-2 justify-between items-center bg-[rgb(var(--ec-page-bg))] border-b border-[rgb(var(--ec-page-border))] p-4">
            <div className="flex space-x-2 ml-4">
              {/* Settings Dropdown Menu */}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    className="py-2.5 px-4 bg-[rgb(var(--ec-page-bg))] hover:bg-[rgb(var(--ec-accent-subtle)/0.4)] border border-[rgb(var(--ec-page-border))] rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgb(var(--ec-accent))] flex items-center gap-3 transition-all duration-200 hover:border-[rgb(var(--ec-accent)/0.3)] group whitespace-nowrap"
                    aria-label="Open menu"
                  >
                    {title && (
                      <span className="text-base font-medium text-[rgb(var(--ec-page-text))] leading-tight">
                        {title}
                      </span>
                    )}
                    <MoreVertical className="h-5 w-5 text-[rgb(var(--ec-page-text-muted))] flex-shrink-0 group-hover:text-[rgb(var(--ec-accent))] transition-colors duration-150" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className="min-w-56 bg-[rgb(var(--ec-page-bg))] border border-[rgb(var(--ec-page-border))] rounded-lg shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-200"
                    sideOffset={0}
                    align="end"
                    alignOffset={-180}
                  >
                    <DropdownMenu.Arrow className="fill-[rgb(var(--ec-page-bg))] stroke-[rgb(var(--ec-page-border))] stroke-1" />
                    <VisualizerDropdownContent
                      isMermaidView={isMermaidView}
                      setIsMermaidView={setIsMermaidView}
                      animateMessages={animateMessages}
                      toggleAnimateMessages={toggleAnimateMessages}
                      hideChannels={hideChannels}
                      toggleChannelsVisibility={toggleChannelsVisibility}
                      hasChannels={hasChannels}
                      showMinimap={showMinimap}
                      setShowMinimap={setShowMinimap}
                      handleFitView={handleFitView}
                      searchRef={searchRef}
                      isChatEnabled={isChatEnabled}
                      openChat={openChat}
                      handleCopyArchitectureCode={handleCopyArchitectureCode}
                      handleExportVisual={handleExportVisual}
                      setIsShareModalOpen={setIsShareModalOpen}
                      toggleFullScreen={toggleFullScreen}
                      openStudioModal={openStudioModal}
                      isDevMode={isDevMode}
                      onSaveLayout={handleSaveLayout}
                      onResetLayout={handleResetLayout}
                    />
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
            {mode === "full" && showSearch && (
              <div className="flex justify-end items-center gap-2">
                {!isMermaidView && (
                  <div className="w-96">
                    <VisualiserSearch
                      ref={searchRef}
                      nodes={searchNodes}
                      onNodeSelect={handleNodeSelect}
                      onClear={handleSearchClear}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Mermaid View */}
          <div className="flex-1 overflow-hidden relative">
            <MermaidView
              nodes={nodes}
              edges={edges}
              maxTextSize={maxTextSize}
            />
          </div>
        </>
      ) : (
        <ReactFlow
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          minZoom={0.07}
          nodes={nodes}
          edges={edges}
          fitView
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onEdgeMouseEnter={handleEdgeMouseEnter}
          onEdgeMouseLeave={handleEdgeMouseLeave}
          connectionLineType={ConnectionLineType.SmoothStep}
          nodeOrigin={NODE_ORIGIN}
          onNodeClick={handleNodeClick}
          onNodeMouseEnter={handleNodeMouseEnter}
          onNodeMouseLeave={handleNodeMouseLeave}
          onPaneClick={handlePaneClick}
          onMoveStart={startInteraction}
          onMoveEnd={endInteraction}
          onNodeDragStart={startInteraction}
          onNodeDragStop={endInteraction}
          zoomOnScroll={zoomOnScroll}
          className="relative"
        >
          <Panel
            position="top-center"
            className="w-full pr-6 pointer-events-none"
          >
            <div className="flex space-x-2 justify-between items-center pointer-events-auto">
              <div className="flex space-x-2 ml-4">
                {/* Settings Dropdown Menu */}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      className="py-2.5 px-4 bg-[rgb(var(--ec-page-bg))] hover:bg-[rgb(var(--ec-accent-subtle)/0.4)] border border-[rgb(var(--ec-page-border))] rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgb(var(--ec-accent))] flex items-center gap-3 transition-all duration-200 hover:border-[rgb(var(--ec-accent)/0.3)] group whitespace-nowrap"
                      aria-label="Open menu"
                    >
                      {title && (
                        <span className="text-base font-medium text-[rgb(var(--ec-page-text))] leading-tight">
                          {title}
                        </span>
                      )}
                      <MoreVertical className="h-5 w-5 text-[rgb(var(--ec-page-text-muted))] flex-shrink-0 group-hover:text-[rgb(var(--ec-accent))] transition-colors duration-150" />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="min-w-56 bg-[rgb(var(--ec-page-bg))] border border-[rgb(var(--ec-page-border))] rounded-lg shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-200"
                      sideOffset={0}
                      align="end"
                      alignOffset={-180}
                    >
                      <DropdownMenu.Arrow className="fill-[rgb(var(--ec-page-bg))] stroke-[rgb(var(--ec-page-border))] stroke-1" />
                      <VisualizerDropdownContent
                        isMermaidView={isMermaidView}
                        setIsMermaidView={setIsMermaidView}
                        animateMessages={animateMessages}
                        toggleAnimateMessages={toggleAnimateMessages}
                        hideChannels={hideChannels}
                        toggleChannelsVisibility={toggleChannelsVisibility}
                        hasChannels={hasChannels}
                        showMinimap={showMinimap}
                        setShowMinimap={setShowMinimap}
                        handleFitView={handleFitView}
                        searchRef={searchRef}
                        isChatEnabled={isChatEnabled}
                        openChat={openChat}
                        handleCopyArchitectureCode={handleCopyArchitectureCode}
                        handleExportVisual={handleExportVisual}
                        setIsShareModalOpen={setIsShareModalOpen}
                        toggleFullScreen={toggleFullScreen}
                        openStudioModal={openStudioModal}
                        isDevMode={isDevMode}
                        onSaveLayout={handleSaveLayout}
                        onResetLayout={handleResetLayout}
                        notesCount={totalNotesCount}
                        onOpenNotes={openNotesModal}
                      />
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
              {mode === "full" && showSearch && (
                <div className="flex justify-end items-center gap-2">
                  {!isMermaidView && (
                    <div className="w-96">
                      <VisualiserSearch
                        ref={searchRef}
                        nodes={searchNodes}
                        onNodeSelect={handleNodeSelect}
                        onClear={handleSearchClear}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
            {links.length > 0 && (
              <div className="flex justify-end mt-3">
                <div className="relative flex items-center -mt-1">
                  <span className="absolute left-2 pointer-events-none flex items-center h-full">
                    <HistoryIcon className="h-4 w-4 text-[rgb(var(--ec-page-text-muted))]" />
                  </span>
                  <select
                    value={
                      links.find((link) =>
                        window.location.href.includes(link.url),
                      )?.url || links[0].url
                    }
                    onChange={(e) => {
                      if (onNavigate) {
                        onNavigate(e.target.value);
                      } else {
                        window.location.href = e.target.value;
                      }
                    }}
                    className="appearance-none pl-7 pr-6 py-0 text-[14px] bg-[rgb(var(--ec-card-bg))] text-[rgb(var(--ec-page-text))] rounded-md border border-[rgb(var(--ec-page-border))] hover:bg-[rgb(var(--ec-page-border)/0.5)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgb(var(--ec-accent))]"
                    style={{ minWidth: 120, height: "26px" }}
                  >
                    {links.map((link) => (
                      <option key={link.url} value={link.url}>
                        {link.label}
                      </option>
                    ))}
                  </select>
                  <span className="absolute right-2 pointer-events-none">
                    <svg
                      className="w-4 h-4 text-[rgb(var(--ec-page-text-muted))]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </span>
                </div>
              </div>
            )}
          </Panel>

          {includeBackground && (
            <Background color="var(--ec-bg-dots)" gap={16} />
          )}
          {includeBackground && <Controls />}
          {showMinimap && (
            <MiniMap
              nodeStrokeWidth={3}
              zoomable
              pannable
              style={MINIMAP_STYLE}
            />
          )}
          {isFlowVisualization && showFlowWalkthrough && (
            <Panel position="bottom-left">
              <StepWalkthrough
                nodes={nodes}
                edges={edges}
                isFlowVisualization={isFlowVisualization}
                onStepChange={handleStepChange}
                mode={mode}
              />
            </Panel>
          )}
          {/* Dev Mode: Layout change indicator */}
          {isDevMode && hasLayoutChanges && (
            <Panel
              position="bottom-left"
              style={
                isFlowVisualization && showFlowWalkthrough
                  ? LAYOUT_CHANGE_PANEL_STYLE_WITH_WALKTHROUGH
                  : LAYOUT_CHANGE_PANEL_STYLE_DEFAULT
              }
            >
              <div className="bg-[rgb(var(--ec-card-bg))] border border-[rgb(var(--ec-page-border))] rounded-lg shadow-md px-3 py-2 flex items-center gap-3">
                <span className="text-xs text-[rgb(var(--ec-page-text-muted))]">
                  Layout changed
                </span>
                <button
                  onClick={handleQuickSaveLayout}
                  disabled={isSavingLayout}
                  className="text-xs font-medium text-[rgb(var(--ec-accent-text))] bg-[rgb(var(--ec-accent-subtle))] hover:bg-[rgb(var(--ec-accent-subtle)/0.7)] px-2 py-1 rounded transition-colors disabled:opacity-50"
                >
                  {isSavingLayout ? "Saving..." : "Save"}
                </button>
              </div>
            </Panel>
          )}
          {includeKey && (
            <LegendPanel
              legend={legend}
              showMinimap={showMinimap}
              onLegendClick={handleLegendClick}
            />
          )}
        </ReactFlow>
      )}
      <StudioModal
        isOpen={isStudioModalOpen || false}
        onClose={() => setIsStudioModalOpen(false)}
      />
      <FocusModeModal
        isOpen={focusModeOpen}
        onClose={() => setFocusModeOpen(false)}
        initialNodeId={focusedNodeId}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
      />
      <AllNotesModal
        noteGroups={allNoteGroups}
        isOpen={isNotesModalOpen}
        onClose={() => setIsNotesModalOpen(false)}
        nodes={nodes}
      />

      {/* Share Link Modal */}
      {isShareModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setIsShareModalOpen(false)}
            style={{ animation: "fadeIn 150ms ease-out" }}
          />
          <div
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[rgb(var(--ec-page-bg))] rounded-lg shadow-xl z-50 w-full max-w-md p-6 border border-[rgb(var(--ec-page-border))]"
            style={{ animation: "slideInCenter 250ms ease-out" }}
          >
            <style>{`
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              @keyframes slideInCenter {
                from { opacity: 0; transform: translate(-50%, -48%); }
                to { opacity: 1; transform: translate(-50%, -50%); }
              }
            `}</style>

            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-[rgb(var(--ec-page-text))]">
                Share Link
              </h3>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))] transition-colors"
                aria-label="Close modal"
              >
                <ExternalLink className="w-5 h-5 rotate-180" />
              </button>
            </div>

            <p className="text-sm text-[rgb(var(--ec-page-text-muted))] mb-4">
              Share this link with your team to let them view this
              visualization.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={
                  typeof window !== "undefined" ? window.location.href : ""
                }
                className="flex-1 px-3 py-2.5 bg-[rgb(var(--ec-input-bg))] border border-[rgb(var(--ec-input-border))] rounded-md text-[rgb(var(--ec-input-text))] text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ec-accent))]"
              />
              <button
                onClick={handleCopyShareUrl}
                className={`px-4 py-2.5 rounded-md font-medium transition-all duration-200 flex items-center gap-2 ${
                  shareUrlCopySuccess
                    ? "bg-green-500 text-white"
                    : "bg-[rgb(var(--ec-accent))] text-white hover:opacity-90"
                }`}
                aria-label={shareUrlCopySuccess ? "Copied!" : "Copy link"}
              >
                {shareUrlCopySuccess ? (
                  <CheckIcon className="w-4 h-4" />
                ) : (
                  <ClipboardIcon className="w-4 h-4" />
                )}
                <span>{shareUrlCopySuccess ? "Copied!" : "Copy"}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

interface NodeGraphProps {
  id: string;
  title?: string;
  href?: string;
  hrefLabel?: string;
  nodes?: Node[];
  edges?: Edge[];
  graph?: DslGraph;
  linkTo?: "docs" | "visualiser";
  includeKey?: boolean;
  footerLabel?: string;
  linksToVisualiser?: boolean;
  links?: { label: string; url: string }[];
  mode?: "full" | "simple";
  portalId?: string;
  showFlowWalkthrough?: boolean;
  showSearch?: boolean;
  zoomOnScroll?: boolean;
  designId?: string;
  isChatEnabled?: boolean;
  maxTextSize?: number;
  isDevMode?: boolean;
  resourceKey?: string;
  /** Controls whether message flow animation is enabled. When set, overrides URL params and localStorage. */
  animated?: boolean;

  // Callback API for framework integration
  onNodeClick?: (node: Node) => void;
  onBuildUrl?: (path: string) => string;
  onNavigate?: (url: string) => void;
  onSaveLayout?: (
    resourceKey: string,
    positions: Record<string, { x: number; y: number }>,
  ) => Promise<boolean>;
  onResetLayout?: (resourceKey: string) => Promise<boolean>;
}

const NodeGraph = ({
  id,
  nodes: nodesProp,
  edges: edgesProp,
  graph,
  title: titleProp,
  href,
  linkTo = "docs",
  hrefLabel = "Open in visualizer",
  includeKey: includeKeyProp,
  footerLabel,
  linksToVisualiser = false,
  links = [],
  mode = "full",
  portalId,
  showFlowWalkthrough = true,
  showSearch: showSearchProp,
  zoomOnScroll = false,
  designId,
  isChatEnabled = false,
  maxTextSize,
  isDevMode = false,
  resourceKey,
  animated: animatedProp,
  onNodeClick,
  onBuildUrl,
  onNavigate,
  onSaveLayout,
  onResetLayout,
}: NodeGraphProps) => {
  // When a DslGraph is provided, run layout internally using dagre.
  const graphLayout = useMemo(() => {
    if (!graph) return null;
    return layoutGraph(
      graph.nodes,
      graph.edges,
      { rankdir: "LR", nodesep: 60, ranksep: 120 },
      graph.options?.style,
    );
  }, [graph]);
  const nodes = graphLayout?.nodes ?? nodesProp ?? [];
  const edges = graphLayout?.edges ?? edgesProp ?? [];

  // Derive props from graph.options when graph is provided
  const title = titleProp ?? graph?.title;
  const includeKey =
    includeKeyProp !== undefined
      ? includeKeyProp
      : graph?.options?.legend !== false;
  const showSearch =
    showSearchProp !== undefined
      ? showSearchProp
      : graph?.options?.search !== false;
  const animated = animatedProp ?? graph?.options?.animated;
  const [elem, setElem] = useState(null);
  const [showFooter, setShowFooter] = useState(true);
  const [isStudioModalOpen, setIsStudioModalOpen] = useState(false);

  const openStudioModal = useCallback(() => {
    setIsStudioModalOpen(true);
  }, []);

  const containerToRenderInto = portalId || `${id}-portal`;

  useEffect(() => {
    // @ts-ignore
    setElem(document.getElementById(containerToRenderInto));
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const embed = urlParams.get("embed");
    if (embed === "true") {
      setShowFooter(false);
    }
  }, []);

  if (!elem) return null;

  return (
    <div>
      {createPortal(
        <ReactFlowProvider>
          <NodeGraphBuilder
            edges={edges}
            nodes={nodes}
            title={title}
            linkTo={linkTo}
            includeKey={includeKey}
            linksToVisualiser={linksToVisualiser}
            links={links}
            mode={mode}
            showFlowWalkthrough={showFlowWalkthrough}
            showSearch={showSearch}
            zoomOnScroll={zoomOnScroll}
            designId={designId || id}
            isStudioModalOpen={isStudioModalOpen}
            setIsStudioModalOpen={setIsStudioModalOpen}
            isChatEnabled={isChatEnabled}
            maxTextSize={maxTextSize}
            isDevMode={isDevMode}
            resourceKey={resourceKey}
            animated={animated}
            onNodeClick={onNodeClick}
            onBuildUrl={onBuildUrl}
            onNavigate={onNavigate}
            onSaveLayout={onSaveLayout}
            onResetLayout={onResetLayout}
          />

          {showFooter && (
            <div className="flex justify-between" id="visualiser-footer">
              {footerLabel && (
                <div className="py-2 w-full text-left ">
                  <span className=" text-sm no-underline py-2 text-[rgb(var(--ec-page-text-muted))]">
                    {footerLabel}
                  </span>
                </div>
              )}

              {href && (
                <div className="py-2 w-full text-right flex justify-between">
                  {/* <span className="text-sm text-gray-500 italic">Right click a node to access documentation</span> */}
                  <button
                    onClick={openStudioModal}
                    className=" text-sm underline text-[rgb(var(--ec-page-text))] hover:text-[rgb(var(--ec-accent))] flex items-center space-x-1"
                  >
                    <span>Open in EventCatalog Studio</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  <a
                    className=" text-sm underline text-[rgb(var(--ec-page-text))] hover:text-[rgb(var(--ec-accent))]"
                    href={href}
                  >
                    {hrefLabel} &rarr;
                  </a>
                </div>
              )}
            </div>
          )}
        </ReactFlowProvider>,
        elem,
      )}
    </div>
  );
};

export default NodeGraph;
