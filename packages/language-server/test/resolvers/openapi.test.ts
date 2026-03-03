import { describe, it, expect, vi } from "vitest";
import {
  parseOpenApiSpec,
  extractOpenApiService,
  openApiServiceToEc,
  openApiMessageToEc,
  resolveAsyncApiImports as resolveImports,
  resolveAsyncApiImportsAsync as resolveImportsAsync,
  detectSpecType,
  parseSpec,
} from "../../src/resolvers/index.js";

// ─── Fixtures ───────────────────────────────────────────

const openApiV30Spec = `
openapi: 3.0.3
info:
  title: Orders API
  version: 1.0.0
  description: API for managing orders
paths:
  /orders:
    get:
      operationId: GetOrders
      summary: List all orders
    post:
      operationId: CreateOrder
      summary: Create a new order
  /orders/{id}:
    get:
      operationId: GetOrder
      summary: Get order by ID
    put:
      operationId: UpdateOrder
      summary: Update an existing order
    delete:
      operationId: DeleteOrder
      summary: Delete an order
`;

const openApiV31Spec = `
openapi: 3.1.0
info:
  title: Users API
  version: 2.0.0
  description: API for managing users
paths:
  /users:
    get:
      operationId: ListUsers
      summary: List all users
    post:
      operationId: CreateUser
      summary: Create a new user
  /users/{userId}:
    get:
      operationId: GetUser
      summary: Get a single user
    patch:
      operationId: UpdateUser
      summary: Update user details
    delete:
      operationId: DeleteUser
      summary: Remove a user
`;

const openApiNoOperationIds = `
openapi: 3.0.3
info:
  title: Products API
  version: 1.0.0
paths:
  /products:
    get:
      summary: List products
    post:
      summary: Create product
  /products/{id}/reviews:
    get:
      summary: Get reviews for a product
`;

const openApiWithOverrides = `
openapi: 3.0.3
info:
  title: Hybrid API
  version: 1.0.0
paths:
  /webhooks:
    post:
      operationId: HandleWebhook
      summary: Handle incoming webhook
      x-eventcatalog-message-type: query
  /data:
    get:
      operationId: FetchData
      summary: Fetch data
      x-eventcatalog-message-type: command
`;

const asyncApiV3Spec = `
asyncapi: 3.0.0
info:
  title: Orders Async API
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
operations:
  onOrderCreated:
    action: send
    channel:
      $ref: '#/channels/orderCreated'
components:
  messages:
    OrderCreated:
      summary: Fired when a new order is placed
`;

// ─── detectSpecType ─────────────────────────────────────

describe("detectSpecType", () => {
  it("detects OpenAPI spec", () => {
    expect(detectSpecType(openApiV30Spec)).toBe("openapi");
    expect(detectSpecType(openApiV31Spec)).toBe("openapi");
  });

  it("detects AsyncAPI spec", () => {
    expect(detectSpecType(asyncApiV3Spec)).toBe("asyncapi");
  });

  it("returns unknown for non-spec content", () => {
    expect(detectSpecType("just some text")).toBe("unknown");
    expect(detectSpecType("{}")).toBe("unknown");
  });

  it("detects JSON OpenAPI spec", () => {
    const jsonSpec = JSON.stringify({
      openapi: "3.0.3",
      info: { title: "Test", version: "1.0.0" },
      paths: {},
    });
    expect(detectSpecType(jsonSpec)).toBe("openapi");
  });

  it("returns unknown for invalid content", () => {
    expect(detectSpecType("{{invalid")).toBe("unknown");
  });
});

// ─── parseOpenApiSpec ───────────────────────────────────

