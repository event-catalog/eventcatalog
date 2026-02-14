import dagre from "dagre";
import { MarkerType, type Node, type Edge } from "@xyflow/react";
import type { GraphNode, GraphEdge } from "../types";

const GROUP_HEADER_HEIGHT = 44;
const GROUP_CONTENT_PADDING = 50;
const GROUP_PADDING_X = 60;

const EMPTY_GROUP_WIDTH = 200;
const EMPTY_GROUP_HEIGHT = 80;

const defaultSizes: Record<string, { w: number; h: number }> = {
  service: { w: 300, h: 140 },
  event: { w: 240, h: 140 },
  command: { w: 300, h: 100 },
  query: { w: 300, h: 100 },
  channel: { w: 300, h: 140 },
  container: { w: 300, h: 140 },
  "data-product": { w: 300, h: 140 },
  data: { w: 320, h: 120 },
  domain: { w: 300, h: 120 },
  flow: { w: 300, h: 140 },
  actor: { w: 240, h: 100 },
  "external-system": { w: 300, h: 100 },
  step: { w: 280, h: 100 },
};
const fallbackSize = { w: 280, h: 100 };

export function getNodeSize(
  type: string,
  nodeWidth?: number,
  nodeHeight?: number,
) {
  const size = defaultSizes[type] || fallbackSize;
  return { w: nodeWidth ?? size.w, h: nodeHeight ?? size.h };
}

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
    case "event":
    case "command":
    case "query":
      return {
        mode: "full",
        style,
        message: {
          ...base,
          schema: (node.metadata.schema as string) || "",
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

export function layoutGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: {
    rankdir?: string;
    nodesep?: number;
    ranksep?: number;
  } = {},
  style?: string,
): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const { rankdir = "LR", nodesep = 60, ranksep = 120 } = options;

  function nodeSize(type: string) {
    return getNodeSize(type);
  }

  // All domain nodes become groups
  const domainNodeIds = new Set(
    nodes.filter((n) => n.type === "domain").map((n) => n.id),
  );

  const parentNodeIds = new Set(
    nodes.filter((n) => n.parentId).map((n) => n.parentId!),
  );

  const allGroupIds = new Set([...domainNodeIds, ...parentNodeIds]);

  const childNodeIds = new Set<string>();
  for (const node of nodes) {
    if (node.parentId && allGroupIds.has(node.parentId)) {
      childNodeIds.add(node.id);
    }
  }

  // If no groups, use flat layout
  if (allGroupIds.size === 0) {
    return flatLayout(
      nodes,
      edges,
      { rankdir, nodesep, ranksep },
      nodeSize,
      style,
    );
  }

  // Grouped layout
  const groupChildren = new Map<string, GraphNode[]>();
  for (const id of allGroupIds) {
    groupChildren.set(id, []);
  }
  for (const node of nodes) {
    if (node.parentId && allGroupIds.has(node.parentId)) {
      groupChildren.get(node.parentId)!.push(node);
    }
  }

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const groupSizes = new Map<string, { width: number; height: number }>();
  const groupInternalLayouts = new Map<
    string,
    {
      childPositions: Map<
        string,
        { x: number; y: number; w: number; h: number }
      >;
      width: number;
      height: number;
    }
  >();

  function computeGroupSize(groupId: string): {
    width: number;
    height: number;
  } {
    if (groupSizes.has(groupId)) return groupSizes.get(groupId)!;

    const children = groupChildren.get(groupId) || [];

    if (children.length === 0) {
      const size = { width: EMPTY_GROUP_WIDTH, height: EMPTY_GROUP_HEIGHT };
      groupSizes.set(groupId, size);
      groupInternalLayouts.set(groupId, {
        childPositions: new Map(),
        width: size.width,
        height: size.height,
      });
      return size;
    }

    for (const child of children) {
      if (allGroupIds.has(child.id)) {
        computeGroupSize(child.id);
      }
    }

    const ig = new dagre.graphlib.Graph();
    ig.setDefaultEdgeLabel(() => ({}));
    ig.setGraph({
      rankdir,
      nodesep: Math.max(nodesep, 80),
      ranksep: Math.max(ranksep, 100),
    });

    for (const child of children) {
      if (allGroupIds.has(child.id)) {
        const childSize = groupSizes.get(child.id)!;
        ig.setNode(child.id, {
          width: childSize.width,
          height: childSize.height,
        });
      } else {
        const s = nodeSize(child.type);
        ig.setNode(child.id, { width: s.w, height: s.h });
      }
    }

    const childIdSet = new Set(children.map((c) => c.id));
    for (const edge of edges) {
      if (childIdSet.has(edge.source) && childIdSet.has(edge.target)) {
        ig.setEdge(edge.source, edge.target);
      }
    }

    dagre.layout(ig);

    const childPositions = new Map<
      string,
      { x: number; y: number; w: number; h: number }
    >();
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    for (const child of children) {
      const pos = ig.node(child.id);
      if (!pos) continue;
      const left = pos.x - pos.width / 2;
      const top = pos.y - pos.height / 2;
      const right = pos.x + pos.width / 2;
      const bottom = pos.y + pos.height / 2;
      childPositions.set(child.id, {
        x: left,
        y: top,
        w: pos.width,
        h: pos.height,
      });
      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
      maxX = Math.max(maxX, right);
      maxY = Math.max(maxY, bottom);
    }

    const contentH = maxY - minY;
    const totalW = maxX - minX + GROUP_PADDING_X * 2;
    const totalH = GROUP_HEADER_HEIGHT + GROUP_CONTENT_PADDING * 2 + contentH;
    const contentTop = GROUP_HEADER_HEIGHT + GROUP_CONTENT_PADDING;

    for (const [id, pos] of childPositions) {
      childPositions.set(id, {
        x: pos.x - minX + GROUP_PADDING_X,
        y: pos.y - minY + contentTop,
        w: pos.w,
        h: pos.h,
      });
    }

    groupSizes.set(groupId, { width: totalW, height: totalH });
    groupInternalLayouts.set(groupId, {
      childPositions,
      width: totalW,
      height: totalH,
    });
    return { width: totalW, height: totalH };
  }

  for (const groupId of allGroupIds) {
    computeGroupSize(groupId);
  }

  const topLevelGroupIds = new Set<string>();
  for (const groupId of allGroupIds) {
    const node = nodeById.get(groupId);
    if (!node?.parentId || !allGroupIds.has(node.parentId)) {
      topLevelGroupIds.add(groupId);
    }
  }

  const outerG = new dagre.graphlib.Graph();
  outerG.setDefaultEdgeLabel(() => ({}));
  outerG.setGraph({ rankdir, nodesep, ranksep });

  for (const groupId of topLevelGroupIds) {
    const size = groupSizes.get(groupId)!;
    outerG.setNode(groupId, { width: size.width, height: size.height });
  }

  for (const node of nodes) {
    if (allGroupIds.has(node.id) || childNodeIds.has(node.id)) continue;
    const s = nodeSize(node.type);
    outerG.setNode(node.id, { width: s.w, height: s.h });
  }

  const outerEdgeSet = new Set<string>();
  for (const edge of edges) {
    const srcIsChild = childNodeIds.has(edge.source);
    const tgtIsChild = childNodeIds.has(edge.target);
    const srcIsGroup = allGroupIds.has(edge.source);
    const tgtIsGroup = allGroupIds.has(edge.target);

    if (srcIsChild && tgtIsChild) continue;
    if (srcIsGroup || tgtIsGroup) continue;

    let src = edge.source;
    let tgt = edge.target;

    if (srcIsChild) {
      let parent = nodeById.get(edge.source)?.parentId;
      while (parent && !topLevelGroupIds.has(parent)) {
        parent = nodeById.get(parent)?.parentId;
      }
      if (parent) src = parent;
    }
    if (tgtIsChild) {
      let parent = nodeById.get(edge.target)?.parentId;
      while (parent && !topLevelGroupIds.has(parent)) {
        parent = nodeById.get(parent)?.parentId;
      }
      if (parent) tgt = parent;
    }

    const key = `${src}->${tgt}`;
    if (!outerEdgeSet.has(key)) {
      outerEdgeSet.add(key);
      outerG.setEdge(src, tgt);
    }
  }

  dagre.layout(outerG);

  const outerPositions = new Map<
    string,
    { x: number; y: number; width: number; height: number }
  >();
  outerG.nodes().forEach((id: string) => {
    const pos = outerG.node(id);
    if (pos) {
      outerPositions.set(id, {
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height,
      });
    }
  });

  const layoutNodes: Node[] = [];

  function emitGroup(groupId: string, parentGroupId?: string) {
    const node = nodeById.get(groupId);
    if (!node) return;

    const layout = groupInternalLayouts.get(groupId);
    if (!layout) return;

    const base = {
      name: node.label,
      version: (node.metadata.version as string) || "",
      summary: (node.metadata.summary as string) || "",
    };

    if (parentGroupId) {
      const parentLayout = groupInternalLayouts.get(parentGroupId);
      const childPos = parentLayout?.childPositions.get(groupId);
      if (!childPos) return;

      layoutNodes.push({
        id: groupId,
        type: "group",
        position: { x: childPos.x, y: childPos.y },
        parentId: parentGroupId,
        extent: "parent",
        data: { mode: "full", domain: base },
        style: {
          width: layout.width,
          height: layout.height,
          background: "transparent",
          border: "none",
          padding: 0,
        },
      });
    } else {
      const outerPos = outerPositions.get(groupId);
      if (!outerPos) return;

      layoutNodes.push({
        id: groupId,
        type: "group",
        position: {
          x: outerPos.x - outerPos.width / 2,
          y: outerPos.y - outerPos.height / 2,
        },
        data: { mode: "full", domain: base },
        style: {
          width: layout.width,
          height: layout.height,
          background: "transparent",
          border: "none",
          padding: 0,
        },
      });
    }

    const children = groupChildren.get(groupId) || [];
    for (const child of children) {
      if (allGroupIds.has(child.id)) {
        emitGroup(child.id, groupId);
      }
    }
    for (const child of children) {
      if (allGroupIds.has(child.id)) continue;
      const childPos = layout.childPositions.get(child.id);
      if (!childPos) continue;

      layoutNodes.push({
        id: child.id,
        type: child.type,
        position: { x: childPos.x, y: childPos.y },
        parentId: groupId,
        extent: "parent",
        data: buildNodeData(child, style),
      });
    }
  }

  for (const groupId of topLevelGroupIds) {
    emitGroup(groupId);
  }

  for (const node of nodes) {
    if (allGroupIds.has(node.id) || childNodeIds.has(node.id)) continue;
    const pos = outerPositions.get(node.id);
    if (!pos) continue;

    layoutNodes.push({
      id: node.id,
      type: node.type,
      position: { x: pos.x - pos.width / 2, y: pos.y - pos.height / 2 },
      data: buildNodeData(node, style),
    });
  }

  const layoutEdges: Edge[] = edges
    .filter(
      (edge) => !allGroupIds.has(edge.source) && !allGroupIds.has(edge.target),
    )
    .map((edge) => {
      const collection = getMessageCollection(edge, nodeById);
      const isFlowStep = edge.type === "flow-step";
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: isFlowStep ? edge.label || undefined : edge.label || edge.type,
        type: isFlowStep ? "flow-edge" : "animated",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: "rgb(var(--ec-page-text-muted))",
        },
        data: { edgeType: edge.type, message: { collection } },
      };
    });

  return { nodes: layoutNodes, edges: layoutEdges };
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

function flatLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  graphOpts: { rankdir: string; nodesep: number; ranksep: number },
  nodeSize: (type: string) => { w: number; h: number },
  style?: string,
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph(graphOpts);

  nodes.forEach((node) => {
    const s = nodeSize(node.type);
    g.setNode(node.id, { width: s.w, height: s.h });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutNodes: Node[] = nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      id: node.id,
      type: node.type,
      position: { x: pos.x - pos.width / 2, y: pos.y - pos.height / 2 },
      data: buildNodeData(node, style),
    };
  });

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const layoutEdges: Edge[] = edges.map((edge) => {
    const collection = getMessageCollection(edge, nodeById);
    const isFlowStep = edge.type === "flow-step";
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: isFlowStep ? edge.label || undefined : edge.label || edge.type,
      type: isFlowStep ? "flow-edge" : "animated",
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: "rgb(var(--ec-page-text-muted))",
      },
      data: { edgeType: edge.type, message: { collection } },
    };
  });

  return { nodes: layoutNodes, edges: layoutEdges };
}
