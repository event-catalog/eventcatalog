import type { Edge, Node } from "@xyflow/react";
import { getNodeSize, layoutWithElk, type LayoutSize } from "./elk-layout";

/** The size a node is laid out at (by default, as last rendered or estimated) */
type SizeOf = (node: Node) => LayoutSize;

/** What a flow's swimlanes group its steps by */
export type SwimlaneGroupBy = "domain" | "system" | "team";
/** What a flow's steps can be grouped by: one of those, or domains with their systems in them */
export type FlowGroupBy = SwimlaneGroupBy | "domain-system";
/**
 * How the groups are shown: full-width lanes stacked top to bottom, or boxes
 * around their steps (like the pools of a process diagram), placed by the layout
 */
export type FlowGroupStyle = "lanes" | "boxes";

export const SWIMLANE_NODE_TYPE = "swimlane";

/** Every way a flow's steps can be grouped */
export const FLOW_GROUP_BYS: FlowGroupBy[] = [
  "domain",
  "system",
  "team",
  "domain-system",
];
export const isFlowGroupBy = (value: unknown): value is FlowGroupBy =>
  FLOW_GROUP_BYS.includes(value as FlowGroupBy);
export const isFlowGroupStyle = (value: unknown): value is FlowGroupStyle =>
  value === "lanes" || value === "boxes";

export const SWIMLANE_GROUP_BY_LABELS: Record<FlowGroupBy, string> = {
  domain: "Domain",
  system: "System",
  team: "Team",
  "domain-system": "Domain, then system",
};

/** The lanes a node's resource belongs to (`data.lanes`, set by the catalog) */
type NodeLanes = Partial<
  Record<SwimlaneGroupBy, { id: string; name: string }>
> & { external?: boolean };

export type SwimlaneNodeData = {
  label: string;
  /** How the graph is grouped */
  groupBy: FlowGroupBy;
  /** What this group is (a domain, a system or a team), for its colour and icon */
  level: SwimlaneGroupBy;
  style: FlowGroupStyle;
  /** The lane holds actors and external systems, or steps with no lane */
  kind: "lane" | "external" | "unassigned";
  /** Its place from the top, so neighbouring lanes can be told apart */
  index: number;
};

const EXTERNAL_LANE = "__external";
const UNASSIGNED_LANE = "__unassigned";

// Room on the left of each lane for its name, around its nodes, and between rows
export const LANE_HEADER_WIDTH = 96;
const LANE_PADDING = { x: 48, y: 48 };
const ROW_GAP = 32;
const COLUMN_GAP = 24;

// The lane's name runs down its header, next to an icon
export const LANE_LABEL = { fontSize: 20, iconSize: 20, gap: 10 };
// Room above and below the name, so it never touches the lane's edges
const LANE_LABEL_PADDING = 40;
// How long a name renders, roughly (bold, about 0.62em a character)
const labelLength = (label: string) =>
  LANE_LABEL.iconSize +
  LANE_LABEL.gap +
  label.length * LANE_LABEL.fontSize * 0.62;

const lanesOf = (node: Node) =>
  (node.data as { lanes?: NodeLanes } | undefined)?.lanes;

export const isSwimlaneNode = (node: Node) => node.type === SWIMLANE_NODE_TYPE;

/** Whether any of the nodes belong to a group when grouped this way */
export const hasSwimlanes = (nodes: Node[], groupBy: FlowGroupBy): boolean =>
  groupBy === "domain-system"
    ? hasSwimlanes(nodes, "domain") && hasSwimlanes(nodes, "system")
    : nodes.some((node) => !!lanesOf(node)?.[groupBy]);

/**
 * How many groups the nodes make when grouped this way (domains, for domains
 * with their systems in them). Actors, external systems and steps that only
 * take a neighbour's group aren't counted.
 */
export const countGroups = (nodes: Node[], groupBy: FlowGroupBy): number => {
  const level = groupBy === "domain-system" ? "domain" : groupBy;
  return new Set(
    nodes.map((node) => lanesOf(node)?.[level]?.id).filter(Boolean),
  ).size;
};

