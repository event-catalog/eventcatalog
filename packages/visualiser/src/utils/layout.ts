import { MarkerType, type Node, type Edge } from "@xyflow/react";
import type { GraphNode, GraphEdge } from "../types";
import { layoutWithElk } from "./elk-layout";

const EMPTY_GROUP_WIDTH = 200;
const EMPTY_GROUP_HEIGHT = 80;

const defaultSizes: Record<string, { width: number; height: number }> = {
  service: { width: 300, height: 140 },
  agent: { width: 300, height: 140 },
  "agent-tool": { width: 260, height: 120 },
  agentTool: { width: 260, height: 120 },
  event: { width: 240, height: 140 },
  command: { width: 300, height: 120 },
  query: { width: 300, height: 120 },
  channel: { width: 300, height: 140 },
  container: { width: 300, height: 140 },
  "data-product": { width: 300, height: 140 },
  data: { width: 320, height: 120 },
  domain: { width: 300, height: 120 },
  flow: { width: 300, height: 140 },
  actor: { width: 240, height: 100 },
  "external-system": { width: 300, height: 100 },
  step: { width: 280, height: 100 },
  "message-group": { width: 350, height: 200 },
  group: { width: EMPTY_GROUP_WIDTH, height: EMPTY_GROUP_HEIGHT },
};
const fallbackSize = { width: 280, height: 100 };

const getNodeSize = (node: Node) =>
  defaultSizes[node.type || ""] || fallbackSize;

export function buildNodeData(
  node: GraphNode,
  style?: string,
): Record<string, unknown> {
  const notes =
    (node.metadata.notes as Array<{
      content: string;
      author?: string;
      priority?: string;
    }>) || [];
  const owners = (node.metadata.owners as string[]) || [];
  const base = {
    name: node.label,
    version: (node.metadata.version as string) || "",
    summary: (node.metadata.summary as string) || "",
    deprecated: node.metadata.deprecated === true,
    draft: node.metadata.draft === true,
    ...(notes.length > 0 ? { notes } : {}),
    ...(owners.length > 0 ? { owners } : {}),
  };

  switch (node.type) {
    case "service":
      return { mode: "full", style, service: base };
    case "agent":
      return {
        mode: "full",
        style,
        agent: {
          ...base,
          ...(node.metadata.model ? { model: node.metadata.model } : {}),
          ...(Array.isArray(node.metadata.tools)
            ? { tools: node.metadata.tools }
            : {}),
        },
      };
    case "agent-tool":
    case "agentTool":
      return {
        mode: "full",
        style,
        agentTool: {
          id: node.id,
          name: node.label,
          type: (node.metadata.type as string) || "",
          icon: (node.metadata.icon as string) || "",
          url: (node.metadata.url as string) || "",
          description: (node.metadata.description as string) || "",
        },
      };
    case "event":
    case "command":
    case "query":
      return {
        mode: "full",
        style,
        message: {
          ...base,
          schema: (node.metadata.schema as string) || "",
          ...(node.metadata.method
            ? { method: node.metadata.method as string }
            : {}),
          ...(node.metadata.path ? { path: node.metadata.path as string } : {}),
          ...(Array.isArray(node.metadata.statusCodes) &&
          node.metadata.statusCodes.length > 0
            ? { statusCodes: node.metadata.statusCodes as number[] }
            : {}),
        },
      };
    case "channel":
      return {
        mode: "full",
        style,
        channel: {
          ...base,
          protocols: (node.metadata.protocols as string[]) || [],
          address: (node.metadata.address as string) || "",
          ...(node.metadata.deliveryGuarantee
            ? { deliveryGuarantee: node.metadata.deliveryGuarantee as string }
            : {}),
        },
      };
    case "container":
      return {
        mode: "full",
        style,
        data: {
          ...base,
          type: (node.metadata.containerType as string) || "Database",
        },
      };
    case "data-product":
      return { mode: "full", style, dataProduct: base };
    case "data":
      return {
        mode: "full",
        style,
        data: {
          ...base,
          type: (node.metadata.containerType as string) || "Database",
        },
      };
    case "domain":
      return {
        mode: "full",
        style,
        domain: { data: { ...base, id: node.id } },
      };
    case "flow":
      return {
        mode: "full",
        style,
        flow: { data: { ...base, id: node.id } },
      };
    case "actor":
      return { ...base, label: node.label, mode: "full", style, id: node.id };
    case "external-system":
      return {
        mode: "full",
        style,
        externalSystem: { label: node.label, ...base, id: node.id },
      };
    case "step":
      return {
        mode: "full",
        style,
        step: { ...base, title: node.label, id: node.id },
      };
    default:
      return { ...base, style, resourceType: node.type };
  }
}

