import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import { hideMessageNodes, hideNodes } from "./hide-messages";

const node = (id: string, type: string, name?: string): Node => ({
  id,
  type,
  position: { x: 0, y: 0 },
  data: name ? { message: { id, name } } : {},
});

const edge = (source: string, target: string): Edge => ({
  id: `${source}-${target}`,
  source,
  target,
});

describe("hideMessageNodes", () => {
  it("removes message nodes and connects producers directly to consumers", () => {
    const { nodes, edges } = hideMessageNodes(
      [
        node("OrderService", "services"),
        node("OrderPlaced", "events", "Order Placed"),
        node("PaymentService", "services"),
      ],
      [
        edge("OrderService", "OrderPlaced"),
        edge("OrderPlaced", "PaymentService"),
      ],
    );

    expect(nodes.map((n) => n.id)).toEqual(["OrderService", "PaymentService"]);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      source: "OrderService",
      target: "PaymentService",
      label: "publishes\nOrder Placed",
    });
  });

  it("removes channels and follows routed channels to the consumer", () => {
    const { nodes, edges } = hideMessageNodes(
      [
        node("ProductPublisher", "services"),
        node("ProductCreated", "events", "Product Created"),
        node("product-events", "channels"),
        node("search-product-events", "channels"),
        node("search-indexer-queue", "channels"),
        node("SearchIndexer", "services"),
      ],
      [
        edge("ProductPublisher", "ProductCreated"),
        edge("ProductCreated", "product-events"),
        edge("product-events", "search-product-events"),
        edge("search-product-events", "search-indexer-queue"),
        edge("search-indexer-queue", "SearchIndexer"),
      ],
    );

    expect(nodes.map((n) => n.id)).toEqual([
      "ProductPublisher",
      "SearchIndexer",
    ]);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      source: "ProductPublisher",
      target: "SearchIndexer",
      label: "publishes\nProduct Created",
    });
  });

  it("merges multiple messages between the same nodes into one edge", () => {
    const { edges } = hideMessageNodes(
      [
        node("OrderService", "services"),
        node("OrderPlaced", "events", "Order Placed"),
        node("GetPayment", "queries", "Get Payment"),
        node("PaymentService", "services"),
      ],
      [
        edge("OrderService", "OrderPlaced"),
        edge("OrderPlaced", "PaymentService"),
        edge("OrderService", "GetPayment"),
        edge("GetPayment", "PaymentService"),
      ],
    );

    expect(edges).toHaveLength(1);
    expect(edges[0].label).toBe("sends\n2 messages");
  });

  it("labels the edge with the type of messages sent", () => {
    const { edges } = hideMessageNodes(
      [
        node("OrderService", "services"),
        node("CreatePayment", "commands", "Create Payment"),
        node("RefundPayment", "commands", "Refund Payment"),
        node("PaymentService", "services"),
      ],
      [
        edge("OrderService", "CreatePayment"),
        edge("CreatePayment", "PaymentService"),
        edge("OrderService", "RefundPayment"),
        edge("RefundPayment", "PaymentService"),
      ],
    );

    expect(edges[0].label).toBe("invokes\n2 commands");
  });

  it("drops messages that have no consumers", () => {
    const { nodes, edges } = hideMessageNodes(
      [
        node("OrderService", "services"),
        node("OrderPlaced", "events", "Order Placed"),
      ],
      [edge("OrderService", "OrderPlaced")],
    );

    expect(nodes.map((n) => n.id)).toEqual(["OrderService"]);
    expect(edges).toEqual([]);
  });

  it("returns the graph untouched when there are no messages", () => {
    const nodes = [node("OrderService", "services")];
    const edges: Edge[] = [];
    const result = hideMessageNodes(nodes, edges);

    expect(result.nodes).toBe(nodes);
    expect(result.edges).toBe(edges);
  });
});

describe("hideNodes", () => {
  const graph = {
    nodes: [
      node("OrderService", "services"),
      node("OrderPlaced", "events", "Order Placed"),
      node("PaymentService", "services"),
      node("OrderDatabase", "data"),
    ],
    edges: [
      {
        ...edge("OrderService", "OrderPlaced"),
        data: {
          route: {
            points: [
              { x: 100, y: 50 },
              { x: 200, y: 50 },
            ],
            source: { x: 0, y: 0 },
          },
        },
      },
      {
        ...edge("OrderPlaced", "PaymentService"),
        data: {
          route: {
            points: [
              { x: 300, y: 60 },
              { x: 400, y: 60 },
            ],
            target: { x: 400, y: 0 },
          },
        },
      },
      edge("OrderService", "OrderDatabase"),
    ],
  };

  it("keeps the nodes either side of hidden messages connected, along their routes", () => {
    const { nodes, edges } = hideNodes(
      graph.nodes,
      graph.edges,
      (n) => n.type === "events",
    );

    expect(nodes.map((n) => n.id)).not.toContain("OrderPlaced");
    expect(edges.find((e) => e.target === "PaymentService")).toMatchObject({
      source: "OrderService",
      label: "publishes\nOrder Placed",
      data: {
        route: {
          points: [
            { x: 100, y: 50 },
            { x: 200, y: 50 },
            { x: 300, y: 60 },
            { x: 400, y: 60 },
          ],
          // Where the message was
          label: { x: 250, y: 55 },
          source: { x: 0, y: 0 },
          target: { x: 400, y: 0 },
        },
      },
    });
  });

  it("removes the edges of other hidden nodes", () => {
    const { nodes, edges } = hideNodes(
      graph.nodes,
      graph.edges,
      (n) => n.type === "data",
    );

    expect(nodes.map((n) => n.id)).not.toContain("OrderDatabase");
    expect(edges.map((e) => e.id)).toEqual([
      "OrderService-OrderPlaced",
      "OrderPlaced-PaymentService",
    ]);
  });

  it("keeps bridged edges crossing domains when an edge they replace did", () => {
    const { edges } = hideNodes(
      graph.nodes,
      graph.edges.map((e) =>
        e.target === "PaymentService"
          ? { ...e, data: { ...e.data, crossDomain: true } }
          : e,
      ),
      (n) => n.type === "events",
    );

    expect(
      edges.find((e) => e.target === "PaymentService")?.data,
    ).toMatchObject({ crossDomain: true });
  });
});