/**
 * Which lane each node goes in. Nodes whose resource belongs to a domain,
 * system or team (services, agents, data stores...) go in its lane; actors
 * and external systems in the external lane. Other nodes (messages, custom
 * steps, sub-flows) go in the lane of the step that leads to them, or, for
 * steps at the start of the flow, of the step they lead to. Resources that
 * don't belong to a group of this kind are in no lane.
 */
export const assignLanes = (
  nodes: Node[],
  edges: Edge[],
  groupBy: SwimlaneGroupBy,
) => {
  const laneOf = new Map<string, string>();
  const names = new Map<string, string>();
  nodes.forEach((node) => {
    const lanes = lanesOf(node);
    const lane = lanes?.[groupBy];
    if (lane) {
      laneOf.set(node.id, lane.id);
      names.set(lane.id, lane.name);
    } else if (lanes?.external) {
      laneOf.set(node.id, EXTERNAL_LANE);
    }
  });

  const ids = new Set(nodes.map((node) => node.id));
  // Steps for resources belong where the catalog says (or nowhere), never
  // where a neighbour does: a service with a domain but no system isn't in
  // the system of the step before it
  const ownLanes = new Set(
    nodes.filter((node) => lanesOf(node)).map((node) => node.id),
  );
  const links = edges.filter(
    (edge) => ids.has(edge.source) && ids.has(edge.target),
  );
  // Take the lane of a neighbour until nothing changes (a chain of messages
  // and custom steps takes as many passes as it's long)
  const inherit = (from: "source" | "target", to: "source" | "target") => {
    let changed = true;
    while (changed) {
      changed = false;
      links.forEach((edge) => {
        const lane = laneOf.get(edge[from]);
        if (lane && !laneOf.has(edge[to]) && !ownLanes.has(edge[to])) {
          laneOf.set(edge[to], lane);
          changed = true;
        }
      });
    }
  };
  inherit("source", "target");
  inherit("target", "source");
  nodes.forEach((node) => {
    if (!laneOf.has(node.id)) laneOf.set(node.id, UNASSIGNED_LANE);
  });

  return { laneOf, names };
};

type Box = { x: number; y: number; width: number; height: number };

/**
 * Lays a laid out flow out again in swimlanes: one full-width band per lane,
 * stacked top to bottom in the order the flow first reaches them (external
 * first, unassigned last). Nodes keep their place along the flow (x) and are
 * stacked in rows inside their lane where they'd overlap. Lanes are group
 * nodes their nodes are children of, so edges are drawn over them. Edges lose
 * the route the layout gave them, and are drawn as smooth steps instead.
 *
 * Only top level nodes are put in lanes (children of an expanded sub-flow stay
 * in it).
 */
