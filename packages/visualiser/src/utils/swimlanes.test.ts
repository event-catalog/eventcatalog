import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import {
  assignLanes,
  countGroups,
  getGrouping,
  groupIntoBoxes,
  hasSwimlanes,
  layoutSwimlanes,
  removeSwimlanes,
  SWIMLANE_NODE_TYPE,
} from "./swimlanes";

const node = (
  id: string,
  x: number,
  lanes?: Record<string, unknown>,
  y = 0,
): Node => ({
  id,
  type: "services",
  position: { x, y },
  width: 200,
  height: 100,
  data: lanes ? { lanes } : {},
});
const edge = (source: string, target: string): Edge => ({
  id: `${source}-${target}`,
  source,
  target,
  type: "flow-edge",
  data: { route: { points: [] } },
});

const ordering = { id: "ordering", name: "Ordering" };
const payments = { id: "payments", name: "Payments" };

// actor -> command -> checkout (Ordering) -> event -> payment (Payments)
const flow = {
  nodes: [
    node("actor", 0, { external: true }),
    node("command", 300),
    node("checkout", 600, { domain: ordering }),
    node("event", 900),
    node("payment", 1200, { domain: payments }),
  ],
  edges: [
    edge("actor", "command"),
    edge("command", "checkout"),
    edge("checkout", "event"),
    edge("event", "payment"),
  ],
};

describe("hasSwimlanes", () => {
  it("is true only when a node belongs to a lane of that kind", () => {
    expect(hasSwimlanes(flow.nodes, "domain")).toBe(true);
    expect(hasSwimlanes(flow.nodes, "team")).toBe(false);
  });
});

describe("countGroups", () => {
  it("counts the different domains, systems or teams the steps belong to", () => {
    const nodes = [...flow.nodes, node("refund", 1500, { domain: payments })];
    expect(countGroups(nodes, "domain")).toBe(2);
    expect(countGroups(nodes, "team")).toBe(0);
  });

  it("counts the domains when grouping by domains with their systems in them", () => {
    const nodes = [
      node("checkout", 0, { domain: ordering, system: { id: "a", name: "A" } }),
      node("basket", 300, { domain: ordering, system: { id: "b", name: "B" } }),
    ];
    expect(countGroups(nodes, "domain-system")).toBe(1);
  });
});

describe("assignLanes", () => {
  it("puts resources in their own lane and actors in the external lane", () => {
    const { laneOf } = assignLanes(flow.nodes, flow.edges, "domain");
    expect(laneOf.get("checkout")).toBe("ordering");
    expect(laneOf.get("payment")).toBe("payments");
    expect(laneOf.get("actor")).toBe("__external");
  });

  it("puts a message in the lane of the step that leads to it", () => {
    const { laneOf } = assignLanes(flow.nodes, flow.edges, "domain");
    expect(laneOf.get("event")).toBe("ordering");
    expect(laneOf.get("command")).toBe("__external");
  });

  it("puts a step at the start of the flow in the lane of the step it leads to", () => {
    const nodes = [
      node("start", 0),
      node("checkout", 300, { domain: ordering }),
    ];
    const { laneOf } = assignLanes(
      nodes,
      [edge("start", "checkout")],
      "domain",
    );
    expect(laneOf.get("start")).toBe("ordering");
  });

  it("never puts a resource in a neighbour's lane", () => {
    const nodes = [
      node("checkout", 0, { domain: ordering, team: { id: "t", name: "T" } }),
      node("payment", 300, { domain: payments }),
    ];
    const { laneOf } = assignLanes(
      nodes,
      [edge("checkout", "payment")],
      "team",
    );
    expect(laneOf.get("payment")).toBe("__unassigned");
  });

  it("puts steps with no lane anywhere around them in the unassigned lane", () => {
    const { laneOf } = assignLanes([node("alone", 0)], [], "domain");
    expect(laneOf.get("alone")).toBe("__unassigned");
  });
});