describe("parseOpenApiSpec", () => {
  it("extracts operations from v3.0 spec", () => {
    const { messages, errors } = parseOpenApiSpec(openApiV30Spec);
    expect(errors).toHaveLength(0);
    expect(messages.size).toBe(5);
    expect(messages.has("GetOrders")).toBe(true);
    expect(messages.has("CreateOrder")).toBe(true);
    expect(messages.has("GetOrder")).toBe(true);
    expect(messages.has("UpdateOrder")).toBe(true);
    expect(messages.has("DeleteOrder")).toBe(true);
  });

  it("extracts operations from v3.1 spec", () => {
    const { messages, errors } = parseOpenApiSpec(openApiV31Spec);
    expect(errors).toHaveLength(0);
    expect(messages.size).toBe(5);
    expect(messages.has("ListUsers")).toBe(true);
    expect(messages.has("CreateUser")).toBe(true);
  });

  it("maps GET to query and others to command", () => {
    const { messages } = parseOpenApiSpec(openApiV30Spec);
    expect(messages.get("GetOrders")!.messageType).toBe("query");
    expect(messages.get("GetOrder")!.messageType).toBe("query");
    expect(messages.get("CreateOrder")!.messageType).toBe("command");
    expect(messages.get("UpdateOrder")!.messageType).toBe("command");
    expect(messages.get("DeleteOrder")!.messageType).toBe("command");
  });

  it("uses operationId when available", () => {
    const { messages } = parseOpenApiSpec(openApiV30Spec);
    expect(messages.has("GetOrders")).toBe(true);
    expect(messages.has("CreateOrder")).toBe(true);
  });

  it("derives name from method+path when no operationId", () => {
    const { messages } = parseOpenApiSpec(openApiNoOperationIds);
    expect(messages.has("GetProducts")).toBe(true);
    expect(messages.has("PostProducts")).toBe(true);
    expect(messages.has("GetProductsIdReviews")).toBe(true);
  });

  it("applies info.version to all messages", () => {
    const { messages } = parseOpenApiSpec(openApiV30Spec);
    for (const msg of messages.values()) {
      expect(msg.version).toBe("1.0.0");
    }
  });

  it("preserves summary and description", () => {
    const { messages } = parseOpenApiSpec(openApiV30Spec);
    expect(messages.get("GetOrders")!.summary).toBe("List all orders");
    expect(messages.get("CreateOrder")!.summary).toBe("Create a new order");
  });

  it("respects x-eventcatalog-message-type override", () => {
    const { messages } = parseOpenApiSpec(openApiWithOverrides);
    expect(messages.get("HandleWebhook")!.messageType).toBe("query");
    expect(messages.get("FetchData")!.messageType).toBe("command");
  });

  it("returns error for invalid YAML", () => {
    const { messages, errors } = parseOpenApiSpec("{{invalid yaml");
    expect(messages.size).toBe(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("Failed to parse OpenAPI spec");
  });

  it("returns error for empty content", () => {
    const { messages, errors } = parseOpenApiSpec("");
    expect(messages.size).toBe(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("empty or invalid");
  });

  it("returns error for unsupported version", () => {
    const spec = `openapi: 2.0.0\ninfo:\n  title: Test\n  version: 1.0.0\npaths: {}`;
    const { errors } = parseOpenApiSpec(spec);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("Unsupported OpenAPI version");
  });

  it("parses JSON OpenAPI spec", () => {
    const jsonSpec = JSON.stringify({
      openapi: "3.0.3",
      info: { title: "JSON API", version: "1.0.0" },
      paths: {
        "/items": {
          get: { operationId: "ListItems", summary: "List items" },
        },
      },
    });
    const { messages, errors } = parseOpenApiSpec(jsonSpec);
    expect(errors).toHaveLength(0);
    expect(messages.has("ListItems")).toBe(true);
    expect(messages.get("ListItems")!.messageType).toBe("query");
  });

  it("handles spec with no paths", () => {
    const spec = `openapi: 3.0.3\ninfo:\n  title: Empty\n  version: 1.0.0`;
    const { messages, errors } = parseOpenApiSpec(spec);
    expect(errors).toHaveLength(0);
    expect(messages.size).toBe(0);
  });

  it("handles numeric openapi version (YAML parses 3.1 as number)", () => {
    // YAML `openapi: 3.1` parses as a number, not a string
    const spec = `openapi: 3.1\ninfo:\n  title: Numeric\n  version: 1.0.0\npaths:\n  /items:\n    get:\n      operationId: ListItems\n      summary: List items`;
    const { messages, errors } = parseOpenApiSpec(spec);
    expect(errors).toHaveLength(0);
    expect(messages.has("ListItems")).toBe(true);
  });

  it("handles numeric openapi version that is unsupported", () => {
    const spec = `openapi: 2.0\ninfo:\n  title: Old\n  version: 1.0.0\npaths: {}`;
    const { errors } = parseOpenApiSpec(spec);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("Unsupported OpenAPI version");
  });
});

// ─── extractOpenApiService ──────────────────────────────

describe("extractOpenApiService", () => {
  it("extracts service with name from info.title", () => {
    const { service, errors } = extractOpenApiService(openApiV30Spec);
    expect(errors).toHaveLength(0);
    expect(service.name).toBe("OrdersAPI");
    expect(service.version).toBe("1.0.0");
    expect(service.summary).toBe("API for managing orders");
  });

  it("uses provided serviceName override", () => {
    const { service } = extractOpenApiService(openApiV30Spec, "MyOrderService");
    expect(service.name).toBe("MyOrderService");
  });

  it("all operations are receive action", () => {
    const { service } = extractOpenApiService(openApiV30Spec);
    for (const op of service.operations) {
      expect(op.action).toBe("receive");
    }
  });

  it("generates no channels", () => {
    const { service } = extractOpenApiService(openApiV30Spec);
    expect(service.channels).toHaveLength(0);
  });

  it("operations have empty channelName", () => {
    const { service } = extractOpenApiService(openApiV30Spec);
    for (const op of service.operations) {
      expect(op.channelName).toBe("");
    }
  });

  it("operations have correct messageType", () => {
    const { service } = extractOpenApiService(openApiV30Spec);
    const getOps = service.operations.filter(
      (op) => op.messageType === "query",
    );
    const cmdOps = service.operations.filter(
      (op) => op.messageType === "command",
    );
    expect(getOps.length).toBe(2); // GetOrders, GetOrder
    expect(cmdOps.length).toBe(3); // CreateOrder, UpdateOrder, DeleteOrder
  });

  it("includes all messages", () => {
    const { service } = extractOpenApiService(openApiV30Spec);
    expect(service.messages).toHaveLength(5);
  });

  it("returns errors for invalid spec", () => {
    const { service, errors } = extractOpenApiService("{{invalid");
    expect(errors.length).toBeGreaterThan(0);
    expect(service.name).toBe("UnknownService");
  });
});

// ─── openApiServiceToEc ────────────────────────────────

describe("openApiServiceToEc", () => {
  it("generates EC DSL without channels", () => {
    const { service } = extractOpenApiService(openApiV30Spec);
    const ec = openApiServiceToEc(service);

    expect(ec).toContain("service OrdersAPI {");
    expect(ec).toContain("version 1.0.0");
    expect(ec).toContain('summary "API for managing orders"');
    expect(ec).toContain("receives query GetOrders@1.0.0");
    expect(ec).toContain("receives command CreateOrder@1.0.0");
    expect(ec).toContain("receives command UpdateOrder@1.0.0");
    expect(ec).toContain("receives command DeleteOrder@1.0.0");
    expect(ec).toContain("receives query GetOrder@1.0.0");
    // No channel definitions
    expect(ec).not.toContain("channel ");
    // No to/from clauses
    expect(ec).not.toContain(" to ");
    expect(ec).not.toContain(" from ");
  });

  it("generates standalone message definitions with summaries", () => {
    const { service } = extractOpenApiService(openApiV30Spec);
    const ec = openApiServiceToEc(service);

    // Standalone query definitions with @api annotations
    expect(ec).toContain(
      'query GetOrders {\n  version 1.0.0\n  summary "List all orders"\n  @api(method: "GET", path: "/orders")\n}',
    );
    expect(ec).toContain(
      'query GetOrder {\n  version 1.0.0\n  summary "Get order by ID"\n  @api(method: "GET", path: "/orders/{id}")\n}',
    );
    // Standalone command definitions with @api annotations
    expect(ec).toContain(
      'command CreateOrder {\n  version 1.0.0\n  summary "Create a new order"\n  @api(method: "POST", path: "/orders")\n}',
    );
    expect(ec).toContain(
      'command UpdateOrder {\n  version 1.0.0\n  summary "Update an existing order"\n  @api(method: "PUT", path: "/orders/{id}")\n}',
    );
    expect(ec).toContain(
      'command DeleteOrder {\n  version 1.0.0\n  summary "Delete an order"\n  @api(method: "DELETE", path: "/orders/{id}")\n}',
    );
  });
});

// ─── openApiMessageToEc ────────────────────────────────

describe("openApiMessageToEc", () => {
  it("generates command definition", () => {
    const ec = openApiMessageToEc({
      name: "CreateOrder",
      summary: "Create a new order",
      version: "1.0.0",
      messageType: "command",
    });
    expect(ec).toContain("command CreateOrder {");
    expect(ec).toContain("version 1.0.0");
    expect(ec).toContain('summary "Create a new order"');
  });

  it("generates query definition", () => {
    const ec = openApiMessageToEc({
      name: "GetOrders",
      summary: "List all orders",
      version: "1.0.0",
      messageType: "query",
    });
    expect(ec).toContain("query GetOrders {");
    expect(ec).toContain("version 1.0.0");
    expect(ec).toContain('summary "List all orders"');
  });
});

// ─── resolveImports (unified, sync) with OpenAPI ───────

describe("resolveImports with OpenAPI", () => {
  it("resolves command import from OpenAPI spec", () => {
    const { files, errors } = resolveImports({
      "main.ec": `import commands { CreateOrder } from "./api.yml"\n`,
      "api.yml": openApiV30Spec,
    });
    expect(errors).toHaveLength(0);
    expect(files["main.ec"]).toContain("command CreateOrder {");
    expect(files["main.ec"]).toContain("version 1.0.0");
    expect(files["main.ec"]).toContain('summary "Create a new order"');
  });

  it("resolves query import from OpenAPI spec", () => {
    const { files, errors } = resolveImports({
      "main.ec": `import queries { GetOrders } from "./api.yml"\n`,
      "api.yml": openApiV30Spec,
    });
    expect(errors).toHaveLength(0);
    expect(files["main.ec"]).toContain("query GetOrders {");
  });

  it("resolves multiple imports from OpenAPI spec", () => {
    const { files, errors } = resolveImports({
      "main.ec": `import commands { CreateOrder, UpdateOrder } from "./api.yml"\n`,
      "api.yml": openApiV30Spec,
    });
    expect(errors).toHaveLength(0);
    expect(files["main.ec"]).toContain("command CreateOrder {");
    expect(files["main.ec"]).toContain("command UpdateOrder {");
  });

  it("ignores commented import lines", () => {
    const { files, errors } = resolveImports({
      "main.ec": [
        `// import commands { CreateOrder } from "./api.yml"`,
        `// import queries { GetOrder } from "./api.yml"`,
        `visualizer main {`,
        `  name "Test"`,
        `}`,
        "",
      ].join("\n"),
      "api.yml": openApiV30Spec,
    });
    expect(errors).toHaveLength(0);
    expect(files["main.ec"]).toContain(
      `// import commands { CreateOrder } from "./api.yml"`,
    );
    expect(files["main.ec"]).toContain(
      `// import queries { GetOrder } from "./api.yml"`,
    );
    expect(files["main.ec"]).not.toContain("command CreateOrder {");
  });

  it("returns error for event import from OpenAPI spec", () => {
    const { errors } = resolveImports({
      "main.ec": `import events { CreateOrder } from "./api.yml"\n`,
      "api.yml": openApiV30Spec,
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain("commands and queries, not events");
  });

  it("returns error for channel import from OpenAPI spec", () => {
    const { errors } = resolveImports({
      "main.ec": `import channels { orders } from "./api.yml"\n`,
      "api.yml": openApiV30Spec,
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain("do not contain channels");
  });

  it("returns error for missing message in OpenAPI spec", () => {
    const { errors } = resolveImports({
      "main.ec": `import commands { NonExistent } from "./api.yml"\n`,
      "api.yml": openApiV30Spec,
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('"NonExistent" not found');
    expect(errors[0].message).toContain("Available:");
  });

  it("returns error when importing a query as a command", () => {
    const { errors } = resolveImports({
      "main.ec": `import commands { GetOrders } from "./api.yml"\n`,
      "api.yml": openApiV30Spec,
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('"GetOrders" is a query');
    expect(errors[0].message).toContain("import queries { GetOrders }");
  });

  it("returns error when importing a command as a query", () => {
    const { errors } = resolveImports({
      "main.ec": `import queries { CreateOrder } from "./api.yml"\n`,
      "api.yml": openApiV30Spec,
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('"CreateOrder" is a command');
    expect(errors[0].message).toContain("import commands { CreateOrder }");
  });

  it("resolves service import from OpenAPI spec", () => {
    const { files, errors } = resolveImports({
      "main.ec": `import OrdersAPI from "./api.yml"\n`,
      "api.yml": openApiV30Spec,
    });
    expect(errors).toHaveLength(0);
    expect(files["main.ec"]).toContain("service OrdersAPI {");
    expect(files["main.ec"]).toContain("receives command CreateOrder@1.0.0");
    expect(files["main.ec"]).toContain("receives query GetOrders@1.0.0");
    expect(files["main.ec"]).not.toContain("channel ");
  });

  it("resolves service import with custom name", () => {
    const { files, errors } = resolveImports({
      "main.ec": `import MyService from "./api.yml"\n`,
      "api.yml": openApiV30Spec,
    });
    expect(errors).toHaveLength(0);
    expect(files["main.ec"]).toContain("service MyService {");
  });

  it("resolves command import from multi-level nested OpenAPI spec", () => {
    const { files, errors } = resolveImports({
      "main.ec": `import commands { CreateOrder } from "./services/pricing/api.yml"\n`,
      "services/pricing/api.yml": openApiV30Spec,
    });
    expect(errors).toHaveLength(0);
    expect(files["main.ec"]).toContain("command CreateOrder {");
  });

  it("resolves service import from multi-level nested OpenAPI spec", () => {
    const { files, errors } = resolveImports({
      "main.ec": `import PricingAPI from "./services/pricing/api.yml"\n`,
      "services/pricing/api.yml": openApiV30Spec,
    });
    expect(errors).toHaveLength(0);
    expect(files["main.ec"]).toContain("service PricingAPI {");
  });

  it("excludes spec files from output", () => {
    const { files } = resolveImports({
      "main.ec": `import commands { CreateOrder } from "./api.yml"\n`,
      "api.yml": openApiV30Spec,
    });
    expect(files["api.yml"]).toBeUndefined();
  });

  it("resolves JSON OpenAPI spec", () => {
    const jsonSpec = JSON.stringify({
      openapi: "3.0.3",
      info: { title: "JSON API", version: "1.0.0" },
      paths: {
        "/items": {
          get: { operationId: "ListItems", summary: "List items" },
          post: { operationId: "CreateItem", summary: "Create item" },
        },
      },
    });
    const { files, errors } = resolveImports({
      "main.ec": `import queries { ListItems } from "./api.json"\n`,
      "api.json": jsonSpec,
    });
    expect(errors).toHaveLength(0);
    expect(files["main.ec"]).toContain("query ListItems {");
  });
});

// ─── resolveImportsAsync with OpenAPI ───────────────────

describe("resolveImportsAsync with OpenAPI", () => {
  it("resolves remote OpenAPI spec", async () => {
    const fetchFn = vi.fn().mockResolvedValue(openApiV30Spec);

    const { files, errors } = await resolveImportsAsync(
      {
        "main.ec": `import commands { CreateOrder } from "https://example.com/api.yml"\n`,
      },
      fetchFn,
    );
    expect(errors).toHaveLength(0);
    expect(fetchFn).toHaveBeenCalledWith("https://example.com/api.yml");
    expect(files["main.ec"]).toContain("command CreateOrder {");
  });

  it("resolves remote OpenAPI service import", async () => {
    const fetchFn = vi.fn().mockResolvedValue(openApiV30Spec);

    const { files, errors } = await resolveImportsAsync(
      {
        "main.ec": `import OrdersAPI from "https://example.com/api.yml"\n`,
      },
      fetchFn,
    );
    expect(errors).toHaveLength(0);
    expect(files["main.ec"]).toContain("service OrdersAPI {");
    expect(files["main.ec"]).toContain("receives command CreateOrder@1.0.0");
  });

  it("handles fetch errors", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("Network error"));

    const { errors } = await resolveImportsAsync(
      {
        "main.ec": `import commands { CreateOrder } from "https://example.com/api.yml"\n`,
      },
      fetchFn,
    );
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain("Failed to fetch");
  });
});

// ─── Mixed AsyncAPI + OpenAPI ───────────────────────────

describe("mixed AsyncAPI + OpenAPI imports", () => {
  it("resolves imports from both spec types in same file", () => {
    const { files, errors } = resolveImports({
      "main.ec": [
        `import events { OrderCreated } from "./async.yml"`,
        `import commands { CreateOrder } from "./api.yml"`,
        "",
      ].join("\n"),
      "async.yml": asyncApiV3Spec,
      "api.yml": openApiV30Spec,
    });
    expect(errors).toHaveLength(0);
    expect(files["main.ec"]).toContain("event OrderCreated {");
    expect(files["main.ec"]).toContain("command CreateOrder {");
  });

  it("resolves service imports from both spec types", () => {
    const { files, errors } = resolveImports({
      "main.ec": [
        `import OrdersAsyncService from "./async.yml"`,
        `import OrdersRestAPI from "./api.yml"`,
        "",
      ].join("\n"),
      "async.yml": asyncApiV3Spec,
      "api.yml": openApiV30Spec,
    });
    expect(errors).toHaveLength(0);
    // AsyncAPI service has channels
    expect(files["main.ec"]).toContain("service OrdersAsyncService {");
    expect(files["main.ec"]).toContain("channel orderCreated {");
    // OpenAPI service has no channels
    expect(files["main.ec"]).toContain("service OrdersRestAPI {");
    expect(files["main.ec"]).toContain("receives command CreateOrder@1.0.0");
  });

  it("handles mixed resource and service imports", () => {
    const { files, errors } = resolveImports({
      "main.ec": [
        `import events { OrderCreated } from "./async.yml"`,
        `import OrdersRestAPI from "./api.yml"`,
        "",
      ].join("\n"),
      "async.yml": asyncApiV3Spec,
      "api.yml": openApiV30Spec,
    });
    expect(errors).toHaveLength(0);
    expect(files["main.ec"]).toContain("event OrderCreated {");
    expect(files["main.ec"]).toContain("service OrdersRestAPI {");
  });

  it("async resolves mixed remote specs", async () => {
    const fetchFn = vi.fn().mockImplementation((url: string) => {
      if (url.includes("async")) return Promise.resolve(asyncApiV3Spec);
      if (url.includes("openapi")) return Promise.resolve(openApiV30Spec);
      return Promise.reject(new Error("Unknown URL"));
    });

    const { files, errors } = await resolveImportsAsync(
      {
        "main.ec": [
          `import events { OrderCreated } from "https://example.com/async.yml"`,
          `import commands { CreateOrder } from "https://example.com/openapi.yml"`,
          "",
        ].join("\n"),
      },
      fetchFn,
    );
    expect(errors).toHaveLength(0);
    expect(files["main.ec"]).toContain("event OrderCreated {");
    expect(files["main.ec"]).toContain("command CreateOrder {");
  });

  it("excludes both spec file types from output", () => {
    const { files } = resolveImports({
      "main.ec": [
        `import events { OrderCreated } from "./async.yml"`,
        `import commands { CreateOrder } from "./api.yml"`,
        "",
      ].join("\n"),
      "async.yml": asyncApiV3Spec,
      "api.yml": openApiV30Spec,
    });
    expect(files["async.yml"]).toBeUndefined();
    expect(files["api.yml"]).toBeUndefined();
    expect(files["main.ec"]).toBeDefined();
  });
});