/**
 * Lays a DSL graph out (left to right), as React Flow nodes and edges. Domains,
 * and nodes other nodes sit in, become groups sized to fit their children.
 */
export async function layoutGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  { style }: { style?: string } = {},
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  if (nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const groupIds = new Set(
    nodes
      .filter(
        (n) => n.type === "domain" || nodes.some((c) => c.parentId === n.id),
      )
      .map((n) => n.id),
  );

  const layoutNodes: Node[] = nodes.map((node) => {
    const parentId =
      node.parentId && node.parentId !== node.id && groupIds.has(node.parentId)
        ? node.parentId
        : undefined;
    const placement = {
      id: node.id,
      position: { x: 0, y: 0 },
      ...(parentId ? { parentId, extent: "parent" as const } : {}),
    };
    if (!groupIds.has(node.id)) {
      return {
        ...placement,
        type: node.type,
        data: buildNodeData(node, style),
      };
    }
    return {
      ...placement,
      type: "group",
      data: {
        mode: "full",
        domain: {
          name: node.label,
          version: (node.metadata.version as string) || "",
          summary: (node.metadata.summary as string) || "",
        },
      },
      // Groups with children are sized to fit them when laid out
      style: {
        width: EMPTY_GROUP_WIDTH,
        height: EMPTY_GROUP_HEIGHT,
        background: "transparent",
        border: "none",
        padding: 0,
      },
    };
  });

  const layoutEdges: Edge[] = edges
    .filter((edge) => !groupIds.has(edge.source) && !groupIds.has(edge.target))
    .map((edge) => {
      const collection = getMessageCollection(edge, nodeById);
      const isFlowStep = edge.type === "flow-step";
      const isCalls = edge.type === "calls";
      const isBidirectional = edge.type === "reads-writes";
      const arrowMarker = {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: "rgb(var(--ec-page-text-muted))",
      };
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: isBidirectional
          ? "reads/writes"
          : isFlowStep
            ? edge.label || undefined
            : edge.label || edge.type,
        type: isFlowStep ? "flow-edge" : isCalls ? "step" : "animated",
        markerEnd: arrowMarker,
        ...(isBidirectional ? { markerStart: arrowMarker } : {}),
        data: { edgeType: edge.type, message: { collection } },
      };
    });

  return layoutWithElk(
    { nodes: layoutNodes, edges: layoutEdges },
    { sizeOf: getNodeSize },
  );
}

const MESSAGE_TYPES = new Set(["event", "command", "query"]);

function getMessageCollection(
  edge: GraphEdge,
  nodeById: Map<string, GraphNode>,
): string | undefined {
  const targetNode = nodeById.get(edge.target);
  if (targetNode && MESSAGE_TYPES.has(targetNode.type)) {
    return `${targetNode.type}s`;
  }
  const sourceNode = nodeById.get(edge.source);
  if (sourceNode && MESSAGE_TYPES.has(sourceNode.type)) {
    return `${sourceNode.type}s`;
  }
  return targetNode ? `${targetNode.type}s` : undefined;
}
