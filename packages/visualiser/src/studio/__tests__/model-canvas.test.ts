import { describe, expect, it } from "vitest";
import type { Model } from "../../model";
import { canvasToModel, modelToCanvas } from "../model-canvas";

const EVENTS = [
  "OrderPlaced",
  "OrderCreated",
  "OrderConfirmed",
  "OrderCancelled",
  "OrderUpdated",
];

const orders: Model = {
  title: "Orders",
  resources: [
    { id: "order", type: "domain", name: "Order" },
    {
      id: "ordering-service",
      type: "service",
      name: "Ordering Service",
      parent: "order",
    },
    ...EVENTS.map((id) => ({ id, type: "event" as const, name: id })),
  ],
  relations: EVENTS.map((to) => ({
    from: "ordering-service",
    to,
    kind: "sends" as const,
  })),
};

describe("modelToCanvas", () => {
  it("puts what the agent adds to a laid out diagram inside the container it belongs in", async () => {
    // The diagram as it was drawn (laid out), back to a model with its layout: what agents build on
    const first = await modelToCanvas(orders);
    const laidOut = canvasToModel(
      first.nodes,
      first.edges,
      first.levelLayouts,
      orders,
      first.threads,
      first.hotspots,
    );
    expect(laidOut.layout?.messages).toBeTruthy();

    // A new domain with a new service in it, receiving the events
    const changed: Model = {
      ...laidOut,
      resources: [
        ...laidOut.resources,
        { id: "payments", type: "domain", name: "Payments" },
        {
          id: "payment-service",
          type: "service",
          name: "Payment Service",
          parent: "payments",
        },
      ],
      relations: [
        ...laidOut.relations,
        ...EVENTS.map((to) => ({
          from: "payment-service",
          to,
          kind: "receives" as const,
        })),
      ],
    };
    const { nodes } = await modelToCanvas(changed);
    const domain = nodes.find((node) => node.id === "payments")!;
    const service = nodes.find((node) => node.id === "payment-service")!;

    // Relative to its domain, and within it (it was placed in canvas coordinates, far outside it)
    expect(service.parentId).toBe("payments");
    expect(service.position.x).toBeGreaterThanOrEqual(0);
    expect(service.position.y).toBeGreaterThanOrEqual(0);
    expect(service.position.x).toBeLessThan(domain.width!);
    expect(service.position.y).toBeLessThan(domain.height!);

    // What was there didn't move
    const before = first.nodes.find((node) => node.id === "ordering-service")!;
    expect(
      nodes.find((node) => node.id === "ordering-service")!.position,
    ).toEqual(before.position);
  });

  it("places what's in a container again when the place it was given is outside it (an agent guessed it)", async () => {
    const first = await modelToCanvas(orders);
    const laidOut = canvasToModel(
      first.nodes,
      first.edges,
      first.levelLayouts,
      orders,
      first.threads,
      first.hotspots,
    );
    // The agent adds a domain and a service in it, with places of its own: the service's in canvas coordinates
    const changed: Model = {
      ...laidOut,
      resources: [
        ...laidOut.resources,
        { id: "payments", type: "domain", name: "Payments" },
        {
          id: "payment-service",
          type: "service",
          name: "Payment Service",
          parent: "payments",
        },
      ],
      layout: {
        ...laidOut.layout,
        messages: {
          ...laidOut.layout?.messages,
          payments: { x: 1200, y: 0, width: 360, height: 240 },
          "payment-service": { x: 1800, y: 120 },
        },
      },
    };
    const { nodes } = await modelToCanvas(changed);
    const domain = nodes.find((node) => node.id === "payments")!;
    const service = nodes.find((node) => node.id === "payment-service")!;

    expect(domain.position).toEqual({ x: 1200, y: 0 });
    expect(service.parentId).toBe("payments");
    expect(service.position.x).toBeGreaterThanOrEqual(0);
    expect(service.position.x).toBeLessThan(domain.width!);
    expect(service.position.y).toBeLessThan(domain.height!);
  });
});

describe("channels' type and dead letter channels", () => {
  it("draws a channel's type and dead letter status on its card, and keeps them in the model", async () => {
    const model: Model = {
      title: "Orders",
      resources: [
        {
          id: "orders.queue",
          type: "channel",
          name: "Orders Queue",
          channelType: "queue",
        },
        {
          id: "orders.dlq",
          type: "channel",
          name: "Orders DLQ",
          channelType: "queue",
          deadLetter: true,
        },
        { id: "orders.bus", type: "channel", name: "Orders Bus" },
      ],
      relations: [],
    };
    const canvas = await modelToCanvas(model);
    const channel = (id: string) =>
      canvas.nodes.find((node) => node.id === id)!.data.channel as Record<
        string,
        unknown
      >;

    expect(channel("orders.queue")).toMatchObject({ type: "queue" });
    expect(channel("orders.dlq")).toMatchObject({
      type: "queue",
      isDeadLetterChannel: true,
    });
    expect(channel("orders.bus").type).toBeUndefined();

    const back = canvasToModel(
      canvas.nodes,
      canvas.edges,
      canvas.levelLayouts,
      model,
      canvas.threads,
      canvas.hotspots,
    );
    const resource = (id: string) => back.resources.find((r) => r.id === id)!;
    expect(resource("orders.queue")).toMatchObject({ channelType: "queue" });
    expect(resource("orders.queue").deadLetter).toBeUndefined();
    expect(resource("orders.dlq")).toMatchObject({
      channelType: "queue",
      deadLetter: true,
    });
    expect(resource("orders.bus").channelType).toBeUndefined();
  });

  it("draws a channel's dead letter connection from the model as it is drawn on the canvas: red, dashed, from the bottom", async () => {
    const model: Model = {
      title: "Orders",
      resources: [
        { id: "orders.queue", type: "channel", name: "Orders Queue" },
        {
          id: "orders.dlq",
          type: "channel",
          name: "Orders DLQ",
          deadLetter: true,
        },
      ],
      relations: [
        {
          from: "orders.queue",
          to: "orders.dlq",
          kind: "connects",
          label: "dead-letters to",
        },
      ],
    };
    const { edges } = await modelToCanvas(model);

    expect(edges.find((edge) => edge.source === "orders.queue")).toMatchObject({
      label: "dead-letters to",
      sourceHandle: "dead-letter",
      className: "ec-dead-letter-edge",
    });
  });
});
