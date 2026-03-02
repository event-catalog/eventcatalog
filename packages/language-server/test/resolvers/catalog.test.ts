import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import {
  parseCatalogResources,
  parseCatalogChannels,
  parseCatalogServices,
  isCatalogPath,
} from "../../src/resolvers/catalog.js";
import { resolveSpecImportsAsync } from "../../src/resolvers/resolve.js";

const FIXTURES = resolve(__dirname, "../fixtures");
const TEST_CATALOG = resolve(FIXTURES, "test-catalog");

// ─── isCatalogPath ──────────────────────────────────────

describe("isCatalogPath", () => {
  it("returns true for directory-like paths", () => {
    expect(isCatalogPath("./my-catalog")).toBe(true);
    expect(isCatalogPath("../other-catalog")).toBe(true);
    expect(isCatalogPath("catalogs/production")).toBe(true);
  });

  it("returns false for spec file paths", () => {
    expect(isCatalogPath("./spec.yml")).toBe(false);
    expect(isCatalogPath("./spec.yaml")).toBe(false);
    expect(isCatalogPath("./spec.json")).toBe(false);
  });

  it("returns false for URLs", () => {
    expect(isCatalogPath("https://example.com/catalog")).toBe(false);
    expect(isCatalogPath("http://example.com/catalog")).toBe(false);
  });
});

// ─── parseCatalogResources ──────────────────────────────

