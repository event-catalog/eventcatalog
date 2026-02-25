import { describe, it, expect, vi } from "vitest";
import {
  parseSpec,
  extractMessages,
  extractChannels,
  extractService,
  messageToEc,
  channelToEc,
  serviceToEc,
  resolveAsyncApiImports as resolveImports,
  resolveAsyncApiImportsAsync as resolveImportsAsync,
} from "../../src/resolvers/index.js";

// ─── Fixtures ───────────────────────────────────────────

const v3Spec = `
asyncapi: 3.0.0
info:
  title: Orders API
  version: 1.0.0
servers:
  production:
    host: kafka.example.com:9092
    protocol: kafka
channels:
  orderCreated:
    address: orders.created
    summary: Topic for new orders
    messages:
      OrderCreated:
        $ref: '#/components/messages/OrderCreated'
    bindings:
      kafka:
        topic: orders.created
  orderShipped:
    address: orders.shipped
    summary: Topic for shipped orders
    messages:
      OrderShipped:
        $ref: '#/components/messages/OrderShipped'
components:
  messages:
    OrderCreated:
      summary: Fired when a new order is placed
    OrderShipped:
      summary: Fired when an order ships
`;

const v2Spec = `
asyncapi: 2.6.0
info:
  title: Payments API
  version: 2.0.0
servers:
  production:
    url: amqp://rabbitmq.example.com
    protocol: amqp
channels:
  payments/processed:
    description: Channel for processed payments
    bindings:
      amqp:
        is: routingKey
    publish:
      message:
        name: PaymentProcessed
        summary: Payment completed successfully
  payments/failed:
    description: Channel for failed payments
    subscribe:
      message:
        name: PaymentFailed
        summary: Payment was declined
`;

const v3SpecNoServers = `
asyncapi: 3.0.0
info:
  title: Minimal API
  version: 0.1.0
channels:
  notifications:
    address: notifications
    summary: Notification channel
    messages:
      NotificationSent:
        summary: A notification was sent
components:
  messages:
    NotificationSent:
      summary: A notification was sent
`;

const v3SpecWithOps = `
asyncapi: 3.0.0
info:
  title: Order Service
  version: 2.0.0
  description: This service handles order events.
servers:
  production:
    host: kafka.example.com:9092
    protocol: kafka
channels:
  orderCreated:
    address: orders.created
    summary: Topic for new orders
    messages:
      OrderCreated:
        $ref: '#/components/messages/OrderCreated'
  orderShipped:
    address: orders.shipped
    summary: Topic for shipped orders
    messages:
      OrderShipped:
        $ref: '#/components/messages/OrderShipped'
  orderCancelled:
    address: orders.cancelled
    summary: Topic for cancelled orders
    messages:
      OrderCancelled:
        $ref: '#/components/messages/OrderCancelled'
operations:
  sendOrderCreated:
    action: send
    channel:
      $ref: '#/channels/orderCreated'
    summary: Publishes when a new order is placed
  sendOrderShipped:
    action: send
    channel:
      $ref: '#/channels/orderShipped'
  receiveOrderCancelled:
    action: receive
    channel:
      $ref: '#/channels/orderCancelled'
    summary: Handles order cancellation
components:
  messages:
    OrderCreated:
      summary: Fired when a new order is placed
    OrderShipped:
      summary: Fired when an order ships
    OrderCancelled:
      summary: Fired when an order is cancelled
`;

const v2SpecWithOps = `
asyncapi: 2.6.0
info:
  title: Payment Service
  version: 1.0.0
  description: Handles payment processing events.
servers:
  production:
    url: amqp://rabbitmq.example.com
    protocol: amqp
channels:
  payments/processed:
    description: Channel for processed payments
    bindings:
      amqp:
        is: routingKey
    publish:
      message:
        name: PaymentProcessed
        summary: Payment completed successfully
  payments/failed:
    description: Channel for failed payments
    subscribe:
      message:
        name: PaymentFailed
        summary: Payment was declined
`;

const v3SpecWithOpMessages = `
asyncapi: 3.0.0
info:
  title: Filtered Ops Service
  version: 1.0.0
channels:
  orders:
    address: orders
    messages:
      OrderCreated:
        $ref: '#/components/messages/OrderCreated'
      OrderUpdated:
        $ref: '#/components/messages/OrderUpdated'
      OrderCancelled:
        $ref: '#/components/messages/OrderCancelled'
operations:
  sendOrderCreated:
    action: send
    channel:
      $ref: '#/channels/orders'
    messages:
      - $ref: '#/channels/orders/messages/OrderCreated'
  receiveOrderCancelled:
    action: receive
    channel:
      $ref: '#/channels/orders'
    messages:
      - $ref: '#/channels/orders/messages/OrderCancelled'
components:
  messages:
    OrderCreated:
      summary: New order placed
    OrderUpdated:
      summary: Order was updated
    OrderCancelled:
      summary: Order was cancelled
`;

