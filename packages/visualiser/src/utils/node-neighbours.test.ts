import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import { getNodeNeighbours } from "./node-neighbours";

const node = (
  id: string,
  type: string,
  data: Record<string, unknown>,
): Node => ({
  id,
  type,
  position: { x: 0, y: 0 },
  data,
});
const edge = (source: string, target: string, label?: string): Edge => ({
  id: `${source}-${target}`,
  source,
  target,
  ...(label && { label }),
});

const nodes = [
  node("orders", "services", {
    service: { id: "orders", name: "Orders Service", version: "1.0.0" },
  }),
  node("payments", "services", {
    service: { id: "payments", name: "Payment Service" },
  }),
  node("inventory", "services", {
    service: { id: "inventory", name: "Inventory Service" },
  }),
  node("placed", "events", {
    message: { id: "placed", data: { id: "placed", name: "Order Placed" } },
  }),
  node("topic", "channels", { channel: { id: "topic", name: "orders-topic" } }),
  node("db", "data", { data: { id: "db", name: "Orders DB" } }),
  node("note-1", "note", { text: "Look here" }),
];
const edges = [
  edge("orders", "placed", "publishes event"),
  edge("placed", "topic"),
  edge("topic", "payments", "subscribed by"),
  edge("placed", "inventory", "subscribed by"),
  edge("orders", "db", "writes to"),
  edge("note-1", "orders"),
];

describe("getNodeNeighbours", () => {
  it("lists a message's producers and consumers, through its channel", () => {
    expect(getNodeNeighbours("placed", nodes, edges)).toEqual([
      {
        heading: "Produced by",
        items: [
          {
            id: "orders",
            type: "services",
            name: "Orders Service",
            label: "publishes event",
          },
        ],
      },
      {
        heading: "Consumed by",
        items: [
          {
            id: "payments",
            type: "services",
            name: "Payment Service",
            label: "via orders-topic",
          },
          {
            id: "inventory",
            type: "services",
            name: "Inventory Service",
            label: "subscribed by",
          },
        ],
      },
    ]);
  });

  it("lists what a service sends and receives, and its other connections, without notes", () => {
    const groups = getNodeNeighbours("orders", nodes, edges);
    expect(
      groups.map((group) => [
        group.heading,
        group.items.map((item) => item.name),
      ]),
    ).toEqual([
      ["Sends", ["Order Placed"]],
      ["Connects to", ["Orders DB"]],
    ]);
    expect(getNodeNeighbours("payments", nodes, edges)).toEqual([
      {
        heading: "Receives",
        items: [
          {
            id: "placed",
            type: "events",
            name: "Order Placed",
            label: "via orders-topic",
          },
        ],
      },
    ]);
  });

  it("lists what a channel carries, who produces and consumes it", () => {
    expect(getNodeNeighbours("topic", nodes, edges)).toEqual([
      {
        heading: "Messages",
        items: [{ id: "placed", type: "events", name: "Order Placed" }],
      },
      {
        heading: "Produced by",
        items: [
          {
            id: "orders",
            type: "services",
            name: "Orders Service",
            label: "1 message",
          },
        ],
      },
      {
        heading: "Consumed by",
        items: [
          {
            id: "payments",
            type: "services",
            name: "Payment Service",
            label: "subscribed by",
          },
        ],
      },
    ]);
  });

  describe("with channels that route to each other", () => {
    const routed = [
      ...nodes,
      node("search-topic", "channels", {
        channel: { id: "search-topic", name: "search-topic" },
      }),
      node("search", "services", {
        service: { id: "search", name: "Search Indexer" },
      }),
    ];
    const routes = [
      ...edges,
      edge("topic", "search-topic", "routes to"),
      edge("search-topic", "search", "subscribed by"),
    ];
    const named = (id: string) =>
      getNodeNeighbours(id, routed, routes).map((group) => [
        group.heading,
        group.items.map((item) =>
          item.label ? `${item.name} (${item.label})` : item.name,
        ),
      ]);

    it("follows a message along the route to its consumers", () => {
      expect(named("placed")).toEqual([
        ["Produced by", ["Orders Service (publishes event)"]],
        [
          "Consumed by",
          [
            "Payment Service (via orders-topic)",
            "Search Indexer (via orders-topic → search-topic)",
            "Inventory Service (subscribed by)",
          ],
        ],
      ]);
      expect(named("search")).toEqual([
        ["Receives", ["Order Placed (via search-topic → orders-topic)"]],
      ]);
    });

    it("lists where a channel routes from and to, and what's routed to it", () => {
      expect(named("topic")).toEqual([
        ["Messages", ["Order Placed"]],
        ["Produced by", ["Orders Service (1 message)"]],
        ["Consumed by", ["Payment Service (subscribed by)"]],
        ["Routes to", ["search-topic"]],
      ]);
      expect(named("search-topic")).toEqual([
        ["Messages", ["Order Placed (via orders-topic)"]],
        ["Produced by", ["Orders Service (1 message)"]],
        ["Consumed by", ["Search Indexer (subscribed by)"]],
        ["Routes from", ["orders-topic"]],
      ]);
    });
  });

  it("through a shared channel, only connects services to the messages they send and receive", () => {
    // One edge from the channel to each consumer, for all the messages it carries (as channel diagrams draw it)
    const shared = [
      node("orders", "services", {
        service: {
          id: "orders",
          name: "Orders Service",
          sends: [{ id: "placed" }, { id: "cancelled" }],
        },
      }),
      node("placed", "events", {
        message: { id: "placed", name: "Order Placed" },
      }),
      node("cancelled", "events", {
        message: { id: "cancelled", name: "Order Cancelled" },
      }),
      node("topic", "channels", {
        channel: { id: "topic", name: "orders-topic" },
      }),
      node("warehouse", "services", {
        service: {
          id: "warehouse",
          name: "Warehouse",
          receives: [{ id: "placed" }],
        },
      }),
      node("refunds", "services", {
        service: {
          id: "refunds",
          name: "Refunds",
          receives: [{ id: "cancelled" }],
        },
      }),
    ];
    const sharedEdges = [
      edge("placed", "topic"),
      edge("cancelled", "topic"),
      edge("topic", "warehouse", "subscribed to"),
      edge("topic", "refunds", "subscribed to"),
    ];
    const names = (id: string) =>
      getNodeNeighbours(id, shared, sharedEdges).map((group) => [
        group.heading,
        group.items.map((item) => item.name),
      ]);
    expect(names("placed")).toEqual([["Consumed by", ["Warehouse"]]]);
    expect(names("cancelled")).toEqual([["Consumed by", ["Refunds"]]]);
    expect(names("warehouse")).toEqual([["Receives", ["Order Placed"]]]);
  });

  it("is nothing for a node that isn't on the diagram, or isn't connected", () => {
    expect(getNodeNeighbours("missing", nodes, edges)).toEqual([]);
    expect(getNodeNeighbours("db", [nodes[5]], [])).toEqual([]);
  });
});