export const layoutSwimlanes = (
  { nodes, edges }: { nodes: Node[]; edges: Edge[] },
  groupBy: SwimlaneGroupBy,
  { sizeOf = getNodeSize }: { sizeOf?: SizeOf } = {},
): { nodes: Node[]; edges: Edge[] } => {
  const topLevel = nodes.filter((node) => !node.parentId);
  if (topLevel.length === 0) return { nodes, edges };
  const { laneOf, names } = assignLanes(topLevel, edges, groupBy);

  const boxes = new Map<string, Box>(
    topLevel.map((node) => [node.id, { ...node.position, ...sizeOf(node) }]),
  );

  // Lanes in the order the flow reaches them, external first, unassigned last
  const order = (lane: string) =>
    lane === EXTERNAL_LANE
      ? -Infinity
      : lane === UNASSIGNED_LANE
        ? Infinity
        : Math.min(
            ...topLevel
              .filter((node) => laneOf.get(node.id) === lane)
              .map((node) => boxes.get(node.id)!.x),
          );
  const lanes = [...new Set(laneOf.values())].sort(
    (a, b) => order(a) - order(b),
  );

  const minX = Math.min(...[...boxes.values()].map((box) => box.x));
  const maxX = Math.max(...[...boxes.values()].map((box) => box.x + box.width));
  const laneX = minX - LANE_HEADER_WIDTH - LANE_PADDING.x;
  const laneWidth = maxX - laneX + LANE_PADDING.x;

  const laneNodes: Node[] = [];
  const positions = new Map<string, { x: number; y: number }>();
  let laneY = 0;
  lanes.forEach((lane, index) => {
    // Top to bottom as laid out, each in the first row it doesn't overlap
    const members = topLevel
      .filter((node) => laneOf.get(node.id) === lane)
      .sort((a, b) => boxes.get(a.id)!.y - boxes.get(b.id)!.y);
    const rows: { boxes: Box[]; height: number }[] = [];
    const rowOf = new Map<string, number>();
    members.forEach((node) => {
      const box = boxes.get(node.id)!;
      const overlaps = (other: Box) =>
        box.x < other.x + other.width + COLUMN_GAP &&
        other.x < box.x + box.width + COLUMN_GAP;
      let row = rows.findIndex((r) => !r.boxes.some(overlaps));
      if (row === -1) {
        rows.push({ boxes: [], height: 0 });
        row = rows.length - 1;
      }
      rows[row].boxes.push(box);
      rows[row].height = Math.max(rows[row].height, box.height);
      rowOf.set(node.id, row);
    });

    const label =
      lane === EXTERNAL_LANE
        ? "External"
        : lane === UNASSIGNED_LANE
          ? `No ${SWIMLANE_GROUP_BY_LABELS[groupBy].toLowerCase()}`
          : (names.get(lane) ?? lane);

    // Tall enough for its rows and for its name, with the rows centred
    const rowsHeight =
      rows.reduce((total, row) => total + row.height, 0) +
      ROW_GAP * (rows.length - 1);
    const laneHeight = Math.max(
      rowsHeight + LANE_PADDING.y * 2,
      labelLength(label) + LANE_LABEL_PADDING * 2,
    );
    const rowTops: number[] = [];
    let rowY = (laneHeight - rowsHeight) / 2;
    rows.forEach((row) => {
      rowTops.push(rowY);
      rowY += row.height + ROW_GAP;
    });

    const laneId = `swimlane-${lane}`;
    members.forEach((node) => {
      const box = boxes.get(node.id)!;
      const row = rowOf.get(node.id)!;
      positions.set(node.id, {
        x: box.x - laneX,
        // Centred in its row
        y: rowTops[row] + (rows[row].height - box.height) / 2,
      });
    });

    laneNodes.push({
      id: laneId,
      type: SWIMLANE_NODE_TYPE,
      position: { x: laneX, y: laneY },
      origin: [0, 0],
      style: { width: laneWidth, height: laneHeight },
      draggable: false,
      selectable: false,
      focusable: false,
      data: {
        label,
        groupBy,
        level: groupBy,
        style: "lanes",
        kind:
          lane === EXTERNAL_LANE
            ? "external"
            : lane === UNASSIGNED_LANE
              ? "unassigned"
              : "lane",
        index,
      } satisfies SwimlaneNodeData,
    });
    laneY += laneHeight;
  });

  return {
    // Lanes come before their nodes, as React Flow needs parents first
    nodes: [
      ...laneNodes,
      ...nodes.map((node) => {
        const position = positions.get(node.id);
        if (!position) return node;
        return {
          ...node,
          parentId: `swimlane-${laneOf.get(node.id)}`,
          origin: [0, 0] as [number, number],
          position,
        };
      }),
    ],
    edges: edges.map((edge) => {
      if (!(edge.data as { route?: unknown } | undefined)?.route) return edge;
      const { route: _route, ...data } = edge.data as Record<string, unknown>;
      return { ...edge, data };
    }),
  };
};

/** How a graph is grouped, if it is */
export const getGrouping = (
  nodes: Node[],
): { groupBy: FlowGroupBy; style: FlowGroupStyle } | null => {
  const data = nodes.find(isSwimlaneNode)?.data as SwimlaneNodeData | undefined;
  return data ? { groupBy: data.groupBy, style: data.style } : null;
};

/**
 * Takes a graph out of its groups (lanes or boxes): the groups go, and their
 * nodes stay where they are (their positions no longer relative to their
 * group). For laying a grouped graph out again, which lays it out without them.
 */