const v2SpecWithRefs = `
asyncapi: 2.6.0
info:
  title: Ref Service
  version: 1.0.0
channels:
  orders/created:
    publish:
      message:
        $ref: '#/components/messages/OrderCreated'
  orders/cancelled:
    subscribe:
      message:
        $ref: '#/components/messages/OrderCancelled'
components:
  messages:
    OrderCreated:
      name: OrderCreated
      summary: Order was created
    OrderCancelled:
      name: OrderCancelled
      summary: Order was cancelled
`;

const v2SpecWithRefsNoName = `
asyncapi: 2.6.0
info:
  title: Ref No Name Service
  version: 1.0.0
channels:
  orders/created:
    publish:
      message:
        $ref: '#/components/messages/OrderCreated'
components:
  messages:
    OrderCreated:
      summary: Order was created
`;

const v2SpecWithOneOf = `
asyncapi: 2.6.0
info:
  title: OneOf Service
  version: 1.0.0
channels:
  orders/events:
    publish:
      message:
        oneOf:
          - $ref: '#/components/messages/OrderCreated'
          - $ref: '#/components/messages/OrderShipped'
  orders/commands:
    subscribe:
      message:
        oneOf:
          - name: CancelOrder
            summary: Cancel an order
          - name: RefundOrder
            summary: Refund an order
components:
  messages:
    OrderCreated:
      name: OrderCreated
      summary: New order placed
    OrderShipped:
      name: OrderShipped
      summary: Order shipped
`;

// ─── parseSpec ──────────────────────────────────────────