describe("layoutSwimlanes", () => {
  const laidOut = layoutSwimlanes(flow, "domain");
  const lanes = laidOut.nodes.filter((n) => n.type === SWIMLANE_NODE_TYPE);

  it("adds one lane per group, external first, then in the order the flow reaches them", () => {
    expect(lanes.map((lane) => (lane.data as any).label)).toEqual([
      "External",
      "Ordering",
      "Payments",
    ]);
  });

  it("stacks the lanes top to bottom at the same width", () => {
    const [first, second] = lanes;
    expect(second.position.y).toBe(
      first.position.y + (first.style!.height as number),
    );
    expect(new Set(lanes.map((lane) => lane.style!.width)).size).toBe(1);
  });

  it("lists lanes before the nodes in them and makes each node a child of its lane", () => {
    const checkout = laidOut.nodes.find((n) => n.id === "checkout")!;
    expect(checkout.parentId).toBe("swimlane-ordering");
    const laneIndex = laidOut.nodes.findIndex(
      (n) => n.id === "swimlane-ordering",
    );
    expect(laneIndex).toBeLessThan(laidOut.nodes.indexOf(checkout));
  });

  it("keeps each node's place along the flow", () => {
    const x = (id: string) => {
      const n = laidOut.nodes.find((other) => other.id === id)!;
      const lane = laidOut.nodes.find((other) => other.id === n.parentId)!;
      return lane.position.x + n.position.x;
    };
    expect(x("checkout") - x("command")).toBe(300);
    expect(x("payment") - x("event")).toBe(300);
  });

  it("stacks nodes in the same lane into rows where they would overlap", () => {
    const nodes = [
      node("a", 0, { domain: ordering }, 0),
      node("b", 0, { domain: ordering }, 300),
    ];
    const result = layoutSwimlanes({ nodes, edges: [] }, "domain");
    const [a, b] = ["a", "b"].map(
      (id) => result.nodes.find((n) => n.id === id)!,
    );
    expect(b.position.y).toBeGreaterThanOrEqual(a.position.y + 100);
  });

  it("drops the edge routes of the layout without lanes", () => {
    expect(laidOut.edges.every((e) => !(e.data as any)?.route)).toBe(true);
  });

  it("leaves children of expanded sub-flows where they are in their sub-flow", () => {
    const child = { ...node("child", 20), parentId: "checkout" };
    const result = layoutSwimlanes(
      { nodes: [...flow.nodes, child], edges: flow.edges },
      "domain",
    );
    expect(result.nodes.find((n) => n.id === "child")).toBe(child);
  });
});

describe("removeSwimlanes", () => {
  const laned = layoutSwimlanes(flow, "domain");
  const unlaned = removeSwimlanes(laned);

  it("removes the lanes and takes their nodes out of them", () => {
    expect(unlaned.nodes.map((n) => n.id)).toEqual(flow.nodes.map((n) => n.id));
    expect(unlaned.nodes.every((n) => !n.parentId)).toBe(true);
    expect(getGrouping(unlaned.nodes)).toBeNull();
  });

  it("keeps each node where it's shown", () => {
    const checkout = laned.nodes.find((n) => n.id === "checkout")!;
    const lane = laned.nodes.find((n) => n.id === checkout.parentId)!;
    expect(unlaned.nodes.find((n) => n.id === "checkout")!.position).toEqual({
      x: lane.position.x + checkout.position.x,
      y: lane.position.y + checkout.position.y,
    });
  });

  it("can put the graph in lanes again, grouped another way", () => {
    expect(getGrouping(laned.nodes)).toEqual({
      groupBy: "domain",
      style: "lanes",
    });
    const regrouped = layoutSwimlanes(unlaned, "domain");
    expect(
      regrouped.nodes.filter((n) => n.type === SWIMLANE_NODE_TYPE),
    ).toHaveLength(3);
  });
});

