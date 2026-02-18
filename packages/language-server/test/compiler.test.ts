import { describe, it, expect } from "vitest";
import { createEcServices } from "../src/ec-module.js";
import { EmptyFileSystem } from "langium";
import { parseDocument } from "langium/test";
import type { Program } from "../src/generated/ast.js";
import { compile } from "../src/compiler.js";

const services = createEcServices(EmptyFileSystem);

async function parseProgram(input: string): Promise<Program> {
  const doc = await parseDocument<Program>(services.Ec, input);
  expect(doc.parseResult.parserErrors).toHaveLength(0);
  return doc.parseResult.value;
}

describe("compile", () => {
  it("compiles a domain with version and owner", async () => {
    const program = await parseProgram(`
      domain Orders {
        version 1.0.0
        name "Orders Domain"
        summary "Handles all order operations"
        owner orders-team
      }
    `);

    const outputs = compile(program);

    const domainOutput = outputs.find(
      (o) => o.path === "domains/Orders/versioned/1.0.0/index.md",
    );
    expect(domainOutput).toBeDefined();
    expect(domainOutput!.content).toContain('id: "Orders"');
    expect(domainOutput!.content).toContain('version: "1.0.0"');
    expect(domainOutput!.content).toContain("orders-team");
  });

  it("compiles a domain with services listed in frontmatter", async () => {
    const program = await parseProgram(`
      domain Orders {
        version 1.0.0
        name "Orders Domain"
        service OrderService {
          version 2.0.0
        }
        service InventoryService {
          version 1.0.0
        }
      }
    `);

    const outputs = compile(program);

    const domainOutput = outputs.find(
      (o) => o.path === "domains/Orders/versioned/1.0.0/index.md",
    );
    expect(domainOutput).toBeDefined();
    expect(domainOutput!.content).toContain("services:");
    expect(domainOutput!.content).toContain('id: "OrderService"');
    expect(domainOutput!.content).toContain('version: "2.0.0"');
    expect(domainOutput!.content).toContain('id: "InventoryService"');
    expect(domainOutput!.content).toContain('version: "1.0.0"');
  });

  it("compiles a domain with subdomains listed in frontmatter", async () => {
    const program = await parseProgram(`
      domain Ecommerce {
        version 1.0.0
        subdomain Payments {
          version 1.0.0
          service PaymentService {
            version 1.0.0
          }
        }
      }
    `);

    const outputs = compile(program);

    const domainOutput = outputs.find(
      (o) => o.path === "domains/Ecommerce/versioned/1.0.0/index.md",
    );
    expect(domainOutput).toBeDefined();
    // Subdomains are listed as "domains" in frontmatter
    expect(domainOutput!.content).toContain("domains:");
    expect(domainOutput!.content).toContain('id: "Payments"');

    // Subdomain should list its services
    const subdomainOutput = outputs.find((o) =>
      o.path.includes("Payments/versioned/1.0.0/index.md"),
    );
    expect(subdomainOutput).toBeDefined();
    expect(subdomainOutput!.content).toContain("services:");
    expect(subdomainOutput!.content).toContain('id: "PaymentService"');
  });

  it("compiles a service with sends and receives", async () => {
    const program = await parseProgram(`
      service OrderService {
        version 1.0.0
        sends event OrderCreated
        receives command PlaceOrder
      }
    `);

    const outputs = compile(program);

    const svcOutput = outputs.find(
      (o) => o.path === "services/OrderService/versioned/1.0.0/index.md",
    );
    expect(svcOutput).toBeDefined();
    expect(svcOutput!.content).toContain("sends:");
    expect(svcOutput!.content).toContain("OrderCreated");
    expect(svcOutput!.content).toContain("receives:");
    expect(svcOutput!.content).toContain("PlaceOrder");
  });

  it("compiles a standalone event", async () => {
    const program = await parseProgram(`
      event OrderCreated {
        version 1.0.0
        name "Order Created"
        summary "Emitted when an order is placed"
      }
    `);

    const outputs = compile(program);

    const eventOutput = outputs.find(
      (o) => o.path === "events/OrderCreated/versioned/1.0.0/index.md",
    );
    expect(eventOutput).toBeDefined();
    expect(eventOutput!.content).toContain('id: "OrderCreated"');
    expect(eventOutput!.content).toContain('name: "Order Created"');
    expect(eventOutput!.content).toContain('version: "1.0.0"');
  });

  it("compiles inline messages into separate output files", async () => {
    const program = await parseProgram(`
      service OrderService {
        version 1.0.0
        sends event OrderCreated {
          version 1.0.0
          summary "A new order was placed"
        }
      }
    `);

    const outputs = compile(program);

    const svcOutput = outputs.find(
      (o) => o.path === "services/OrderService/versioned/1.0.0/index.md",
    );
    expect(svcOutput).toBeDefined();

    const eventOutput = outputs.find(
      (o) => o.path === "events/OrderCreated/versioned/1.0.0/index.md",
    );
    expect(eventOutput).toBeDefined();
    expect(eventOutput!.content).toContain('id: "OrderCreated"');
  });

  it("compiles @badge annotation into badges array", async () => {
    const program = await parseProgram(`
      service OrderService {
        version 1.0.0
        @badge("Core", bg: "#3b82f6", text: "#fff")
      }
    `);

    const outputs = compile(program);

    const svcOutput = outputs.find(
      (o) => o.path === "services/OrderService/versioned/1.0.0/index.md",
    );
    expect(svcOutput).toBeDefined();
    expect(svcOutput!.content).toContain("badges:");
    expect(svcOutput!.content).toContain('content: "Core"');
    expect(svcOutput!.content).toContain('backgroundColor: "#3b82f6"');
    expect(svcOutput!.content).toContain('textColor: "#fff"');
  });

  it("compiles @note annotation into notes array", async () => {
    const program = await parseProgram(`
      service OrderService {
        version 1.0.0
        @note("Come back later")
      }
    `);

    const outputs = compile(program);

    const svcOutput = outputs.find(
      (o) => o.path === "services/OrderService/versioned/1.0.0/index.md",
    );
    expect(svcOutput).toBeDefined();
    expect(svcOutput!.content).toContain("notes:");
    expect(svcOutput!.content).toContain('content: "Come back later"');
  });

  it("compiles multiple @note annotations", async () => {
    const program = await parseProgram(`
      service OrderService {
        version 1.0.0
        @note("First note")
        @note("Second note", author: "dboyne", priority: "high")
      }
    `);

    const outputs = compile(program);

    const svcOutput = outputs.find(
      (o) => o.path === "services/OrderService/versioned/1.0.0/index.md",
    );
    expect(svcOutput).toBeDefined();
    expect(svcOutput!.content).toContain('content: "First note"');
    expect(svcOutput!.content).toContain('content: "Second note"');
    expect(svcOutput!.content).toContain('author: "dboyne"');
    expect(svcOutput!.content).toContain('priority: "high"');
  });

  it("compiles @note on event resource", async () => {
    const program = await parseProgram(`
      event OrderCreated {
        version 1.0.0
        @note("Needs schema review")
      }
    `);

    const outputs = compile(program);

    const eventOutput = outputs.find(
      (o) => o.path === "events/OrderCreated/versioned/1.0.0/index.md",
    );
    expect(eventOutput).toBeDefined();
    expect(eventOutput!.content).toContain("notes:");
    expect(eventOutput!.content).toContain('content: "Needs schema review"');
  });

  it("compiles @repository annotation", async () => {
    const program = await parseProgram(`
      service OrderService {
        version 1.0.0
        @repository(url: "https://github.com/org/repo", language: "TypeScript")
      }
    `);

    const outputs = compile(program);

    const svcOutput = outputs.find(
      (o) => o.path === "services/OrderService/versioned/1.0.0/index.md",
    );
    expect(svcOutput).toBeDefined();
    expect(svcOutput!.content).toContain("repository:");
    expect(svcOutput!.content).toContain('url: "https://github.com/org/repo"');
    expect(svcOutput!.content).toContain('language: "TypeScript"');
  });

  it("compiles a channel with address and protocols", async () => {
    const program = await parseProgram(`
      channel orders-topic {
        version 1.0.0
        name "Orders Topic"
        address "orders/events"
        protocol "Kafka"
      }
    `);

    const outputs = compile(program);

    const channelOutput = outputs.find(
      (o) => o.path === "channels/orders-topic/versioned/1.0.0/index.md",
    );
    expect(channelOutput).toBeDefined();
    expect(channelOutput!.content).toContain('address: "orders/events"');
    expect(channelOutput!.content).toContain("protocols:");
    expect(channelOutput!.content).toContain("Kafka");
  });

  it("compiles a user", async () => {
    const program = await parseProgram(`
      user dboyne {
        name "David Boyne"
        role "Principal Engineer"
        email "david@example.com"
      }
    `);

    const outputs = compile(program);

    const userOutput = outputs.find((o) => o.path === "users/dboyne.md");
    expect(userOutput).toBeDefined();
    expect(userOutput!.content).toContain('id: "dboyne"');
    expect(userOutput!.content).toContain('name: "David Boyne"');
    expect(userOutput!.content).toContain('role: "Principal Engineer"');
    expect(userOutput!.content).toContain('email: "david@example.com"');
  });

  it("compiles a team with members", async () => {
    const program = await parseProgram(`
      team orders-team {
        name "Orders Team"
        summary "Handles order processing"
        email "orders@company.com"
        member dboyne
        member jane-doe
      }
    `);

    const outputs = compile(program);

    const teamOutput = outputs.find((o) => o.path === "teams/orders-team.md");
    expect(teamOutput).toBeDefined();
    expect(teamOutput!.content).toContain("members:");
    expect(teamOutput!.content).toContain("dboyne");
    expect(teamOutput!.content).toContain("jane-doe");
  });

  it("compiles a flow with when blocks", async () => {
    const program = await parseProgram(`
      flow OrderFulfillment {
        version 1.0.0
        name "Order Fulfillment"
        summary "End-to-end order fulfillment"

        Customer "places an order" -> PlaceOrder -> OrderService -> OrderCreated

        when OrderCreated
          PaymentService "processes the payment"
            -> "success": PaymentProcessed
            -> "failure": PaymentFailed
      }
    `);

    const outputs = compile(program);

    const flowOutput = outputs.find(
      (o) => o.path === "flows/OrderFulfillment/versioned/1.0.0/index.md",
    );
    expect(flowOutput).toBeDefined();
    expect(flowOutput!.content).toContain("steps:");
    expect(flowOutput!.content).toContain('id: "Customer"');
    expect(flowOutput!.content).toContain('id: "PlaceOrder"');
    expect(flowOutput!.content).toContain('id: "OrderService"');
    expect(flowOutput!.content).toContain('id: "OrderCreated"');
    expect(flowOutput!.content).toContain('id: "PaymentService"');
    expect(flowOutput!.content).toContain("success");
    expect(flowOutput!.content).toContain("failure");
  });

  it("compiles command and query into separate directories", async () => {
    const program = await parseProgram(`
      command PlaceOrder {
        version 1.0.0
        summary "Places a new order"
      }

      query GetOrder {
        version 1.0.0
        summary "Retrieves order details"
      }
    `);

    const outputs = compile(program);

    const commandOutput = outputs.find(
      (o) => o.path === "commands/PlaceOrder/versioned/1.0.0/index.md",
    );
    expect(commandOutput).toBeDefined();
    expect(commandOutput!.content).toContain('id: "PlaceOrder"');

    const queryOutput = outputs.find(
      (o) => o.path === "queries/GetOrder/versioned/1.0.0/index.md",
    );
    expect(queryOutput).toBeDefined();
    expect(queryOutput!.content).toContain('id: "GetOrder"');
  });

  it("visualizer wrapper does NOT produce its own markdown", async () => {
    const program = await parseProgram(`
      visualizer main {
        service OrderService {
          version 1.0.0
          summary "Manages orders"
        }
      }
    `);

    const outputs = compile(program);

    // The service inside should compile
    const serviceOutput = outputs.find(
      (o) => o.path === "services/OrderService/versioned/1.0.0/index.md",
    );
    expect(serviceOutput).toBeDefined();

    // No output for the visualizer itself
    const vizOutput = outputs.find((o) => o.path.includes("visualizer"));
    expect(vizOutput).toBeUndefined();
  });

  it("inline definitions inside visualizer compile normally", async () => {
    const program = await parseProgram(`
      visualizer main {
        service PaymentService {
          version 1.0.0
          sends event PaymentProcessed {
            version 1.0.0
            summary "Payment completed"
          }
        }
      }
    `);

    const outputs = compile(program);

    const serviceOutput = outputs.find(
      (o) => o.path === "services/PaymentService/versioned/1.0.0/index.md",
    );
    expect(serviceOutput).toBeDefined();

    const eventOutput = outputs.find(
      (o) => o.path === "events/PaymentProcessed/versioned/1.0.0/index.md",
    );
    expect(eventOutput).toBeDefined();
    expect(eventOutput!.content).toContain("Payment completed");
  });
});