describe("parseSpec", () => {
  describe("AsyncAPI v3", () => {
    it("extracts messages from components.messages", () => {
      const { messages, errors } = parseSpec(v3Spec);
      expect(errors).toHaveLength(0);
      expect(messages.size).toBe(2);
      expect(messages.get("OrderCreated")).toEqual({
        name: "OrderCreated",
        summary: "Fired when a new order is placed",
        description: undefined,
        version: "1.0.0",
      });
      expect(messages.get("OrderShipped")).toEqual({
        name: "OrderShipped",
        summary: "Fired when an order ships",
        description: undefined,
        version: "1.0.0",
      });
    });

    it("extracts channels with address, protocol, and summary", () => {
      const { channels, errors } = parseSpec(v3Spec);
      expect(errors).toHaveLength(0);
      expect(channels.size).toBe(2);
      expect(channels.get("orderCreated")).toEqual({
        name: "orderCreated",
        address: "orders.created",
        protocol: "kafka",
        summary: "Topic for new orders",
        version: "1.0.0",
      });
    });

    it("resolves $ref messages from channels", () => {
      const specWithOnlyChannelRefs = `
asyncapi: 3.0.0
info:
  title: Test
  version: 1.0.0
channels:
  events:
    address: events
    messages:
      MyEvent:
        $ref: '#/components/messages/MyEvent'
components:
  messages:
    MyEvent:
      summary: A test event
`;
      const { messages } = parseSpec(specWithOnlyChannelRefs);
      expect(messages.get("MyEvent")?.summary).toBe("A test event");
    });

    it("falls back to server protocol when channel has no bindings", () => {
      const { channels } = parseSpec(v3SpecNoServers);
      expect(channels.get("notifications")?.protocol).toBeUndefined();
    });

    it("uses server protocol as fallback", () => {
      const specWithServer = `
asyncapi: 3.0.0
info:
  title: Test
  version: 1.0.0
servers:
  prod:
    host: nats.example.com
    protocol: nats
channels:
  myChannel:
    address: my.subject
    summary: A NATS channel
`;
      const { channels } = parseSpec(specWithServer);
      expect(channels.get("myChannel")?.protocol).toBe("nats");
    });
  });

  describe("AsyncAPI v2", () => {
    it("extracts messages from publish/subscribe operations", () => {
      const { messages, errors } = parseSpec(v2Spec);
      expect(errors).toHaveLength(0);
      expect(messages.size).toBe(2);
      expect(messages.get("PaymentProcessed")).toEqual({
        name: "PaymentProcessed",
        summary: "Payment completed successfully",
        description: undefined,
        version: "2.0.0",
      });
      expect(messages.get("PaymentFailed")).toEqual({
        name: "PaymentFailed",
        summary: "Payment was declined",
        description: undefined,
        version: "2.0.0",
      });
    });

    it("extracts channels with address derived from channel key", () => {
      const { channels } = parseSpec(v2Spec);
      expect(channels.size).toBe(2);
      const processed = channels.get("payments-processed");
      expect(processed).toEqual({
        name: "payments-processed",
        address: "payments/processed",
        protocol: "amqp",
        summary: "Channel for processed payments",
        version: "2.0.0",
      });
    });

    it("uses server protocol when channel has no bindings", () => {
      const v2NoBind = `
asyncapi: 2.6.0
info:
  title: Test
  version: 1.0.0
servers:
  prod:
    url: mqtt://broker.example.com
    protocol: mqtt
channels:
  devices/telemetry:
    description: Device telemetry
    publish:
      message:
        name: Telemetry
        summary: Device telemetry data
`;
      const { channels } = parseSpec(v2NoBind);
      expect(channels.get("devices-telemetry")?.protocol).toBe("mqtt");
    });

    it("extracts messages from components.messages", () => {
      const v2Components = `
asyncapi: 2.6.0
info:
  title: Test
  version: 1.0.0
components:
  messages:
    UserCreated:
      summary: New user registered
    UserDeleted:
      summary: User account deleted
`;
      const { messages } = parseSpec(v2Components);
      expect(messages.size).toBe(2);
      expect(messages.get("UserCreated")?.summary).toBe("New user registered");
    });
  });

  describe("error handling", () => {
    it("returns error for invalid YAML", () => {
      const { messages, channels, errors } = parseSpec("{{invalid yaml");
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("Failed to parse AsyncAPI YAML");
      expect(messages.size).toBe(0);
      expect(channels.size).toBe(0);
    });

    it("returns error for empty content", () => {
      const { errors } = parseSpec("");
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe("AsyncAPI file is empty or invalid");
    });

    it("returns error for non-object content", () => {
      const { errors } = parseSpec('"just a string"');
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe("AsyncAPI file is empty or invalid");
    });

    it("returns empty maps for unrecognized asyncapi version", () => {
      const { messages, channels, errors } = parseSpec(`
asyncapi: 99.0.0
info:
  title: Future
  version: 1.0.0
`);
      expect(errors).toHaveLength(0);
      expect(messages.size).toBe(0);
      expect(channels.size).toBe(0);
    });
  });

  describe("version inheritance", () => {
    it("applies info.version to messages without their own version", () => {
      const { messages } = parseSpec(v3Spec);
      expect(messages.get("OrderCreated")?.version).toBe("1.0.0");
    });

    it("applies info.version to channels without their own version", () => {
      const { channels } = parseSpec(v3Spec);
      expect(channels.get("orderCreated")?.version).toBe("1.0.0");
    });

    it("returns no version when info.version is missing", () => {
      const noVersion = `
asyncapi: 3.0.0
info:
  title: No Version
components:
  messages:
    Evt:
      summary: An event
`;
      const { messages } = parseSpec(noVersion);
      expect(messages.get("Evt")?.version).toBeUndefined();
    });
  });
});

// ─── extractMessages / extractChannels ──────────────────

describe("extractMessages", () => {
  it("returns only messages and errors", () => {
    const result = extractMessages(v3Spec);
    expect(result.messages.size).toBe(2);
    expect(result.errors).toHaveLength(0);
    expect(result).not.toHaveProperty("channels");
  });
});

describe("extractChannels", () => {
  it("returns only channels and errors", () => {
    const result = extractChannels(v3Spec);
    expect(result.channels.size).toBe(2);
    expect(result.errors).toHaveLength(0);
    expect(result).not.toHaveProperty("messages");
  });
});

// ─── messageToEc ────────────────────────────────────────

describe("messageToEc", () => {
  it("generates event definition", () => {
    const ec = messageToEc(
      { name: "OrderCreated", summary: "Order was created", version: "1.0.0" },
      "events",
    );
    expect(ec).toBe(
      `event OrderCreated {\n  version 1.0.0\n  summary "Order was created"\n}`,
    );
  });

  it("generates command definition", () => {
    const ec = messageToEc(
      { name: "PlaceOrder", summary: "Place an order", version: "2.0.0" },
      "commands",
    );
    expect(ec).toBe(
      `command PlaceOrder {\n  version 2.0.0\n  summary "Place an order"\n}`,
    );
  });

  it("generates query definition", () => {
    const ec = messageToEc({ name: "GetOrder", version: "1.0.0" }, "queries");
    expect(ec).toBe(`query GetOrder {\n  version 1.0.0\n}`);
  });

  it("omits version when not provided", () => {
    const ec = messageToEc({ name: "Evt", summary: "Test" }, "events");
    expect(ec).toBe(`event Evt {\n  summary "Test"\n}`);
  });

  it("escapes quotes in summary", () => {
    const ec = messageToEc(
      { name: "Evt", summary: 'Said "hello"', version: "1.0.0" },
      "events",
    );
    expect(ec).toContain('summary "Said \\"hello\\""');
  });
});