export const removeSwimlanes = ({
  nodes,
  edges,
}: {
  nodes: Node[];
  edges: Edge[];
}): { nodes: Node[]; edges: Edge[] } => {
  const groups = new Map(
    nodes.filter(isSwimlaneNode).map((group) => [group.id, group]),
  );
  if (groups.size === 0) return { nodes, edges };
  // Where a group is in the flow (groups can be in groups)
  const offset = (id: string | undefined): { x: number; y: number } => {
    const group = id ? groups.get(id) : undefined;
    if (!group) return { x: 0, y: 0 };
    const parent = offset(group.parentId);
    return { x: parent.x + group.position.x, y: parent.y + group.position.y };
  };
  return {
    nodes: nodes
      .filter((node) => !groups.has(node.id))
      .map((node) => {
        if (!node.parentId || !groups.has(node.parentId)) return node;
        const { parentId, ...rest } = node;
        const at = offset(parentId);
        return {
          ...rest,
          position: { x: at.x + node.position.x, y: at.y + node.position.y },
        };
      }),
    edges,
  };
};

// Room around the steps in a box, and on its left for its name
const BOX_PADDING = 40;

/**
 * Groups a flow's steps into boxes, one per domain, system or team (for
 * domains with their systems, a box per system inside its domain's box), and
 * lays the flow out again with them, so edges are routed around the boxes.
 * Steps go in the same group as they would in lanes; steps in no group stay
 * outside the boxes. Boxes are at least as tall as their name.
 *
 * Only top level nodes are put in boxes (children of an expanded sub-flow stay
 * in it).
 */
export const groupIntoBoxes = async (
  { nodes, edges }: { nodes: Node[]; edges: Edge[] },
  groupBy: FlowGroupBy,
  { sizeOf = getNodeSize }: { sizeOf?: SizeOf } = {},
): Promise<{ nodes: Node[]; edges: Edge[] }> => {
  const topLevel = nodes.filter((node) => !node.parentId);
  const levels: SwimlaneGroupBy[] =
    groupBy === "domain-system" ? ["domain", "system"] : [groupBy];
  const assignments = levels.map((level) =>
    assignLanes(topLevel, edges, level),
  );

  const groups = new Map<string, Node>();
  const parentOf = new Map<string, string>();
  topLevel.forEach((node) => {
    let parentId: string | undefined;
    assignments.forEach(({ laneOf, names }, depth) => {
      const lane = laneOf.get(node.id)!;
      // External steps have one box, whatever they're grouped by
      if (lane === UNASSIGNED_LANE || (depth > 0 && lane === EXTERNAL_LANE))
        return;
      const level = levels[depth];
      const id = `${parentId ?? "swimlane"}__${level}-${lane}`;
      if (!groups.has(id)) {
        const label =
          lane === EXTERNAL_LANE ? "External" : (names.get(lane) ?? lane);
        const minHeight = labelLength(label) + LANE_LABEL_PADDING * 2;
        groups.set(id, {
          id,
          type: SWIMLANE_NODE_TYPE,
          ...(parentId && { parentId }),
          position: { x: 0, y: 0 },
          selectable: false,
          focusable: false,
          data: {
            label,
            groupBy,
            level,
            style: "boxes",
            kind: lane === EXTERNAL_LANE ? "external" : "lane",
            index: groups.size,
            // Room for its name on the left, and at least as tall as it
            layoutOptions: {
              "elk.padding": `[top=${BOX_PADDING},left=${LANE_HEADER_WIDTH + BOX_PADDING},bottom=${BOX_PADDING},right=${BOX_PADDING}]`,
              "elk.nodeSize.constraints": "MINIMUM_SIZE",
              "elk.nodeSize.minimum": `(0, ${Math.ceil(minHeight)})`,
            },
          } satisfies SwimlaneNodeData & { layoutOptions: object },
        });
      }
      parentId = id;
    });
    if (parentId) parentOf.set(node.id, parentId);
  });

  return layoutWithElk(
    {
      nodes: [
        ...groups.values(),
        ...nodes.map((node) => {
          const parentId = parentOf.get(node.id);
          return parentId ? { ...node, parentId } : node;
        }),
      ],
      edges,
    },
    { sizeOf },
  );
};
