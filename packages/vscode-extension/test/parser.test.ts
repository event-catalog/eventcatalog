import { describe, it, expect } from "vitest";
import { parseWorkspaceFiles } from "../dist/parser.js";

const asyncapiSpec = `
asyncapi: 3.0.0
info:
  title: Orders API
  version: 1.0.0
components:
  messages:
    OrderCreated:
      summary: Fired when a new order is placed
`;

const asyncapiSpecWithOps = `
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
operations:
  sendOrderCreated:
    action: send
    channel:
      $ref: '#/channels/orderCreated'
    summary: Publishes when a new order is placed
components:
  messages:
    OrderCreated:
      summary: Fired when a new order is placed
`;

describe("parseWorkspaceFiles", () => {
  it("parses a single .ec file", async () => {
    const files = {
      "main.ec": `visualizer main {
  name "Test"
  service Foo { version 1.0.0 }
}`,
    };
    const result = await parseWorkspaceFiles(
      files,
      undefined,
      undefined,
      "main.ec",
    );
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].type).toBe("service");
  });

  it("broken sibling .ec file does not break the active file preview", async () => {
    const files = {
      "main.ec": `visualizer main {
  name "Test"
  service Foo { version 1.0.0 }
}`,
      "broken.ec": `this is not valid ec syntax {{{`,
    };
    const result = await parseWorkspaceFiles(
      files,
      undefined,
      undefined,
      "main.ec",
    );
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].label).toBe("Foo");
  });

  it("includes imported .ec files in the parse", async () => {
    const files = {
      "main.ec": `import { Bar } from "./other.ec"
visualizer main {
  name "Test"
  service Foo {
    version 1.0.0
    sends { event Bar }
  }
}`,
      "other.ec": `event Bar { version 1.0.0 }`,
    };
    const result = await parseWorkspaceFiles(
      files,
      undefined,
      undefined,
      "main.ec",
    );
    expect(result.nodes.length).toBeGreaterThanOrEqual(2);
    const types = result.nodes.map((n: any) => n.type);
    expect(types).toContain("service");
    expect(types).toContain("event");
  });

  it("excludes unrelated .ec files that are not imported", async () => {
    const files = {
      "main.ec": `visualizer main {
  name "Test"
  service Svc { version 1.0.0 }
}`,
      "unrelated.ec": `service Other { version 2.0.0 }`,
    };
    const result = await parseWorkspaceFiles(
      files,
      undefined,
      undefined,
      "main.ec",
    );
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].label).toBe("Svc");
  });

  it("multiple broken .ec files do not affect the active file", async () => {
    const files = {
      "main.ec": `visualizer main {
  name "Test"
  service A { version 1.0.0 }
  service B { version 2.0.0 }
}`,
      "broken1.ec": `totally broken {{{ `,
      "broken2.ec": `also broken !!!`,
    };
    const result = await parseWorkspaceFiles(
      files,
      undefined,
      undefined,
      "main.ec",
    );
    expect(result.nodes).toHaveLength(2);
  });

  it("resolves spec imports from nested folders", async () => {
    const files = {
      "main.ec": `import events { OrderCreated } from "./specs/api.yml"
visualizer main {
  name "Test"
  service Foo {
    version 1.0.0
    sends { event OrderCreated }
  }
}`,
      "specs/api.yml": asyncapiSpec,
    };
    const result = await parseWorkspaceFiles(
      files,
      undefined,
      undefined,
      "main.ec",
    );
    expect(result.nodes.length).toBeGreaterThanOrEqual(2);
    const types = result.nodes.map((n: any) => n.type);
    expect(types).toContain("service");
    expect(types).toContain("event");
  });

  it("resolves spec imports from nested .ec file to parent directory", async () => {
    const files = {
      "sub/main.ec": `import events { OrderCreated } from "../api.yml"
visualizer main {
  name "Test"
  service Foo {
    version 1.0.0
    sends { event OrderCreated }
  }
}`,
      "api.yml": asyncapiSpec,
    };
    const result = await parseWorkspaceFiles(
      files,
      undefined,
      undefined,
      "sub/main.ec",
    );
    expect(result.nodes.length).toBeGreaterThanOrEqual(2);
    const types = result.nodes.map((n: any) => n.type);
    expect(types).toContain("service");
    expect(types).toContain("event");
  });

  it("follows transitive .ec imports", async () => {
    const files = {
      "main.ec": `import { Baz } from "./mid.ec"
visualizer main {
  name "Test"
  service Foo {
    version 1.0.0
    sends { event Baz }
  }
}`,
      "mid.ec": `import { Baz } from "./leaf.ec"`,
      "leaf.ec": `event Baz { version 1.0.0 }`,
    };
    const result = await parseWorkspaceFiles(
      files,
      undefined,
      undefined,
      "main.ec",
    );
    expect(result.nodes.length).toBeGreaterThanOrEqual(2);
    const types = result.nodes.map((n: any) => n.type);
    expect(types).toContain("service");
    expect(types).toContain("event");
  });

  it("shows empty state for visualizer with no resources", async () => {
    const files = {
      "main.ec": `visualizer main { name "Empty" }`,
    };
    const result = await parseWorkspaceFiles(
      files,
      undefined,
      undefined,
      "main.ec",
    );
    expect(result.nodes).toHaveLength(0);
    expect(result.visualizers).toContain("main");
  });

  it("resolves service import from nested folder", async () => {
    const files = {
      "main.ec": `import Service from "./asyncapi-files/one.yml"
visualizer main {
  name "View Name"
  service Service
}`,
      "asyncapi-files/one.yml": asyncapiSpecWithOps,
    };
    const result = await parseWorkspaceFiles(
      files,
      undefined,
      undefined,
      "main.ec",
    );
    const serviceNode = result.nodes.find((n: any) => n.type === "service");
    expect(serviceNode).toBeDefined();
    expect(serviceNode!.label).toBe("Service");
    // The service should have its events resolved with summaries
    const eventNode = result.nodes.find((n: any) => n.type === "event");
    expect(eventNode).toBeDefined();
    expect(eventNode!.metadata?.summary).toBe(
      "Fired when a new order is placed",
    );
  });

  it("event import from nested folder includes summary and version", async () => {
    // Bug: importing from "./asyncapi-files/one.yml" shows the event but without
    // summary/version, while importing from "./one.yml" shows them correctly.
    const files = {
      "main.ec": `import events { OrderCancelled } from "./asyncapi-files/one.yml"
visualizer main {
  name "View Name"
  event OrderCancelled
}`,
      "asyncapi-files/one.yml": `
asyncapi: 3.0.0
info:
  title: Orders API
  version: 1.0.0
components:
  messages:
    OrderCancelled:
      summary: Fired when an order is cancelled
`,
    };
    const result = await parseWorkspaceFiles(
      files,
      undefined,
      undefined,
      "main.ec",
    );
    const eventNode = result.nodes.find((n: any) => n.type === "event");
    expect(eventNode).toBeDefined();
    expect(eventNode!.label).toBe("OrderCancelled");
    expect(eventNode!.metadata?.summary).toBe(
      "Fired when an order is cancelled",
    );
    expect(eventNode!.metadata?.version).toBe("1.0.0");
  });

  it("event import from same directory includes summary and version", async () => {
    // Control test: same spec but from same directory — should work
    const files = {
      "main.ec": `import events { OrderCancelled } from "./one.yml"
visualizer main {
  name "View Name"
  event OrderCancelled
}`,
      "one.yml": `
asyncapi: 3.0.0
info:
  title: Orders API
  version: 1.0.0
components:
  messages:
    OrderCancelled:
      summary: Fired when an order is cancelled
`,
    };
    const result = await parseWorkspaceFiles(
      files,
      undefined,
      undefined,
      "main.ec",
    );
    const eventNode = result.nodes.find((n: any) => n.type === "event");
    expect(eventNode).toBeDefined();
    expect(eventNode!.label).toBe("OrderCancelled");
    expect(eventNode!.metadata?.summary).toBe(
      "Fired when an order is cancelled",
    );
    expect(eventNode!.metadata?.version).toBe("1.0.0");
  });

  it("resolves multi-level nested spec imports", async () => {
    const files = {
      "main.ec": `import commands { createQuote } from "./services/pricing/pricing-openapi.yml"
import PricingAPI from "./services/pricing/pricing-openapi.yml"
visualizer main {
  name "Test"
  service PricingAPI
}`,
      "services/pricing/pricing-openapi.yml": asyncapiSpecWithOps,
    };
    const result = await parseWorkspaceFiles(
      files,
      undefined,
      undefined,
      "main.ec",
    );
    const serviceNode = result.nodes.find((n: any) => n.type === "service");
    expect(serviceNode).toBeDefined();
    expect(serviceNode!.label).toBe("PricingAPI");
  });

  it("resolves .ec file imports from nested folders", async () => {
    const files = {
      "main.ec": `import { User } from "./actors/actors.ec"
visualizer main {
  name "Test"
  actor User
}`,
      "actors/actors.ec": `actor User {
  name "The User"
  summary "User persona"
}`,
    };
    const result = await parseWorkspaceFiles(
      files,
      undefined,
      undefined,
      "main.ec",
    );
    const actorNode = result.nodes.find((n: any) => n.type === "actor");
    expect(actorNode).toBeDefined();
    expect(actorNode!.label).toBe("User");
  });

  it("shows empty state when no visualizer block exists", async () => {
    const files = {
      "main.ec": `service Foo { version 1.0.0 }`,
    };
    const result = await parseWorkspaceFiles(
      files,
      undefined,
      undefined,
      "main.ec",
    );
    expect(result.nodes).toHaveLength(0);
    expect(result.empty).toBe(true);
  });
});