// ─── channelToEc ────────────────────────────────────────

describe("channelToEc", () => {
  it("generates full channel definition", () => {
    const ec = channelToEc({
      name: "orderEvents",
      version: "1.0.0",
      address: "orders.events",
      protocol: "kafka",
      summary: "Kafka topic for orders",
    });
    expect(ec).toBe(
      `channel orderEvents {\n  version 1.0.0\n  address "orders.events"\n  protocol "kafka"\n  summary "Kafka topic for orders"\n}`,
    );
  });

  it("omits optional fields when not provided", () => {
    const ec = channelToEc({ name: "minimal", version: "1.0.0" });
    expect(ec).toBe(`channel minimal {\n  version 1.0.0\n}`);
  });

  it("escapes quotes in address", () => {
    const ec = channelToEc({ name: "ch", address: 'topic/"special"' });
    expect(ec).toContain('address "topic/\\"special\\""');
  });
});

// ─── resolveImports ─────────────────────────────────────

describe("resolveImports", () => {
  it("replaces event imports with synthesized .ec definitions", () => {
    const files = {
      "main.ec": `import events { OrderCreated } from "./spec.yml"\n\nservice Test {}`,
      "spec.yml": v3Spec,
    };
    const { files: resolved, errors } = resolveImports(files);
    expect(errors).toHaveLength(0);
    expect(resolved).not.toHaveProperty("spec.yml");
    expect(resolved["main.ec"]).toContain("event OrderCreated {");
    expect(resolved["main.ec"]).toContain("version 1.0.0");
    expect(resolved["main.ec"]).toContain("service Test {}");
    expect(resolved["main.ec"]).not.toContain("import events");
  });

  it("replaces channel imports with synthesized .ec definitions", () => {
    const files = {
      "main.ec": `import channels { orderCreated } from "./spec.yml"\n\nservice Test {}`,
      "spec.yml": v3Spec,
    };
    const { files: resolved, errors } = resolveImports(files);
    expect(errors).toHaveLength(0);
    expect(resolved["main.ec"]).toContain("channel orderCreated {");
    expect(resolved["main.ec"]).toContain('address "orders.created"');
    expect(resolved["main.ec"]).toContain('protocol "kafka"');
  });

  it("handles multiple import statements from the same file", () => {
    const files = {
      "main.ec": `import events { OrderCreated, OrderShipped } from "./spec.yml"\nimport channels { orderCreated, orderShipped } from "./spec.yml"\n`,
      "spec.yml": v3Spec,
    };
    const { files: resolved, errors } = resolveImports(files);
    expect(errors).toHaveLength(0);
    expect(resolved["main.ec"]).toContain("event OrderCreated {");
    expect(resolved["main.ec"]).toContain("event OrderShipped {");
    expect(resolved["main.ec"]).toContain("channel orderCreated {");
    expect(resolved["main.ec"]).toContain("channel orderShipped {");
  });

  it("reports error for missing spec file", () => {
    const files = {
      "main.ec": `import events { Foo } from "./missing.yml"\n`,
    };
    const { errors } = resolveImports(files);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("Spec file not found");
  });

  it("reports error for message not found in spec", () => {
    const files = {
      "main.ec": `import events { NonExistent } from "./spec.yml"\n`,
      "spec.yml": v3Spec,
    };
    const { errors } = resolveImports(files);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('Message "NonExistent" not found');
    expect(errors[0].message).toContain(
      "Available: OrderCreated, OrderShipped",
    );
  });

  it("reports error for channel not found in spec", () => {
    const files = {
      "main.ec": `import channels { nonExistent } from "./spec.yml"\n`,
      "spec.yml": v3Spec,
    };
    const { errors } = resolveImports(files);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('Channel "nonExistent" not found');
    expect(errors[0].message).toContain(
      "Available: orderCreated, orderShipped",
    );
  });

  it("strips YAML files from output", () => {
    const files = {
      "main.ec": `import events { OrderCreated } from "./spec.yml"\n`,
      "spec.yml": v3Spec,
      "other.yml": "asyncapi: 3.0.0",
    };
    const { files: resolved } = resolveImports(files);
    expect(Object.keys(resolved)).toEqual(["main.ec"]);
  });

  it("passes through .ec files without async imports unchanged", () => {
    const files = {
      "main.ec": `import { Foo } from "./other.ec"\nservice Test {}`,
      "other.ec": "event Foo {}",
    };
    const { files: resolved, errors } = resolveImports(files);
    expect(errors).toHaveLength(0);
    expect(resolved["main.ec"]).toBe(files["main.ec"]);
    expect(resolved["other.ec"]).toBe(files["other.ec"]);
  });

  it("resolves path with and without ./ prefix", () => {
    const files = {
      "main.ec": `import events { OrderCreated } from "spec.yml"\n`,
      "spec.yml": v3Spec,
    };
    const { files: resolved, errors } = resolveImports(files);
    expect(errors).toHaveLength(0);
    expect(resolved["main.ec"]).toContain("event OrderCreated {");
  });

  it("handles command imports", () => {
    const spec = `
asyncapi: 3.0.0
info:
  title: Test
  version: 1.0.0
components:
  messages:
    DoSomething:
      summary: A command message
`;
    const files = {
      "main.ec": `import commands { DoSomething } from "./spec.yml"\n`,
      "spec.yml": spec,
    };
    const { files: resolved, errors } = resolveImports(files);
    expect(errors).toHaveLength(0);
    expect(resolved["main.ec"]).toContain("command DoSomething {");
  });

  it("skips URL imports in sync mode", () => {
    const files = {
      "main.ec": `import events { OrderCreated } from "https://example.com/spec.yml"\n`,
    };
    const { files: resolved, errors } = resolveImports(files);
    expect(errors).toHaveLength(0);
    // URL import is left untouched
    expect(resolved["main.ec"]).toContain("import events");
    expect(resolved["main.ec"]).toContain("https://example.com/spec.yml");
  });
});

