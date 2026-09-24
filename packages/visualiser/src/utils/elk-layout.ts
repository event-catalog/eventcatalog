import type { Edge, Node } from "@xyflow/react";
import type {
  ELK,
  ElkExtendedEdge,
  ElkNode,
  ElkPort,
  LayoutOptions,
} from "elkjs/lib/elk-api";
import { getEdgeLabelSize } from "./utils/utils";

export type LayoutGraph = { nodes: Node[]; edges: Edge[] };
export type LayoutSize = { width: number; height: number };
export type EdgeRoute = {
  points: { x: number; y: number }[];
  label?: { x: number; y: number };
  /** Where the edge's source and target were laid out (top-left, in the flow) */
  source?: { x: number; y: number };
  target?: { x: number; y: number };
};

// The size each node type renders at (at most), for nodes that haven't been
// rendered (and measured) yet, e.g. when laying a graph out on the server
const DEFAULT_SIZE: LayoutSize = { width: 240, height: 112 };
const NODE_SIZES: Record<string, LayoutSize> = {
  events: { width: 240, height: 104 },
  commands: { width: 240, height: 126 },
  queries: { width: 240, height: 126 },
  services: { width: 240, height: 112 },
  data: { width: 240, height: 108 },
  systems: { width: 240, height: 120 },
  system: { width: 240, height: 120 },
  "context-domain": { width: 240, height: 112 },
  "context-actor": { width: 180, height: 80 },
  actor: { width: 180, height: 80 },
  note: { width: 200, height: 150 },
  step: { width: 240, height: 80 },
  // Groups with nothing in them (groups with children are sized to fit them)
  "domain-group": { width: 320, height: 160 },
  "system-group": { width: 320, height: 160 },
};

// Nodes sized by their style, like groups: an empty one needs a size too
const GROUP_TYPES = new Set(["domain-group", "system-group", "group"]);

/** The size a node is laid out at: as rendered, or an estimate for its type */
export const getNodeSize = (node: Node): LayoutSize => {
  if (node.measured?.width && node.measured?.height) {
    return { width: node.measured.width, height: node.measured.height };
  }
  if (typeof node.width === "number" && typeof node.height === "number") {
    return { width: node.width, height: node.height };
  }
  // Domains list their services, so grow with them
  if (node.type === "domains" || node.type === "domain") {
    const services = (node.data as any)?.domain?.data?.services || [];
    return { width: 260, height: 60 + services.length * 40 };
  }
  return NODE_SIZES[node.type || ""] ?? DEFAULT_SIZE;
};

// Room for a group's header above its children
const GROUP_PADDING = "[top=100,left=40,bottom=40,right=40]";

// Space between nodes and edges. Set on every group as well as the graph, as
// groups don't take it from the graph (they'd use ELK's much tighter defaults)
const SPACING = {
  "elk.layered.spacing.nodeNodeBetweenLayers": "60",
  "elk.spacing.nodeNode": "40",
  "elk.spacing.edgeNode": "25",
  "elk.spacing.edgeEdge": "15",
};

// Large graphs (e.g. a big domain) use cheaper settings: the nicest node
// placement takes minutes on a few thousand edges, these take a second or two
const LARGE_GRAPH_NODES = 80;
const LARGE_GRAPH_EDGES = 200;
const LARGE_GRAPH_OPTIONS: LayoutOptions = {
  "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
  "elk.layered.thoroughness": "1",
  "elk.layered.crossingMinimization.greedySwitch.type": "OFF",
};

let elk: ELK | undefined;
// Loaded when first needed, so pages that never lay out in the browser don't download it
const getElk = async () => {
  if (!elk) {
    const { default: ELK } = await import("elkjs/lib/elk.bundled.js");
    elk = new ELK();
  }
  return elk;
};

/**
 * Lays a graph out with ELK (left to right). Nested groups (nodes other nodes
 * have as their `parentId`) are laid out in one pass with their children.
 * Edges are routed at right angles around nodes, each edge with its own
 * connection point so edges don't run on top of each other, and labels are
 * placed on their edge. Each edge keeps its type and gets its route (and label
 * position) in `data.route`, which the visualiser's edges are drawn along.
 *
 * Node positions are top-left corners (nodes get `origin: [0, 0]`), children
 * relative to their group. Groups are sized to fit their children.
 */
