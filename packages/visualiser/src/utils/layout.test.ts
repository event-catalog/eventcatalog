import { describe, expect, it } from "vitest";
import { layoutGraph } from "./layout";
import type { GraphNode } from "../types";

const node = (id: string, type: string, parentId?: string): GraphNode =>
  ({
    id,
    type,
    label: id,
    metadata: {},
    ...(parentId ? { parentId } : {}),
  }) as GraphNode;

describe("layoutGraph", () => {
  it("nests nodes in their domain, sized to fit them", async () => {
    const { nodes } = await layoutGraph(
      [
        node("Orders", "domain"),
        node("OrderService", "service", "Orders"),
        node("OrderPlaced", "event", "Orders"),
        node("Shipping", "domain"),
      ],
      [
        {
          id: "e1",
          source: "OrderService",
          target: "OrderPlaced",
          type: "sends",
        },
      ],
    );
    const byId = new Map(nodes.map((n) => [n.id, n]));

    expect(nodes[0]).toMatchObject({ id: "Orders", type: "group" });
    expect(byId.get("OrderService")).toMatchObject({
      parentId: "Orders",
      extent: "parent",
    });
    expect(Number(byId.get("Orders")!.style!.width)).toBeGreaterThan(
      byId.get("OrderPlaced")!.position.x,
    );
    // An empty domain still shows
    expect(byId.get("Shipping")).toMatchObject({
      type: "group",
      style: { width: 200, height: 80 },
    });
  });

  it("routes each edge, keeping its type", async () => {
    const { nodes, edges } = await layoutGraph(
      [node("OrderService", "service"), node("OrderPlaced", "event")],
      [
        {
          id: "e1",
          source: "OrderService",
          target: "OrderPlaced",
          type: "sends",
        },
      ],
    );

    expect(nodes[0].position.x).toBeLessThan(nodes[1].position.x);
    expect(edges[0]).toMatchObject({
      type: "animated",
      label: "sends",
      data: { edgeType: "sends", message: { collection: "events" } },
    });
    expect((edges[0].data as any).route.points.length).toBeGreaterThanOrEqual(
      2,
    );
  });
});