// ─── resolveImportsAsync ────────────────────────────────

describe("resolveImportsAsync", () => {
  const remoteSpec = `
asyncapi: 3.0.0
info:
  title: Remote Orders API
  version: 2.0.0
servers:
  prod:
    host: kafka.example.com:9092
    protocol: kafka
channels:
  remoteChannel:
    address: remote.events
    summary: A remote Kafka topic
    messages:
      RemoteEvent:
        $ref: '#/components/messages/RemoteEvent'
    bindings:
      kafka:
        topic: remote.events
components:
  messages:
    RemoteEvent:
      summary: An event from a remote spec
`;

  it("fetches and resolves events from a remote URL", async () => {
    const mockFetch = vi.fn().mockResolvedValue(remoteSpec);
    const files = {
      "main.ec": `import events { RemoteEvent } from "https://example.com/spec.yml"\n\nservice Test {}`,
    };
    const { files: resolved, errors } = await resolveImportsAsync(
      files,
      mockFetch,
    );
    expect(errors).toHaveLength(0);
    expect(mockFetch).toHaveBeenCalledWith("https://example.com/spec.yml");
    expect(resolved["main.ec"]).toContain("event RemoteEvent {");
    expect(resolved["main.ec"]).toContain("version 2.0.0");
    expect(resolved["main.ec"]).toContain("service Test {}");
    expect(resolved["main.ec"]).not.toContain("import events");
  });

  it("fetches and resolves channels from a remote URL", async () => {
    const mockFetch = vi.fn().mockResolvedValue(remoteSpec);
    const files = {
      "main.ec": `import channels { remoteChannel } from "https://example.com/spec.yml"\n`,
    };
    const { files: resolved, errors } = await resolveImportsAsync(
      files,
      mockFetch,
    );
    expect(errors).toHaveLength(0);
    expect(resolved["main.ec"]).toContain("channel remoteChannel {");
    expect(resolved["main.ec"]).toContain('address "remote.events"');
    expect(resolved["main.ec"]).toContain('protocol "kafka"');
    expect(resolved["main.ec"]).toContain('summary "A remote Kafka topic"');
  });

  it("handles mixed local and remote imports", async () => {
    const mockFetch = vi.fn().mockResolvedValue(remoteSpec);
    const files = {
      "main.ec": `import events { OrderCreated } from "./local.yml"\nimport events { RemoteEvent } from "https://example.com/spec.yml"\n`,
      "local.yml": v3Spec,
    };
    const { files: resolved, errors } = await resolveImportsAsync(
      files,
      mockFetch,
    );
    expect(errors).toHaveLength(0);
    expect(resolved["main.ec"]).toContain("event OrderCreated {");
    expect(resolved["main.ec"]).toContain("event RemoteEvent {");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("caches repeated fetches to the same URL", async () => {
    const mockFetch = vi.fn().mockResolvedValue(remoteSpec);
    const files = {
      "main.ec": `import events { RemoteEvent } from "https://example.com/spec.yml"\nimport channels { remoteChannel } from "https://example.com/spec.yml"\n`,
    };
    const { files: resolved, errors } = await resolveImportsAsync(
      files,
      mockFetch,
    );
    expect(errors).toHaveLength(0);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(resolved["main.ec"]).toContain("event RemoteEvent {");
    expect(resolved["main.ec"]).toContain("channel remoteChannel {");
  });

  it("reports error when fetch fails", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    const files = {
      "main.ec": `import events { Foo } from "https://example.com/broken.yml"\n`,
    };
    const { files: resolved, errors } = await resolveImportsAsync(
      files,
      mockFetch,
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("Failed to fetch spec");
    expect(errors[0].message).toContain("Network error");
    expect(resolved["main.ec"]).toContain("// ERROR");
  });

  it("reports error when message not found in remote spec", async () => {
    const mockFetch = vi.fn().mockResolvedValue(remoteSpec);
    const files = {
      "main.ec": `import events { NonExistent } from "https://example.com/spec.yml"\n`,
    };
    const { errors } = await resolveImportsAsync(files, mockFetch);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('Message "NonExistent" not found');
    expect(errors[0].message).toContain("Available: RemoteEvent");
  });

  it("still resolves local files without a fetchFn call", async () => {
    const mockFetch = vi.fn();
    const files = {
      "main.ec": `import events { OrderCreated } from "./spec.yml"\n`,
      "spec.yml": v3Spec,
    };
    const { files: resolved, errors } = await resolveImportsAsync(
      files,
      mockFetch,
    );
    expect(errors).toHaveLength(0);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(resolved["main.ec"]).toContain("event OrderCreated {");
  });

  it("fetches multiple different URLs in parallel", async () => {
    const spec2 = `
asyncapi: 3.0.0
info:
  title: Other
  version: 3.0.0
components:
  messages:
    OtherEvent:
      summary: From another spec
`;
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("spec1")) return Promise.resolve(remoteSpec);
      if (url.includes("spec2")) return Promise.resolve(spec2);
      return Promise.reject(new Error("Unknown URL"));
    });
    const files = {
      "main.ec": `import events { RemoteEvent } from "https://example.com/spec1.yml"\nimport events { OtherEvent } from "https://example.com/spec2.yml"\n`,
    };
    const { files: resolved, errors } = await resolveImportsAsync(
      files,
      mockFetch,
    );
    expect(errors).toHaveLength(0);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(resolved["main.ec"]).toContain("event RemoteEvent {");
    expect(resolved["main.ec"]).toContain("event OtherEvent {");
  });
});