export const layoutWithElk = async (
  { nodes, edges }: LayoutGraph,
  { sizeOf = getNodeSize }: { sizeOf?: (node: Node) => LayoutSize } = {},
): Promise<LayoutGraph> => {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const groupIds = new Set(
    nodes
      .map((node) => node.parentId)
      .filter((id): id is string => !!id && nodesById.has(id)),
  );
  const parentOf = (node: Node) =>
    node.parentId && groupIds.has(node.parentId) ? node.parentId : undefined;

  // Each edge gets its own port, leaving from the right of its source and
  // arriving at the left of its target, so ELK spreads edges out along a
  // node's side rather than routing them all through one point. Edges to a
  // specific handle (e.g. a service listed in a domain) share that handle's port.
  const layoutEdges = edges.filter(
    (edge) => nodesById.has(edge.source) && nodesById.has(edge.target),
  );
  const ports = new Map<string, ElkPort[]>();
  const addPort = (
    nodeId: string,
    id: string,
    side: "EAST" | "WEST",
  ): string => {
    const nodePorts = ports.get(nodeId) || [];
    if (!nodePorts.some((port) => port.id === id)) {
      ports.set(nodeId, [
        ...nodePorts,
        { id, layoutOptions: { "elk.port.side": side } },
      ]);
    }
    return id;
  };
  const edgePorts = layoutEdges.map((edge, index) => ({
    source: addPort(
      edge.source,
      edge.sourceHandle
        ? `${edge.source}__${edge.sourceHandle}`
        : `e${index}__out`,
      "EAST",
    ),
    target: addPort(
      edge.target,
      edge.targetHandle
        ? `${edge.target}__${edge.targetHandle}`
        : `e${index}__in`,
      "WEST",
    ),
  }));

  const toElkNode = (node: Node): ElkNode => ({
    id: node.id,
    ...(groupIds.has(node.id)
      ? {
          children: nodes
            .filter((child) => parentOf(child) === node.id)
            .map(toElkNode),
        }
      : sizeOf(node)),
    layoutOptions: {
      "elk.portConstraints": "FIXED_SIDE",
      ...(groupIds.has(node.id)
        ? { "elk.padding": GROUP_PADDING, ...SPACING }
        : {}),
    },
    ports: ports.get(node.id) || [],
  });

  const layout = await (
    await getElk()
  ).layout({
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.edgeRouting": "ORTHOGONAL",
      // Edge routes in absolute coordinates (node positions stay relative to their parent)
      "elk.json.edgeCoords": "ROOT",
      "elk.edgeLabels.placement": "CENTER",
      ...SPACING,
      ...(nodes.length >= LARGE_GRAPH_NODES || edges.length >= LARGE_GRAPH_EDGES
        ? LARGE_GRAPH_OPTIONS
        : { "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX" }),
    },
    children: nodes.filter((node) => !parentOf(node)).map(toElkNode),
    edges: layoutEdges.map((edge, index) => ({
      id: `e${index}`,
      sources: [edgePorts[index].source],
      targets: [edgePorts[index].target],
      // Labels sit on their edge, rather than beside it (only works set per label)
      labels: edge.label
        ? [
            {
              text: String(edge.label),
              ...getEdgeLabelSize(edge.label),
              layoutOptions: { "elk.edgeLabels.inline": "true" },
            },
          ]
        : [],
    })),
  });

  const laidOut = new Map<string, ElkNode>();
  const collect = (elkNode: ElkNode) =>
    (elkNode.children || []).forEach((child) => {
      laidOut.set(child.id, child);
      collect(child);
    });
  collect(layout);

  // Where a node was laid out in the flow (ELK positions are relative to the parent)
  const absolute = (nodeId: string): { x: number; y: number } => {
    const node = nodesById.get(nodeId);
    const parent = node && parentOf(node);
    const offset = parent ? absolute(parent) : { x: 0, y: 0 };
    const elkNode = laidOut.get(nodeId);
    return { x: offset.x + (elkNode?.x ?? 0), y: offset.y + (elkNode?.y ?? 0) };
  };

  const routes = new Map<Edge, EdgeRoute>();
  (layout.edges || []).forEach((elkEdge: ElkExtendedEdge) => {
    const section = elkEdge.sections?.[0];
    if (!section) return;
    const label = elkEdge.labels?.[0];
    const edge = layoutEdges[Number(elkEdge.id.slice(1))];
    routes.set(edge, {
      points: [
        section.startPoint,
        ...(section.bendPoints || []),
        section.endPoint,
      ],
      label: label
        ? {
            x: (label.x ?? 0) + (label.width ?? 0) / 2,
            y: (label.y ?? 0) + (label.height ?? 0) / 2,
          }
        : undefined,
      source: absolute(edge.source),
      target: absolute(edge.target),
    });
  });

  const depth = (node?: Node): number => {
    const parent = node && parentOf(node);
    return parent ? depth(nodesById.get(parent)) + 1 : 0;
  };

  return {
    // Parents must come before their children in the array for React Flow
    nodes: [...nodes]
      .sort((a, b) => depth(a) - depth(b))
      .map((node) => {
        const elkNode = laidOut.get(node.id);
        if (!elkNode) return node;
        return {
          ...node,
          origin: [0, 0] as [number, number],
          position: { x: elkNode.x ?? 0, y: elkNode.y ?? 0 },
          ...(groupIds.has(node.id) ||
          (GROUP_TYPES.has(node.type || "") &&
            typeof node.style?.width !== "number")
            ? {
                style: {
                  ...node.style,
                  width: elkNode.width,
                  height: elkNode.height,
                },
                // Re-measured at its new size
                measured: undefined,
              }
            : {}),
        };
      }),
    edges: edges.map((edge) => {
      const route = routes.get(edge);
      return route ? { ...edge, data: { ...edge.data, route } } : edge;
    }),
  };
};