describe("parseCatalogResources", () => {
  it("reads events from a catalog directory", async () => {
    const { messages, errors } = await parseCatalogResources(
      TEST_CATALOG,
      "events",
    );
    expect(errors).toEqual([]);
    expect(messages.size).toBeGreaterThanOrEqual(3);
    expect(messages.has("OrderCreated")).toBe(true);
    expect(messages.has("OrderShipped")).toBe(true);
    expect(messages.has("OrderCancelled")).toBe(true);
  });

  it("returns correct SpecMessage fields", async () => {
    const { messages } = await parseCatalogResources(TEST_CATALOG, "events");
    const orderCreated = messages.get("OrderCreated");
    expect(orderCreated).toEqual({
      name: "OrderCreated",
      displayName: "Order Created",
      version: "1.0.0",
      summary: "Fired when a new order is placed by a customer",
    });
  });

  it("returns error for non-existent directory", async () => {
    const { messages, errors } = await parseCatalogResources(
      "/non/existent/path",
      "events",
    );
    expect(messages.size).toBe(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("Catalog directory not found");
  });

  it("returns error for unsupported resource type", async () => {
    const { messages, errors } = await parseCatalogResources(
      TEST_CATALOG,
      "channels",
    );
    expect(messages.size).toBe(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("do not support resource type");
  });
});

// ─── End-to-end: resolveSpecImportsAsync with catalog ───

describe("resolveSpecImportsAsync with catalog imports", () => {
  const noopFetch = async () => "";

  it("resolves catalog event imports to .ec code", async () => {
    const files = {
      "main.ec": `import events { OrderCreated, OrderShipped } from "${TEST_CATALOG}"

visualizer main {
  service OrderService {
    sends event OrderCreated
    sends event OrderShipped
  }
}`,
    };

    const result = await resolveSpecImportsAsync(files, noopFetch, "/");
    const mainContent = result.files["main.ec"];

    expect(mainContent).toContain("event OrderCreated {");
    expect(mainContent).toContain('name "Order Created"');
    expect(mainContent).toContain("version 1.0.0");
    expect(mainContent).toContain(
      'summary "Fired when a new order is placed by a customer"',
    );
    expect(mainContent).toContain("event OrderShipped {");
    expect(mainContent).toContain('name "Order Shipped"');
    expect(mainContent).toContain("version 2.0.0");
    expect(mainContent).not.toContain("import events");
  });

  it("produces error for missing event in catalog", async () => {
    const files = {
      "main.ec": `import events { NonExistentEvent } from "${TEST_CATALOG}"`,
    };

    const result = await resolveSpecImportsAsync(files, noopFetch, "/");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(
      result.errors.some((e) => e.message.includes("NonExistentEvent")),
    ).toBe(true);
    expect(result.files["main.ec"]).toContain("// ERROR:");
  });

  it("does not resolve catalog imports when basePath is not provided", async () => {
    const files = {
      "main.ec": `import events { OrderCreated } from "./test-catalog"`,
    };

    // Without basePath, catalog imports should be left untouched
    const result = await resolveSpecImportsAsync(files, noopFetch);
    expect(result.files["main.ec"]).toContain("import events");
  });

  it("handles mixed spec and catalog imports", async () => {
    const specContent = `
asyncapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
channels:
  testChannel:
    address: test.channel
    messages:
      TestEvent:
        payload:
          type: object
components:
  messages:
    TestEvent:
      name: TestEvent
      summary: A test event from spec
`;

    const files = {
      "spec.yml": specContent,
      "main.ec": `import events { TestEvent } from "./spec.yml"
import events { OrderCreated } from "${TEST_CATALOG}"

visualizer main {
  service MyService {
    sends event TestEvent
    sends event OrderCreated
  }
}`,
    };

    const result = await resolveSpecImportsAsync(files, noopFetch, "/");
    const mainContent = result.files["main.ec"];

    // Both spec import and catalog import should be resolved
    expect(mainContent).toContain("event TestEvent {");
    expect(mainContent).toContain("event OrderCreated {");
    expect(mainContent).not.toContain("import events");
  });

  it("resolves relative catalog path against the importing file's directory", async () => {
    const files = {
      "main.ec": `import events { OrderCreated } from "./test-catalog"`,
    };

    // basePath is the fixtures directory, so "./test-catalog" relative to
    // the file at "main.ec" (in basePath) should resolve to FIXTURES/test-catalog
    const result = await resolveSpecImportsAsync(files, noopFetch, FIXTURES);
    expect(result.files["main.ec"]).toContain("event OrderCreated {");
    expect(result.files["main.ec"]).not.toContain("import events");
  });

  it("resolves relative catalog path for files in subdirectories", async () => {
    const files = {
      "sub/main.ec": `import events { OrderCreated } from "../test-catalog"`,
    };

    const result = await resolveSpecImportsAsync(files, noopFetch, FIXTURES);
    expect(result.files["sub/main.ec"]).toContain("event OrderCreated {");
    expect(result.files["sub/main.ec"]).not.toContain("import events");
  });

  it("preserves file order when catalog imports are resolved", async () => {
    // The active file (main.ec) should remain first even when it has a catalog
    // import that requires async resolution. Files without catalog imports
    // must not jump ahead in the output.
    const files = {
      "main.ec": `import events { OrderCreated } from "${TEST_CATALOG}"

visualizer main {
  event OrderCreated
}`,
      "other.ec": `service SomeService {
  version 1.0.0
}`,
    };

    const result = await resolveSpecImportsAsync(files, noopFetch, "/");
    const keys = Object.keys(result.files);
    expect(keys[0]).toBe("main.ec");
    expect(keys[1]).toBe("other.ec");
  });

  it("preserves file order with multiple files and catalog imports", async () => {
    const files = {
      "first.ec": `import events { OrderCreated } from "${TEST_CATALOG}"`,
      "second.ec": `service MyService { version 1.0.0 }`,
      "third.ec": `import events { OrderShipped } from "${TEST_CATALOG}"`,
    };

    const result = await resolveSpecImportsAsync(files, noopFetch, "/");
    const keys = Object.keys(result.files);
    expect(keys).toEqual(["first.ec", "second.ec", "third.ec"]);
    // Verify catalog imports were actually resolved
    expect(result.files["first.ec"]).toContain("event OrderCreated {");
    expect(result.files["third.ec"]).toContain("event OrderShipped {");
  });

  it("gracefully handles catalog resolution errors without crashing", async () => {
    const files = {
      "main.ec": `import events { OrderCreated } from "./nonexistent-catalog"`,
    };

    // Should not throw — errors should be captured
    const result = await resolveSpecImportsAsync(files, noopFetch, FIXTURES);
    expect(result.files["main.ec"]).toBeDefined();
    // Should have either an error comment or an error in the errors array
    const hasError =
      result.errors.length > 0 || result.files["main.ec"].includes("// ERROR:");
    expect(hasError).toBe(true);
  });
});

// ─── parseCatalogServices ───────────────────────────────

describe("parseCatalogServices", () => {
  it("reads services from a catalog directory", async () => {
    const { services, errors } = await parseCatalogServices(TEST_CATALOG);
    expect(errors).toEqual([]);
    expect(services.has("OrderService")).toBe(true);
  });

  it("returns correct SpecService fields", async () => {
    const { services } = await parseCatalogServices(TEST_CATALOG);
    const svc = services.get("OrderService")!;
    expect(svc.name).toBe("OrderService");
    expect(svc.version).toBe("1.0.0");
    expect(svc.summary).toBe("Manages order lifecycle");
  });

  it("includes sends and receives operations", async () => {
    const { services } = await parseCatalogServices(TEST_CATALOG);
    const svc = services.get("OrderService")!;
    const sends = svc.operations.filter((op) => op.action === "send");
    const receives = svc.operations.filter((op) => op.action === "receive");
    expect(sends.length).toBe(2);
    expect(receives.length).toBe(1);
    expect(sends.map((s) => s.messageName)).toContain("OrderCreated");
    expect(sends.map((s) => s.messageName)).toContain("OrderShipped");
    expect(receives[0].messageName).toBe("OrderCancelled");
  });

  it("includes message summaries from the catalog", async () => {
    const { services } = await parseCatalogServices(TEST_CATALOG);
    const svc = services.get("OrderService")!;
    const orderCreated = svc.messages.find((m) => m.name === "OrderCreated");
    expect(orderCreated).toBeDefined();
    expect(orderCreated!.summary).toBe(
      "Fired when a new order is placed by a customer",
    );
  });

  it("returns error for non-existent directory", async () => {
    const { services, errors } =
      await parseCatalogServices("/non/existent/path");
    expect(services.size).toBe(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("Catalog directory not found");
  });
});

// ─── End-to-end: service catalog imports ────────────────

describe("resolveSpecImportsAsync with service catalog imports", () => {
  const noopFetch = async () => "";

  it("resolves catalog service imports to .ec code", async () => {
    const files = {
      "main.ec": `import services { OrderService } from "${TEST_CATALOG}"

visualizer main {
  service OrderService
}`,
    };

    const result = await resolveSpecImportsAsync(files, noopFetch, "/");
    const mainContent = result.files["main.ec"];

    expect(mainContent).toContain("service OrderService {");
    expect(mainContent).toContain("version 1.0.0");
    expect(mainContent).toContain('summary "Manages order lifecycle"');
    expect(mainContent).toContain("sends event OrderCreated");
    expect(mainContent).toContain("sends event OrderShipped");
    expect(mainContent).toContain("receives event OrderCancelled");
    expect(mainContent).not.toContain("import services");
  });

  it("generates standalone message definitions with summaries", async () => {
    const files = {
      "main.ec": `import services { OrderService } from "${TEST_CATALOG}"

visualizer main {
  service OrderService
}`,
    };

    const result = await resolveSpecImportsAsync(files, noopFetch, "/");
    const mainContent = result.files["main.ec"];

    // Should contain standalone event definitions with summaries
    expect(mainContent).toContain("event OrderCreated {");
    expect(mainContent).toContain(
      'summary "Fired when a new order is placed by a customer"',
    );
    expect(mainContent).toContain("event OrderShipped {");
    expect(mainContent).toContain("event OrderCancelled {");
  });

  it("produces error for missing service in catalog", async () => {
    const files = {
      "main.ec": `import services { NonExistentService } from "${TEST_CATALOG}"`,
    };

    const result = await resolveSpecImportsAsync(files, noopFetch, "/");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(
      result.errors.some((e) => e.message.includes("NonExistentService")),
    ).toBe(true);
  });
});

// ─── parseCatalogResources for containers ────────────────

describe("parseCatalogResources for containers", () => {
  it("reads containers from a catalog directory", async () => {
    const { messages, errors } = await parseCatalogResources(
      TEST_CATALOG,
      "containers",
    );
    expect(errors).toEqual([]);
    expect(messages.size).toBeGreaterThanOrEqual(2);
    expect(messages.has("payments-db")).toBe(true);
    expect(messages.has("order-cache")).toBe(true);
  });

  it("returns correct SpecMessage fields for containers", async () => {
    const { messages } = await parseCatalogResources(
      TEST_CATALOG,
      "containers",
    );
    const paymentsDb = messages.get("payments-db");
    expect(paymentsDb).toEqual({
      name: "payments-db",
      displayName: "Payments DB",
      version: "1.0.0",
      summary: "Primary database for payment transactions",
    });
  });

  it("returns error for non-existent directory", async () => {
    const { messages, errors } = await parseCatalogResources(
      "/non/existent/path",
      "containers",
    );
    expect(messages.size).toBe(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("Catalog directory not found");
  });
});

// ─── End-to-end: container catalog imports ───────────────

describe("resolveSpecImportsAsync with container catalog imports", () => {
  const noopFetch = async () => "";

  it("resolves catalog container imports to .ec code", async () => {
    const files = {
      "main.ec": `import containers { payments-db, order-cache } from "${TEST_CATALOG}"

visualizer main {
  container payments-db
  container order-cache
}`,
    };

    const result = await resolveSpecImportsAsync(files, noopFetch, "/");
    const mainContent = result.files["main.ec"];

    expect(mainContent).toContain("container payments-db {");
    expect(mainContent).toContain('name "Payments DB"');
    expect(mainContent).toContain("version 1.0.0");
    expect(mainContent).toContain(
      'summary "Primary database for payment transactions"',
    );
    expect(mainContent).toContain("container order-cache {");
    expect(mainContent).toContain('name "Order Cache"');
    expect(mainContent).toContain("version 2.0.0");
    expect(mainContent).not.toContain("import containers");
  });

  it("produces error for missing container in catalog", async () => {
    const files = {
      "main.ec": `import containers { NonExistentContainer } from "${TEST_CATALOG}"`,
    };

    const result = await resolveSpecImportsAsync(files, noopFetch, "/");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(
      result.errors.some((e) => e.message.includes("NonExistentContainer")),
    ).toBe(true);
    expect(result.files["main.ec"]).toContain("// ERROR:");
  });

  it("handles mixed container and event imports", async () => {
    const files = {
      "main.ec": `import events { OrderCreated } from "${TEST_CATALOG}"
import containers { payments-db } from "${TEST_CATALOG}"

visualizer main {
  service OrderService {
    sends event OrderCreated
    writes-to container payments-db
  }
}`,
    };

    const result = await resolveSpecImportsAsync(files, noopFetch, "/");
    const mainContent = result.files["main.ec"];

    expect(mainContent).toContain("event OrderCreated {");
    expect(mainContent).toContain("container payments-db {");
    expect(mainContent).not.toContain("import events");
    expect(mainContent).not.toContain("import containers");
  });

  it("resolves relative catalog path for container imports", async () => {
    const files = {
      "main.ec": `import containers { payments-db } from "./test-catalog"`,
    };

    const result = await resolveSpecImportsAsync(files, noopFetch, FIXTURES);
    expect(result.files["main.ec"]).toContain("container payments-db {");
    expect(result.files["main.ec"]).not.toContain("import containers");
  });
});

// ─── parseCatalogChannels ────────────────────────────────

describe("parseCatalogChannels", () => {
  it("reads channels from a catalog directory", async () => {
    const { channels, errors } = await parseCatalogChannels(TEST_CATALOG);
    expect(errors).toEqual([]);
    expect(channels.size).toBeGreaterThanOrEqual(2);
    expect(channels.has("order-events")).toBe(true);
    expect(channels.has("payment-queue")).toBe(true);
  });

  it("returns correct SpecChannel fields", async () => {
    const { channels } = await parseCatalogChannels(TEST_CATALOG);
    const orderEvents = channels.get("order-events");
    expect(orderEvents).toEqual({
      name: "order-events",
      displayName: "Order Events",
      version: "1.0.0",
      summary: "EventBus for order domain events",
      address: "orders.events",
      protocol: "kafka",
    });
  });

  it("returns error for non-existent directory", async () => {
    const { channels, errors } =
      await parseCatalogChannels("/non/existent/path");
    expect(channels.size).toBe(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("Catalog directory not found");
  });
});

// ─── End-to-end: channel catalog imports ─────────────────

describe("resolveSpecImportsAsync with channel catalog imports", () => {
  const noopFetch = async () => "";

  it("resolves catalog channel imports to .ec code", async () => {
    const files = {
      "main.ec": `import channels { order-events, payment-queue } from "${TEST_CATALOG}"

visualizer main {
  service OrderService {
    sends event OrderCreated to order-events
  }
}`,
    };

    const result = await resolveSpecImportsAsync(files, noopFetch, "/");
    const mainContent = result.files["main.ec"];

    expect(mainContent).toContain("channel order-events {");
    expect(mainContent).toContain('name "Order Events"');
    expect(mainContent).toContain("version 1.0.0");
    expect(mainContent).toContain('summary "EventBus for order domain events"');
    expect(mainContent).toContain('address "orders.events"');
    expect(mainContent).toContain('protocol "kafka"');
    expect(mainContent).toContain("channel payment-queue {");
    expect(mainContent).toContain('name "Payment Queue"');
    expect(mainContent).toContain("version 2.0.0");
    expect(mainContent).not.toContain("import channels");
  });

  it("produces error for missing channel in catalog", async () => {
    const files = {
      "main.ec": `import channels { NonExistentChannel } from "${TEST_CATALOG}"`,
    };

    const result = await resolveSpecImportsAsync(files, noopFetch, "/");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(
      result.errors.some((e) => e.message.includes("NonExistentChannel")),
    ).toBe(true);
    expect(result.files["main.ec"]).toContain("// ERROR:");
  });

  it("handles mixed channel and event imports", async () => {
    const files = {
      "main.ec": `import events { OrderCreated } from "${TEST_CATALOG}"
import channels { order-events } from "${TEST_CATALOG}"

visualizer main {
  service OrderService {
    sends event OrderCreated to order-events
  }
}`,
    };

    const result = await resolveSpecImportsAsync(files, noopFetch, "/");
    const mainContent = result.files["main.ec"];

    expect(mainContent).toContain("event OrderCreated {");
    expect(mainContent).toContain("channel order-events {");
    expect(mainContent).not.toContain("import events");
    expect(mainContent).not.toContain("import channels");
  });

  it("resolves relative catalog path for channel imports", async () => {
    const files = {
      "main.ec": `import channels { order-events } from "./test-catalog"`,
    };

    const result = await resolveSpecImportsAsync(files, noopFetch, FIXTURES);
    expect(result.files["main.ec"]).toContain("channel order-events {");
    expect(result.files["main.ec"]).not.toContain("import channels");
  });
});