// ─── extractService ────────────────────────────────────

describe("extractService", () => {
  describe("AsyncAPI v3 with operations", () => {
    it("extracts service with sends and receives", () => {
      const { service, errors } = extractService(v3SpecWithOps);
      expect(errors).toHaveLength(0);
      expect(service.name).toBe("OrderService");
      expect(service.version).toBe("2.0.0");
      expect(service.summary).toBe("This service handles order events.");

      const sends = service.operations.filter((o) => o.action === "send");
      const receives = service.operations.filter((o) => o.action === "receive");

      expect(sends).toHaveLength(2);
      expect(receives).toHaveLength(1);

      expect(sends[0].messageName).toBe("OrderCreated");
      expect(sends[0].channelName).toBe("orderCreated");
      expect(sends[1].messageName).toBe("OrderShipped");
      expect(sends[1].channelName).toBe("orderShipped");

      expect(receives[0].messageName).toBe("OrderCancelled");
      expect(receives[0].channelName).toBe("orderCancelled");
    });

    it("includes channels referenced by operations", () => {
      const { service } = extractService(v3SpecWithOps);
      expect(service.channels).toHaveLength(3);
      expect(service.channels.map((c) => c.name).sort()).toEqual([
        "orderCancelled",
        "orderCreated",
        "orderShipped",
      ]);
      expect(service.channels[0].protocol).toBe("kafka");
    });

    it("includes messages referenced by operations", () => {
      const { service } = extractService(v3SpecWithOps);
      expect(service.messages).toHaveLength(3);
      expect(service.messages.map((m) => m.name).sort()).toEqual([
        "OrderCancelled",
        "OrderCreated",
        "OrderShipped",
      ]);
    });

    it("uses provided service name over spec title", () => {
      const { service } = extractService(v3SpecWithOps, "MyCustomService");
      expect(service.name).toBe("MyCustomService");
    });

    it("respects op.messages filter and only includes scoped messages", () => {
      const { service, errors } = extractService(v3SpecWithOpMessages);
      expect(errors).toHaveLength(0);

      const sends = service.operations.filter((o) => o.action === "send");
      const receives = service.operations.filter((o) => o.action === "receive");

      // Only OrderCreated should be sent (not OrderUpdated or OrderCancelled)
      expect(sends).toHaveLength(1);
      expect(sends[0].messageName).toBe("OrderCreated");

      // Only OrderCancelled should be received (not OrderCreated or OrderUpdated)
      expect(receives).toHaveLength(1);
      expect(receives[0].messageName).toBe("OrderCancelled");

      // Messages should only include the two referenced by operations
      expect(service.messages.map((m) => m.name).sort()).toEqual([
        "OrderCancelled",
        "OrderCreated",
      ]);
    });
  });

  describe("AsyncAPI v2 with publish/subscribe", () => {
    it("maps publish to send and subscribe to receive", () => {
      const { service, errors } = extractService(v2SpecWithOps);
      expect(errors).toHaveLength(0);
      expect(service.name).toBe("PaymentService");
      expect(service.version).toBe("1.0.0");

      const sends = service.operations.filter((o) => o.action === "send");
      const receives = service.operations.filter((o) => o.action === "receive");

      expect(sends).toHaveLength(1);
      expect(sends[0].messageName).toBe("PaymentProcessed");
      expect(sends[0].channelName).toBe("payments-processed");

      expect(receives).toHaveLength(1);
      expect(receives[0].messageName).toBe("PaymentFailed");
      expect(receives[0].channelName).toBe("payments-failed");
    });

    it("includes channels with v2 address format", () => {
      const { service } = extractService(v2SpecWithOps);
      const ch = service.channels.find((c) => c.name === "payments-processed");
      expect(ch).toBeDefined();
      expect(ch!.address).toBe("payments/processed");
      expect(ch!.protocol).toBe("amqp");
    });

    it("resolves v2 message $ref to derive operation names", () => {
      const { service, errors } = extractService(v2SpecWithRefs);
      expect(errors).toHaveLength(0);

      const sends = service.operations.filter((o) => o.action === "send");
      const receives = service.operations.filter((o) => o.action === "receive");

      expect(sends).toHaveLength(1);
      expect(sends[0].messageName).toBe("OrderCreated");

      expect(receives).toHaveLength(1);
      expect(receives[0].messageName).toBe("OrderCancelled");
    });

    it("extracts name from $ref path when message has no name field", () => {
      const { service, errors } = extractService(v2SpecWithRefsNoName);
      expect(errors).toHaveLength(0);

      const sends = service.operations.filter((o) => o.action === "send");
      expect(sends).toHaveLength(1);
      expect(sends[0].messageName).toBe("OrderCreated");
    });

    it("handles v2 message.oneOf to extract multiple operations", () => {
      const { service, errors } = extractService(v2SpecWithOneOf);
      expect(errors).toHaveLength(0);

      const sends = service.operations.filter((o) => o.action === "send");
      const receives = service.operations.filter((o) => o.action === "receive");

      expect(sends).toHaveLength(2);
      expect(sends.map((s) => s.messageName).sort()).toEqual([
        "OrderCreated",
        "OrderShipped",
      ]);

      expect(receives).toHaveLength(2);
      expect(receives.map((r) => r.messageName).sort()).toEqual([
        "CancelOrder",
        "RefundOrder",
      ]);
    });
  });

  describe("edge cases", () => {
    it("handles spec with no operations", () => {
      const { service, errors } = extractService(v3Spec);
      expect(errors).toHaveLength(0);
      expect(service.operations).toHaveLength(0);
      expect(service.channels).toHaveLength(0);
      expect(service.messages).toHaveLength(0);
    });

    it("handles invalid YAML", () => {
      const { service, errors } = extractService("{{invalid yaml");
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("Failed to parse");
      expect(service.name).toBe("UnknownService");
    });

    it("sanitizes service name from spec title", () => {
      const spec = `
asyncapi: 3.0.0
info:
  title: My Orders API
  version: 1.0.0
`;
      const { service } = extractService(spec);
      expect(service.name).toBe("MyOrdersAPI");
    });
  });
});