describe("lane height", () => {
  it("is tall enough for a long lane name", () => {
    const nodes = [
      node("a", 0, {
        team: { id: "t", name: "A Team With A Very Long Name Indeed" },
      }),
    ];
    const lane = layoutSwimlanes({ nodes, edges: [] }, "team").nodes[0];
    expect(lane.style!.height as number).toBeGreaterThan(400);
  });
});

describe("groupIntoBoxes", () => {
  const checkoutSystem = { id: "checkout", name: "Checkout System" };
  // actor -> command -> checkout (Ordering, Checkout System) -> event -> payment (Payments)
  const nested = {
    nodes: [
      node("actor", 0, { external: true }),
      node("command", 300),
      node("checkout", 600, { domain: ordering, system: checkoutSystem }),
      node("event", 900),
      node("payment", 1200, { domain: payments }),
    ],
    edges: flow.edges,
  };

  it("puts each node in a box for its group, and lays the flow out with them", async () => {
    const boxed = await groupIntoBoxes(flow, "domain");
    const boxes = boxed.nodes.filter((n) => n.type === SWIMLANE_NODE_TYPE);
    expect(boxes.map((box) => (box.data as any).label).sort()).toEqual([
      "External",
      "Ordering",
      "Payments",
    ]);
    const checkout = boxed.nodes.find((n) => n.id === "checkout")!;
    expect(
      (boxed.nodes.find((n) => n.id === checkout.parentId)!.data as any).label,
    ).toBe("Ordering");
    expect(getGrouping(boxed.nodes)).toEqual({
      groupBy: "domain",
      style: "boxes",
    });
    // Laid out again, so edges are routed around the boxes
    expect(boxed.edges.every((e) => !!(e.data as any)?.route)).toBe(true);
  });

  it("puts systems in their domain's box when grouping by domain and system", async () => {
    const boxed = await groupIntoBoxes(nested, "domain-system");
    const byId = new Map(boxed.nodes.map((n) => [n.id, n]));
    const system = byId.get(byId.get("checkout")!.parentId!)!;
    expect((system.data as any).label).toBe("Checkout System");
    expect((byId.get(system.parentId!)!.data as any).label).toBe("Ordering");
    // A domain step with no system sits in its domain's box
    const payment = byId.get("payment")!;
    expect((byId.get(payment.parentId!)!.data as any).label).toBe("Payments");
  });

  it("makes a box at least as tall as its name", async () => {
    const boxed = await groupIntoBoxes(
      {
        nodes: [
          node("a", 0, {
            team: { id: "t", name: "A Team With A Very Long Name Indeed" },
          }),
        ],
        edges: [],
      },
      "team",
    );
    const box = boxed.nodes.find((n) => n.type === SWIMLANE_NODE_TYPE)!;
    expect(box.style!.height as number).toBeGreaterThan(400);
  });

  it("can be taken out of its boxes, nested or not", async () => {
    const boxed = await groupIntoBoxes(nested, "domain-system");
    const unboxed = removeSwimlanes(boxed);
    expect(unboxed.nodes.map((n) => n.id).sort()).toEqual(
      nested.nodes.map((n) => n.id).sort(),
    );
    expect(unboxed.nodes.every((n) => !n.parentId)).toBe(true);
  });
});

describe("group sizes", () => {
  it("fits boxes around nodes as they render, not as estimated", async () => {
    const actor = { ...node("actor", 0, { external: true }), type: "actor" };
    const sizeOf = () => ({ width: 500, height: 150 });
    const boxed = await groupIntoBoxes(
      { nodes: [actor], edges: [] },
      "domain",
      { sizeOf },
    );
    const box = boxed.nodes.find((n) => n.type === SWIMLANE_NODE_TYPE)!;
    const child = boxed.nodes.find((n) => n.id === "actor")!;
    expect(box.style!.width as number).toBeGreaterThanOrEqual(
      child.position.x + 500,
    );
  });
});
