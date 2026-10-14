import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import { layoutWithElk, type EdgeRoute } from "./elk-layout";

const node = (id: string, extra: Partial<Node> = {}): Node => ({
  id,
  type: "services",
  position: { x: 0, y: 0 },
  data: {},
  ...extra,
});
const edge = (
  id: string,
  source: string,
  target: string,
  extra: Partial<Edge> = {},
): Edge => ({
  id,
  source,
  target,
  ...extra,
});
const routeOf = (e: Edge) => (e.data as { route: EdgeRoute }).route;

describe("layoutWithElk", () => {
  it("sizes groups to fit their children, returning parents before children", async () => {
    const { nodes } = await layoutWithElk({
      nodes: [
        node("child", { parentId: "group" }),
        node("group", { type: "system-group" }),
      ],
      edges: [],
    });
    const [group, child] = nodes;

    expect(nodes.map((n) => n.id)).toEqual(["group", "child"]);
    expect(group.measured).toBeUndefined();
    expect(Number(group.style!.width)).toBeGreaterThanOrEqual(
      child.position.x + 240,
    );
    expect(Number(group.style!.height)).toBeGreaterThanOrEqual(
      child.position.y + 110,
    );
    expect(child.origin).toEqual([0, 0]);
  });

  it("gives each edge its own connection point, unless they share a handle", async () => {
    const { edges } = await layoutWithElk({
      nodes: [node("A"), node("B")],
      edges: [
        edge("e1", "A", "B"),
        edge("e2", "A", "B"),
        edge("e3", "A", "B", { sourceHandle: "out" }),
        edge("e4", "A", "B", { sourceHandle: "out" }),
      ],
    });
    const start = (e: Edge) => JSON.stringify(routeOf(e).points[0]);

    expect(start(edges[0])).not.toEqual(start(edges[1]));
    expect(start(edges[2])).toEqual(start(edges[3]));
  });

  it("records where each edge's nodes were laid out, in the flow", async () => {
    const { nodes, edges } = await layoutWithElk({
      nodes: [
        node("group", { type: "system-group" }),
        node("A", { parentId: "group" }),
        node("B"),
      ],
      edges: [edge("e1", "A", "B")],
    });
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const group = byId.get("group")!.position;

    expect(routeOf(edges[0]).source).toEqual({
      x: group.x + byId.get("A")!.position.x,
      y: group.y + byId.get("A")!.position.y,
    });
    expect(routeOf(edges[0]).target).toEqual(byId.get("B")!.position);
  });

  it("leaves edges to nodes not in the graph as they are", async () => {
    const missing = edge("e1", "A", "missing");
    const { edges } = await layoutWithElk({
      nodes: [node("A")],
      edges: [missing],
    });

    expect(edges).toEqual([missing]);
  });

  it("routes edges from source to target, with their label on the route", async () => {
    const { nodes, edges } = await layoutWithElk({
      nodes: [node("A"), node("B")],
      edges: [
        edge("e1", "A", "B", {
          label: "publishes\nOrderPlaced",
          type: "animated",
        }),
      ],
    });
    const [a, b] = nodes;
    const { points, label } = routeOf(edges[0]);

    expect(edges[0].type).toBe("animated");
    expect(points[0].x).toBeCloseTo(a.position.x + 240);
    expect(points[points.length - 1].x).toBeCloseTo(b.position.x);
    expect(label!.x).toBeGreaterThan(points[0].x);
    expect(label!.x).toBeLessThan(points[points.length - 1].x);
  });

  it("lays out large graphs", async () => {
    const ids = Array.from({ length: 100 }, (_, i) => `n${i}`);
    const { nodes, edges } = await layoutWithElk({
      nodes: ids.map((id) => node(id)),
      edges: ids.slice(1).map((id, i) => edge(`e${i}`, ids[i], id)),
    });

    // A chain, laid out left to right
    nodes
      .slice(1)
      .forEach((n, i) =>
        expect(n.position.x).toBeGreaterThan(nodes[i].position.x),
      );
    edges.forEach((e) =>
      expect(routeOf(e).points.length).toBeGreaterThanOrEqual(2),
    );
  });
});