// ─── serviceToEc ───────────────────────────────────────

describe("serviceToEc", () => {
  it("generates channels and service with sends/receives", () => {
    const { service } = extractService(v3SpecWithOps);
    const ec = serviceToEc(service);

    // Channel definitions
    expect(ec).toContain("channel orderCreated {");
    expect(ec).toContain('address "orders.created"');
    expect(ec).toContain('protocol "kafka"');
    expect(ec).toContain("channel orderShipped {");
    expect(ec).toContain("channel orderCancelled {");

    // Service block
    expect(ec).toContain("service OrderService {");
    expect(ec).toContain("version 2.0.0");
    expect(ec).toContain("sends event OrderCreated@2.0.0 to orderCreated");
    expect(ec).toContain("sends event OrderShipped@2.0.0 to orderShipped");
    expect(ec).toContain(
      "receives event OrderCancelled@2.0.0 from orderCancelled",
    );
  });

  it("generates v2 service with correct send/receive mapping", () => {
    const { service } = extractService(v2SpecWithOps);
    const ec = serviceToEc(service);

    expect(ec).toContain("service PaymentService {");
    expect(ec).toContain(
      "sends event PaymentProcessed@1.0.0 to payments-processed",
    );
    expect(ec).toContain(
      "receives event PaymentFailed@1.0.0 from payments-failed",
    );
  });

  it("includes service summary", () => {
    const { service } = extractService(v3SpecWithOps);
    const ec = serviceToEc(service);
    expect(ec).toContain('summary "This service handles order events."');
  });
});

// ─── resolveImports with service imports ────────────────

describe("resolveImports (service imports)", () => {
  it("resolves import ServiceName from spec.yml", () => {
    const files = {
      "main.ec": `import OrderService from "./orders-asyncapi.yml"\n\nvisualizer main {\n  service OrderService\n}\n`,
      "orders-asyncapi.yml": v3SpecWithOps,
    };
    const { files: resolved, errors } = resolveImports(files);
    expect(errors).toHaveLength(0);
    expect(resolved["main.ec"]).toContain("service OrderService {");
    expect(resolved["main.ec"]).toContain("channel orderCreated {");
    expect(resolved["main.ec"]).toContain(
      "sends event OrderCreated@2.0.0 to orderCreated",
    );
    expect(resolved["main.ec"]).toContain(
      "receives event OrderCancelled@2.0.0 from orderCancelled",
    );
    expect(resolved["main.ec"]).toContain("visualizer main {");
  });

  it("uses the import name as the service name", () => {
    const files = {
      "main.ec": `import MyService from "./spec.yml"\n`,
      "spec.yml": v3SpecWithOps,
    };
    const { files: resolved, errors } = resolveImports(files);
    expect(errors).toHaveLength(0);
    expect(resolved["main.ec"]).toContain("service MyService {");
  });

  it("works alongside resource imports", () => {
    const files = {
      "main.ec": `import OrderService from "./orders.yml"\nimport events { PaymentProcessed } from "./payments.yml"\n`,
      "orders.yml": v3SpecWithOps,
      "payments.yml": v2SpecWithOps,
    };
    const { files: resolved, errors } = resolveImports(files);
    expect(errors).toHaveLength(0);
    expect(resolved["main.ec"]).toContain("service OrderService {");
    expect(resolved["main.ec"]).toContain("event PaymentProcessed {");
  });

  it("handles v2 spec service import", () => {
    const files = {
      "main.ec": `import PaymentService from "./payments.yml"\n`,
      "payments.yml": v2SpecWithOps,
    };
    const { files: resolved, errors } = resolveImports(files);
    expect(errors).toHaveLength(0);
    expect(resolved["main.ec"]).toContain("service PaymentService {");
    expect(resolved["main.ec"]).toContain("sends event PaymentProcessed");
    expect(resolved["main.ec"]).toContain("receives event PaymentFailed");
  });

  it("skips URL service imports in sync mode", () => {
    const files = {
      "main.ec": `import OrderService from "https://example.com/spec.yml"\n`,
    };
    const { files: resolved, errors } = resolveImports(files);
    expect(errors).toHaveLength(0);
    expect(resolved["main.ec"]).toContain("import OrderService");
  });
});

// ─── resolveImportsAsync with service imports ───────────

describe("resolveImportsAsync (service imports)", () => {
  it("resolves remote service import", async () => {
    const mockFetch = vi.fn().mockResolvedValue(v3SpecWithOps);
    const files = {
      "main.ec": `import OrderService from "https://example.com/spec.yml"\n`,
    };
    const { files: resolved, errors } = await resolveImportsAsync(
      files,
      mockFetch,
    );
    expect(errors).toHaveLength(0);
    expect(mockFetch).toHaveBeenCalledWith("https://example.com/spec.yml");
    expect(resolved["main.ec"]).toContain("service OrderService {");
    expect(resolved["main.ec"]).toContain("channel orderCreated {");
    expect(resolved["main.ec"]).toContain(
      "sends event OrderCreated@2.0.0 to orderCreated",
    );
  });

  it("handles fetch error for service import", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    const files = {
      "main.ec": `import OrderService from "https://example.com/broken.yml"\n`,
    };
    const { errors } = await resolveImportsAsync(files, mockFetch);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("Failed to fetch");
  });
});
