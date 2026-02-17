import { describe, it, expect } from "vitest";
import { createEcServices } from "../src/ec-module.js";
import { EmptyFileSystem } from "langium";
import { parseDocument } from "langium/test";
import type { Program } from "../src/generated/ast.js";
import { astToGraph } from "../src/graph.js";

const services = createEcServices(EmptyFileSystem);

async function parseProgram(input: string): Promise<Program> {
  const doc = await parseDocument<Program>(services.Ec, input);
  expect(doc.parseResult.parserErrors).toHaveLength(0);
  return doc.parseResult.value;
}

describe("astToGraph", () => {
  it("no visualizer returns empty graph", async () => {
    const program = await parseProgram(`
      service OrderService {
        version 1.0.0
      }
    `);

    const graph = astToGraph(program);
    expect(graph.empty).toBe(true);
    expect(graph.nodes).toHaveLength(0);
    expect(graph.edges).toHaveLength(0);
    expect(graph.visualizers).toHaveLength(0);
  });

  it("domain with a service produces nodes and contains edge", async () => {
    const program = await parseProgram(`
      visualizer main {
        domain Orders {
          version 1.0.0
          service OrderService {
            version 1.0.0
          }
        }
      }
    `);

    const graph = astToGraph(program);

    const domainNode = graph.nodes.find(
      (n) => n.id === "domain:Orders@1.0.0" && n.type === "domain",
    );
    const serviceNode = graph.nodes.find(
      (n) => n.id === "service:OrderService@1.0.0" && n.type === "service",
    );
    expect(domainNode).toBeDefined();
    expect(serviceNode).toBeDefined();

    const containsEdge = graph.edges.find(
      (e) =>
        e.source === "domain:Orders@1.0.0" &&
        e.target === "service:OrderService@1.0.0" &&
        e.type === "contains",
    );
    expect(containsEdge).toBeDefined();
  });

  it("service sends event produces sends edge", async () => {
    const program = await parseProgram(`
      visualizer main {
        service OrderService {
          version 1.0.0
          sends event OrderCreated
        }
      }
    `);

    const graph = astToGraph(program);

    const serviceNode = graph.nodes.find(
      (n) => n.id === "service:OrderService@1.0.0" && n.type === "service",
    );
    const eventNode = graph.nodes.find(
      (n) => n.type === "event" && n.label === "OrderCreated",
    );
    expect(serviceNode).toBeDefined();
    expect(eventNode).toBeDefined();

    const sendsEdge = graph.edges.find(
      (e) =>
        e.source === serviceNode!.id &&
        e.target === eventNode!.id &&
        e.type === "sends",
    );
    expect(sendsEdge).toBeDefined();
  });

  it("service receives event produces receives edge from event to service", async () => {
    const program = await parseProgram(`
      visualizer main {
        service OrderService {
          version 1.0.0
          receives event PaymentProcessed
        }
      }
    `);

    const graph = astToGraph(program);

    const serviceNode = graph.nodes.find(
      (n) => n.type === "service" && n.label === "OrderService",
    );
    const eventNode = graph.nodes.find(
      (n) => n.type === "event" && n.label === "PaymentProcessed",
    );
    expect(serviceNode).toBeDefined();
    expect(eventNode).toBeDefined();

    const receivesEdge = graph.edges.find(
      (e) =>
        e.source === eventNode!.id &&
        e.target === serviceNode!.id &&
        e.type === "receives",
    );
    expect(receivesEdge).toBeDefined();
  });

  it("channel routing to produces channel node and edges through channel", async () => {
    const program = await parseProgram(`
      visualizer main {
        service PaymentService {
          version 1.0.0
          sends command ProcessPayment to payment-queue
        }
      }
    `);

    const graph = astToGraph(program);

    const channelNode = graph.nodes.find(
      (n) => n.type === "channel" && n.label === "payment-queue",
    );
    expect(channelNode).toBeDefined();

    const serviceNode = graph.nodes.find(
      (n) => n.type === "service" && n.label === "PaymentService",
    );
    const cmdNode = graph.nodes.find(
      (n) => n.type === "command" && n.label === "ProcessPayment",
    );

    // service -> message (sends)
    const svcToMsg = graph.edges.find(
      (e) =>
        e.source === serviceNode!.id &&
        e.target === cmdNode!.id &&
        e.type === "sends",
    );
    expect(svcToMsg).toBeDefined();

    // message -> channel (routes-to)
    const msgToChannel = graph.edges.find(
      (e) =>
        e.source === cmdNode!.id &&
        e.target === channelNode!.id &&
        e.type === "routes-to",
    );
    expect(msgToChannel).toBeDefined();

    // No direct service -> channel edge
    const svcToChannel = graph.edges.find(
      (e) =>
        e.source === serviceNode!.id &&
        e.target === channelNode!.id &&
        e.type === "sends",
    );
    expect(svcToChannel).toBeUndefined();
  });

  it("channel routing from produces channel node and edges through channel for receives", async () => {
    const program = await parseProgram(`
      visualizer main {
        service NotificationService {
          version 1.0.0
          receives event OrderCreated from order-events
        }
      }
    `);

    const graph = astToGraph(program);

    const channelNode = graph.nodes.find(
      (n) => n.type === "channel" && n.label === "order-events",
    );
    expect(channelNode).toBeDefined();

    const serviceNode = graph.nodes.find(
      (n) => n.type === "service" && n.label === "NotificationService",
    );
    const eventNode = graph.nodes.find(
      (n) => n.type === "event" && n.label === "OrderCreated",
    );

    // "from" on receives also creates message -> channel to ensure connectivity
    // even when no sends side defines the route
    const msgToChannel = graph.edges.find(
      (e) =>
        e.source === eventNode!.id &&
        e.target === channelNode!.id &&
        e.type === "routes-to",
    );
    expect(msgToChannel).toBeDefined();

    // channel -> service (receives)
    const channelToSvc = graph.edges.find(
      (e) =>
        e.source === channelNode!.id &&
        e.target === serviceNode!.id &&
        e.type === "receives",
    );
    expect(channelToSvc).toBeDefined();

    // No direct message -> service edge when channel is present
    const directEdge = graph.edges.find(
      (e) =>
        e.source === eventNode!.id &&
        e.target === serviceNode!.id &&
        e.type === "receives",
    );
    expect(directEdge).toBeUndefined();
  });

  it("channel used inside domain is parented to that domain", async () => {
    const program = await parseProgram(`
      channel MyChannel {
        version 1.0.0
        address "topic"
      }

      visualizer main {
        domain Payment {
          version 1.0.0

          service Random {
            version 1.0.0
            sends event Name to MyChannel
          }

          service OrderService {
            version 1.0.0
            receives event Name from MyChannel
          }
        }
      }
    `);

    const graph = astToGraph(program);

    const domainNode = graph.nodes.find(
      (n) => n.type === "domain" && n.label === "Payment",
    );
    const channelNode = graph.nodes.find(
      (n) => n.type === "channel" && n.label === "MyChannel",
    );
    expect(domainNode).toBeDefined();
    expect(channelNode).toBeDefined();

    // Channel is parented to the domain
    expect(channelNode!.parentId).toBe(domainNode!.id);

    // Contains edge from domain to channel
    const containsEdge = graph.edges.find(
      (e) =>
        e.source === domainNode!.id &&
        e.target === channelNode!.id &&
        e.type === "contains",
    );
    expect(containsEdge).toBeDefined();

    // Event is also parented to the domain
    const eventNode = graph.nodes.find(
      (n) => n.type === "event" && n.label === "Name",
    );
    expect(eventNode).toBeDefined();
    expect(eventNode!.parentId).toBe(domainNode!.id);
  });

  it("writes-to and reads-from produce correct edge types", async () => {
    const program = await parseProgram(`
      visualizer main {
        service OrderService {
          version 1.0.0
          writes-to container orders-db
          reads-from container orders-cache
        }
      }
    `);

    const graph = astToGraph(program);

    const serviceNode = graph.nodes.find(
      (n) => n.type === "service" && n.label === "OrderService",
    );
    const dbNode = graph.nodes.find(
      (n) => n.type === "container" && n.label === "orders-db",
    );
    const cacheNode = graph.nodes.find(
      (n) => n.type === "container" && n.label === "orders-cache",
    );

    const writesEdge = graph.edges.find(
      (e) =>
        e.source === serviceNode!.id &&
        e.target === dbNode!.id &&
        e.type === "writes-to",
    );
    expect(writesEdge).toBeDefined();

    const readsEdge = graph.edges.find(
      (e) =>
        e.source === cacheNode!.id &&
        e.target === serviceNode!.id &&
        e.type === "reads-from",
    );
    expect(readsEdge).toBeDefined();
  });

  it("writes-to and reads-from same container merge into reads-writes edge", async () => {
    const program = await parseProgram(`
      visualizer main {
        service OrderService {
          version 1.0.0
          writes-to container orders-db
          reads-from container orders-db
        }
      }
    `);

    const graph = astToGraph(program);

    const serviceNode = graph.nodes.find(
      (n) => n.id === "service:OrderService@1.0.0",
    );
    const dbNode = graph.nodes.find((n) => n.type === "container");
    expect(serviceNode).toBeDefined();
    expect(dbNode).toBeDefined();

    // Should have a single reads-writes edge instead of separate writes-to and reads-from
    const readsWritesEdge = graph.edges.find(
      (e) =>
        e.source === serviceNode!.id &&
        e.target === dbNode!.id &&
        e.type === "reads-writes",
    );
    expect(readsWritesEdge).toBeDefined();

    // No separate writes-to or reads-from edges should remain
    const writesToEdge = graph.edges.find(
      (e) => e.type === "writes-to" && e.target === dbNode!.id,
    );
    const readsFromEdge = graph.edges.find(
      (e) => e.type === "reads-from" && e.source === dbNode!.id,
    );
    expect(writesToEdge).toBeUndefined();
    expect(readsFromEdge).toBeUndefined();
  });

  it("subdomain hierarchy produces correct parentIds and contains edges", async () => {
    const program = await parseProgram(`
      visualizer main {
        domain Commerce {
          version 1.0.0
          subdomain Ordering {
            version 1.0.0
            service OrderService {
              version 1.0.0
            }
          }
        }
      }
    `);

    const graph = astToGraph(program);

    const domainNode = graph.nodes.find(
      (n) => n.id === "domain:Commerce@1.0.0" && n.type === "domain",
    );
    const subdomainNode = graph.nodes.find(
      (n) => n.id === "domain:Ordering@1.0.0" && n.type === "domain",
    );
    const serviceNode = graph.nodes.find(
      (n) => n.id === "service:OrderService@1.0.0" && n.type === "service",
    );

    expect(domainNode).toBeDefined();
    expect(subdomainNode).toBeDefined();
    expect(serviceNode).toBeDefined();

    expect(subdomainNode!.parentId).toBe("domain:Commerce@1.0.0");
    expect(serviceNode!.parentId).toBe("domain:Ordering@1.0.0");

    const domainToSub = graph.edges.find(
      (e) =>
        e.source === "domain:Commerce@1.0.0" &&
        e.target === "domain:Ordering@1.0.0" &&
        e.type === "contains",
    );
    expect(domainToSub).toBeDefined();

    const subToService = graph.edges.find(
      (e) =>
        e.source === "domain:Ordering@1.0.0" &&
        e.target === "service:OrderService@1.0.0" &&
        e.type === "contains",
    );
    expect(subToService).toBeDefined();
  });

  it("standalone event inside visualizer produces node", async () => {
    const program = await parseProgram(`
      visualizer main {
        event InventoryReserved {
          version 1.0.0
        }
      }
    `);

    const graph = astToGraph(program);

    const eventNode = graph.nodes.find(
      (n) => n.id === "event:InventoryReserved@1.0.0" && n.type === "event",
    );
    expect(eventNode).toBeDefined();
  });

  it("user and team without visualizer returns empty graph", async () => {
    const program = await parseProgram(`
      user dboyne {
        name "David Boyne"
        role "Engineer"
      }

      team orders-team {
        name "Orders Team"
        member dboyne
      }
    `);

    const graph = astToGraph(program);
    expect(graph.empty).toBe(true);
    expect(graph.nodes).toHaveLength(0);
  });

  it("edge IDs are deterministic using source-type-target format", async () => {
    const program = await parseProgram(`
      visualizer main {
        service OrderService {
          version 1.0.0
          sends event OrderCreated
        }
      }
    `);

    const graph = astToGraph(program);

    const serviceNode = graph.nodes.find(
      (n) => n.type === "service" && n.label === "OrderService",
    );
    const eventNode = graph.nodes.find(
      (n) => n.type === "event" && n.label === "OrderCreated",
    );

    const sendsEdge = graph.edges.find(
      (e) =>
        e.source === serviceNode!.id &&
        e.target === eventNode!.id &&
        e.type === "sends",
    );
    expect(sendsEdge).toBeDefined();
    expect(sendsEdge!.id).toBe(`${serviceNode!.id}-sends-${eventNode!.id}`);
  });

  it("messages sent by service inside domain are parented to that domain", async () => {
    const program = await parseProgram(`
      visualizer main {
        domain Payment {
          version 1.0.0
          service PaymentService {
            version 1.0.0
            sends event PaymentProcessed
          }
        }
      }
    `);

    const graph = astToGraph(program);

    const domainNode = graph.nodes.find(
      (n) => n.type === "domain" && n.label === "Payment",
    );
    const eventNode = graph.nodes.find(
      (n) => n.type === "event" && n.label === "PaymentProcessed",
    );
    expect(domainNode).toBeDefined();
    expect(eventNode).toBeDefined();
    expect(eventNode!.parentId).toBe(domainNode!.id);

    // Contains edge from domain to event
    const containsEdge = graph.edges.find(
      (e) =>
        e.source === domainNode!.id &&
        e.target === eventNode!.id &&
        e.type === "contains",
    );
    expect(containsEdge).toBeDefined();
  });

  // ─── Multi-version and @version syntax tests ──────────────────

  it("sends event with @version creates a versioned node", async () => {
    const program = await parseProgram(`
      visualizer main {
        service OrderService {
          version 1.0.0
          sends event OrderCreated@1.0.0
        }
      }
    `);

    const graph = astToGraph(program);

    const eventNode = graph.nodes.find(
      (n) => n.id === "event:OrderCreated@1.0.0",
    );
    expect(eventNode).toBeDefined();
    expect(eventNode!.type).toBe("event");

    const sendsEdge = graph.edges.find(
      (e) =>
        e.source === "service:OrderService@1.0.0" &&
        e.target === "event:OrderCreated@1.0.0" &&
        e.type === "sends",
    );
    expect(sendsEdge).toBeDefined();
  });

  it("receives event with @version creates a versioned node", async () => {
    const program = await parseProgram(`
      visualizer main {
        service NotificationService {
          version 1.0.0
          receives event OrderCreated@2.0.0
        }
      }
    `);

    const graph = astToGraph(program);

    const eventNode = graph.nodes.find(
      (n) => n.id === "event:OrderCreated@2.0.0",
    );
    expect(eventNode).toBeDefined();

    const receivesEdge = graph.edges.find(
      (e) =>
        e.source === "event:OrderCreated@2.0.0" &&
        e.target === "service:NotificationService@1.0.0" &&
        e.type === "receives",
    );
    expect(receivesEdge).toBeDefined();
  });

  it("multiple versions of the same event create separate nodes with correct edges", async () => {
    const program = await parseProgram(`
      event OrderCreated {
        version 1.0.0
        summary "Original order event"
      }

      event OrderCreated {
        version 2.0.0
        summary "Extended order event"
      }

      visualizer main {
        service OrderService {
          version 1.0.0
          sends event OrderCreated@1.0.0
          sends event OrderCreated@2.0.0
        }

        service LegacyConsumer {
          version 1.0.0
          receives event OrderCreated@1.0.0
        }

        service ModernConsumer {
          version 1.0.0
          receives event OrderCreated@2.0.0
        }

        event OrderCreated {
          version 1.0.0
          summary "Original order event"
        }

        event OrderCreated {
          version 2.0.0
          summary "Extended order event"
        }
      }
    `);

    const graph = astToGraph(program);

    // Two separate event nodes
    const v1 = graph.nodes.find((n) => n.id === "event:OrderCreated@1.0.0");
    const v2 = graph.nodes.find((n) => n.id === "event:OrderCreated@2.0.0");
    expect(v1).toBeDefined();
    expect(v2).toBeDefined();
    expect(v1!.id).not.toBe(v2!.id);

    // Metadata merged from standalone definitions
    expect(v1!.metadata.summary).toBe("Original order event");
    expect(v2!.metadata.summary).toBe("Extended order event");

    // OrderService sends to both versions
    expect(
      graph.edges.find(
        (e) =>
          e.source === "service:OrderService@1.0.0" &&
          e.target === "event:OrderCreated@1.0.0" &&
          e.type === "sends",
      ),
    ).toBeDefined();
    expect(
      graph.edges.find(
        (e) =>
          e.source === "service:OrderService@1.0.0" &&
          e.target === "event:OrderCreated@2.0.0" &&
          e.type === "sends",
      ),
    ).toBeDefined();

    // LegacyConsumer receives v1 only
    expect(
      graph.edges.find(
        (e) =>
          e.source === "event:OrderCreated@1.0.0" &&
          e.target === "service:LegacyConsumer@1.0.0" &&
          e.type === "receives",
      ),
    ).toBeDefined();
    expect(
      graph.edges.find(
        (e) =>
          e.source === "event:OrderCreated@2.0.0" &&
          e.target === "service:LegacyConsumer@1.0.0",
      ),
    ).toBeUndefined();

    // ModernConsumer receives v2 only
    expect(
      graph.edges.find(
        (e) =>
          e.source === "event:OrderCreated@2.0.0" &&
          e.target === "service:ModernConsumer@1.0.0" &&
          e.type === "receives",
      ),
    ).toBeDefined();
    expect(
      graph.edges.find(
        (e) =>
          e.source === "event:OrderCreated@1.0.0" &&
          e.target === "service:ModernConsumer@1.0.0",
      ),
    ).toBeUndefined();
  });

  it("unversioned bare reference resolves to existing versioned node", async () => {
    const program = await parseProgram(`
      visualizer main {
        service PaymentService {
          version 1.0.0
          sends event PaymentProcessed {
            version 1.0.0
            summary "Payment completed"
          }
        }

        service NotificationService {
          version 1.0.0
          receives event PaymentProcessed
        }
      }
    `);

    const graph = astToGraph(program);

    // Only one PaymentProcessed node (the versioned one)
    const ppNodes = graph.nodes.filter((n) => n.label === "PaymentProcessed");
    expect(ppNodes).toHaveLength(1);
    expect(ppNodes[0].id).toBe("event:PaymentProcessed@1.0.0");

    // NotificationService receives from the versioned node
    expect(
      graph.edges.find(
        (e) =>
          e.source === "event:PaymentProcessed@1.0.0" &&
          e.target === "service:NotificationService@1.0.0" &&
          e.type === "receives",
      ),
    ).toBeDefined();
  });

  it("stub upgrade: bare reference is upgraded when versioned definition appears later", async () => {
    const program = await parseProgram(`
      command CreateOrder {
        version 1.0.0
        summary "Place a new order"
      }

      visualizer main {
        service OrderService {
          version 1.0.0
          receives command CreateOrder
        }

        command CreateOrder {
          version 1.0.0
          summary "Place a new order"
        }
      }
    `);

    const graph = astToGraph(program);

    // Only one CreateOrder node, upgraded to versioned
    const coNodes = graph.nodes.filter((n) => n.label === "CreateOrder");
    expect(coNodes).toHaveLength(1);
    expect(coNodes[0].id).toBe("command:CreateOrder@1.0.0");
    expect(coNodes[0].metadata.version).toBe("1.0.0");
    expect(coNodes[0].metadata.summary).toBe("Place a new order");

    // Edge still points to the upgraded node
    expect(
      graph.edges.find(
        (e) =>
          e.source === "command:CreateOrder@1.0.0" &&
          e.target === "service:OrderService@1.0.0" &&
          e.type === "receives",
      ),
    ).toBeDefined();
  });

  it("metadata merges when same versioned node is encountered again", async () => {
    const program = await parseProgram(`
      visualizer main {
        service OrderService {
          version 1.0.0
          sends event OrderCreated {
            version 1.0.0
          }
        }

        event OrderCreated {
          version 1.0.0
          summary "A new order has been placed"
        }
      }
    `);

    const graph = astToGraph(program);

    const eventNode = graph.nodes.find(
      (n) => n.id === "event:OrderCreated@1.0.0",
    );
    expect(eventNode).toBeDefined();
    expect(eventNode!.metadata.summary).toBe("A new order has been placed");
  });

  it("domain service referencing top-level event resolves to same node", async () => {
    const program = await parseProgram(`
      event PaymentProcessed {
        version 1.0.0
        summary "Payment completed successfully"
      }

      visualizer main {
        domain Payment {
          version 1.0.0
          service PaymentService {
            version 1.0.0
            sends event PaymentProcessed
          }
        }

        event PaymentProcessed {
          version 1.0.0
          summary "Payment completed successfully"
        }
      }
    `);

    const graph = astToGraph(program);

    // Single PaymentProcessed node with metadata from the definition
    const ppNodes = graph.nodes.filter((n) => n.label === "PaymentProcessed");
    expect(ppNodes).toHaveLength(1);
    expect(ppNodes[0].id).toBe("event:PaymentProcessed@1.0.0");
    expect(ppNodes[0].metadata.summary).toBe("Payment completed successfully");

    // Sends edge from service to event
    expect(
      graph.edges.find(
        (e) =>
          e.source === "service:PaymentService@1.0.0" &&
          e.target === "event:PaymentProcessed@1.0.0" &&
          e.type === "sends",
      ),
    ).toBeDefined();
  });

  it("command with @version in sends and receives", async () => {
    const program = await parseProgram(`
      visualizer main {
        service OrderService {
          version 1.0.0
          sends command ProcessPayment@1.0.0
        }

        service PaymentService {
          version 1.0.0
          receives command ProcessPayment@1.0.0
        }
      }
    `);

    const graph = astToGraph(program);

    const cmdNode = graph.nodes.find(
      (n) => n.id === "command:ProcessPayment@1.0.0",
    );
    expect(cmdNode).toBeDefined();

    // OrderService sends the command
    expect(
      graph.edges.find(
        (e) =>
          e.source === "service:OrderService@1.0.0" &&
          e.target === "command:ProcessPayment@1.0.0" &&
          e.type === "sends",
      ),
    ).toBeDefined();

    // PaymentService receives the command
    expect(
      graph.edges.find(
        (e) =>
          e.source === "command:ProcessPayment@1.0.0" &&
          e.target === "service:PaymentService@1.0.0" &&
          e.type === "receives",
      ),
    ).toBeDefined();
  });

  it("service reference inside domain places service node inside domain", async () => {
    const program = await parseProgram(`
      service Random {
        version 1.0.0
        summary "Hello world"
      }

      visualizer main {
        domain Name {
          version 1.0.0
          service Random@1.0.0
        }

        service Random {
          version 1.0.0
          summary "Hello world"
        }
      }
    `);

    const graph = astToGraph(program);

    const domainNode = graph.nodes.find((n) => n.id === "domain:Name@1.0.0");
    expect(domainNode).toBeDefined();

    const serviceNode = graph.nodes.find(
      (n) => n.id === "service:Random@1.0.0",
    );
    expect(serviceNode).toBeDefined();
    expect(serviceNode!.parentId).toBe("domain:Name@1.0.0");
    expect(serviceNode!.metadata.summary).toBe("Hello world");

    // Contains edge from domain to service
    expect(
      graph.edges.find(
        (e) =>
          e.source === "domain:Name@1.0.0" &&
          e.target === "service:Random@1.0.0" &&
          e.type === "contains",
      ),
    ).toBeDefined();
  });

  it("service reference inside domain includes sends/receives messages", async () => {
    const program = await parseProgram(`
      service InventoryService {
        version 0.0.2
        name "Inventory Service"
        summary "Service that handles the inventory"
        sends event InventoryAdjusted
      }

      domain Orders {
        version 0.0.3
        name "Orders"
        summary "The Orders domain"
        service InventoryService
      }

      visualizer main {
        domain Orders
      }
    `);

    const graph = astToGraph(program);

    // Service should be inside the domain
    const serviceNode = graph.nodes.find(
      (n) => n.id === "service:InventoryService@0.0.2",
    );
    expect(serviceNode).toBeDefined();
    expect(serviceNode!.parentId).toBe("domain:Orders@0.0.3");

    // The sent event should appear in the graph
    const eventNode = graph.nodes.find(
      (n) => n.id === "event:InventoryAdjusted",
    );
    expect(eventNode).toBeDefined();

    // Sends edge from service to event
    expect(
      graph.edges.find(
        (e) =>
          e.source === "service:InventoryService@0.0.2" &&
          e.target === "event:InventoryAdjusted" &&
          e.type === "sends",
      ),
    ).toBeDefined();
  });

  it("service reference without version inside domain resolves to versioned definition", async () => {
    const program = await parseProgram(`
      service Random {
        version 1.0.0
        summary "Hello world"
      }

      visualizer main {
        domain Name {
          version 1.0.0
          service Random
        }

        service Random {
          version 1.0.0
          summary "Hello world"
        }
      }
    `);

    const graph = astToGraph(program);

    const serviceNode = graph.nodes.find(
      (n) => n.id === "service:Random@1.0.0",
    );
    expect(serviceNode).toBeDefined();
    expect(serviceNode!.parentId).toBe("domain:Name@1.0.0");

    expect(
      graph.edges.find(
        (e) =>
          e.source === "domain:Name@1.0.0" &&
          e.target === "service:Random@1.0.0" &&
          e.type === "contains",
      ),
    ).toBeDefined();
  });

  it("query with @version syntax", async () => {
    const program = await parseProgram(`
      visualizer main {
        service UserService {
          version 1.0.0
          receives query GetUser@1.0.0
        }
      }
    `);

    const graph = astToGraph(program);

    const queryNode = graph.nodes.find((n) => n.id === "query:GetUser@1.0.0");
    expect(queryNode).toBeDefined();

    expect(
      graph.edges.find(
        (e) =>
          e.source === "query:GetUser@1.0.0" &&
          e.target === "service:UserService@1.0.0" &&
          e.type === "receives",
      ),
    ).toBeDefined();
  });

  // ─── Visualizer-specific tests ──────────────────

  it("visualizer with service reference resolves top-level definition", async () => {
    const program = await parseProgram(`
      service OrderService {
        version 1.0.0
        summary "Manages orders"
        sends event OrderCreated
      }

      visualizer main {
        service OrderService@1.0.0
      }
    `);

    const graph = astToGraph(program);
    expect(graph.visualizers).toEqual(["main"]);
    expect(graph.activeVisualizer).toBe("main");

    const serviceNode = graph.nodes.find(
      (n) => n.id === "service:OrderService@1.0.0",
    );
    expect(serviceNode).toBeDefined();
    expect(serviceNode!.metadata.summary).toBe("Manages orders");

    // Sends edge from resolving the top-level def
    const sendsEdge = graph.edges.find((e) => e.type === "sends");
    expect(sendsEdge).toBeDefined();
  });

  it("multiple visualizers with name selection", async () => {
    const program = await parseProgram(`
      visualizer overview {
        service OrderService {
          version 1.0.0
        }
      }

      visualizer detailed {
        service OrderService {
          version 1.0.0
          sends event OrderCreated
        }
        service PaymentService {
          version 1.0.0
        }
      }
    `);

    const overviewGraph = astToGraph(program, "overview");
    expect(overviewGraph.visualizers).toEqual(["overview", "detailed"]);
    expect(overviewGraph.activeVisualizer).toBe("overview");
    expect(overviewGraph.nodes).toHaveLength(1);

    const detailedGraph = astToGraph(program, "detailed");
    expect(detailedGraph.activeVisualizer).toBe("detailed");
    expect(detailedGraph.nodes.length).toBeGreaterThan(1);
  });

  it("visualizer with container reference creates data node", async () => {
    const program = await parseProgram(`
      container OrdersDB {
        version 1.0.0
        container-type database
      }

      visualizer main {
        container OrdersDB@1.0.0
      }
    `);

    const graph = astToGraph(program);

    const dataNode = graph.nodes.find(
      (n) => n.type === "container" && n.label === "OrdersDB",
    );
    expect(dataNode).toBeDefined();
  });

  it("container with deprecated includes metadata", async () => {
    const program = await parseProgram(`
      visualizer main {
        container TestDB {
          version 1.0.0
          container-type database
          deprecated true
        }
      }
    `);

    const graph = astToGraph(program);

    const node = graph.nodes.find(
      (n) => n.type === "container" && n.label === "TestDB",
    );
    expect(node).toBeDefined();
    expect(node!.metadata.deprecated).toBe(true);
  });

  // ─── Visualizer display options tests ──────────────────

  it("visualizer with legend false returns options.legend === false", async () => {
    const program = await parseProgram(`
      visualizer main {
        legend false
        service OrderService {
          version 1.0.0
        }
      }
    `);

    const graph = astToGraph(program);
    expect(graph.options?.legend).toBe(false);
  });

  it("visualizer with search false returns options.search === false", async () => {
    const program = await parseProgram(`
      visualizer main {
        search false
        service OrderService {
          version 1.0.0
        }
      }
    `);

    const graph = astToGraph(program);
    expect(graph.options?.search).toBe(false);
  });

  it("visualizer with no display options returns undefined for all options", async () => {
    const program = await parseProgram(`
      visualizer main {
        service OrderService {
          version 1.0.0
        }
      }
    `);

    const graph = astToGraph(program);
    expect(graph.options?.legend).toBeUndefined();
    expect(graph.options?.search).toBeUndefined();
    expect(graph.options?.toolbar).toBeUndefined();
    expect(graph.options?.focusMode).toBeUndefined();
    expect(graph.options?.animated).toBeUndefined();
    expect(graph.options?.style).toBeUndefined();
  });

  it("visualizer with toolbar false and focus-mode false", async () => {
    const program = await parseProgram(`
      visualizer main {
        toolbar false
        focus-mode false
        service OrderService {
          version 1.0.0
        }
      }
    `);

    const graph = astToGraph(program);
    expect(graph.options?.toolbar).toBe(false);
    expect(graph.options?.focusMode).toBe(false);
    expect(graph.options?.legend).toBeUndefined();
    expect(graph.options?.search).toBeUndefined();
  });

  it("visualizer with all display options set to true", async () => {
    const program = await parseProgram(`
      visualizer main {
        legend true
        search true
        toolbar true
        focus-mode true
        service OrderService {
          version 1.0.0
        }
      }
    `);

    const graph = astToGraph(program);
    expect(graph.options?.legend).toBe(true);
    expect(graph.options?.search).toBe(true);
    expect(graph.options?.toolbar).toBe(true);
    expect(graph.options?.focusMode).toBe(true);
  });

  it("visualizer with style post-it returns options.style === post-it", async () => {
    const program = await parseProgram(`
      visualizer main {
        style post-it
        service OrderService {
          version 1.0.0
        }
      }
    `);

    const graph = astToGraph(program);
    expect(graph.options?.style).toBe("post-it");
  });

  it("visualizer with style default returns options.style === default", async () => {
    const program = await parseProgram(`
      visualizer main {
        style default
        service OrderService {
          version 1.0.0
        }
      }
    `);

    const graph = astToGraph(program);
    expect(graph.options?.style).toBe("default");
  });

  it("visualizer with no style returns options.style === undefined", async () => {
    const program = await parseProgram(`
      visualizer main {
        service OrderService {
          version 1.0.0
        }
      }
    `);

    const graph = astToGraph(program);
    expect(graph.options?.style).toBeUndefined();
  });

  it("visualizer with animated true returns options.animated === true", async () => {
    const program = await parseProgram(`
      visualizer main {
        animated true
        service OrderService {
          version 1.0.0
        }
      }
    `);

    const graph = astToGraph(program);
    expect(graph.options?.animated).toBe(true);
  });

  it("visualizer with animated false returns options.animated === false", async () => {
    const program = await parseProgram(`
      visualizer main {
        animated false
        service OrderService {
          version 1.0.0
        }
      }
    `);

    const graph = astToGraph(program);
    expect(graph.options?.animated).toBe(false);
  });

  it("visualizer with no animated returns options.animated === undefined", async () => {
    const program = await parseProgram(`
      visualizer main {
        service OrderService {
          version 1.0.0
        }
      }
    `);

    const graph = astToGraph(program);
    expect(graph.options?.animated).toBeUndefined();
  });

  it("visualizer with event ref (empty body) resolves to top-level def", async () => {
    const program = await parseProgram(`
      event OrderCreated {
        version 1.0.0
        summary "A new order"
      }

      visualizer main {
        event OrderCreated
      }
    `);

    const graph = astToGraph(program);

    const eventNode = graph.nodes.find(
      (n) => n.type === "event" && n.label === "OrderCreated",
    );
    expect(eventNode).toBeDefined();
    expect(eventNode!.metadata.summary).toBe("A new order");
    expect(eventNode!.metadata.version).toBe("1.0.0");
  });

  it("channel defined outside visualizer has its metadata resolved via sends/receives", async () => {
    const program = await parseProgram(`
      visualizer main {
        name "View Name"

        domain Ordering {
          version 1.0.0

          service OrderService {
            version 1.0.0
            sends event OrderCreated to RabbitMQ
          }
        }
      }

      channel RabbitMQ {
        version 1.0.0
        address "orders.topic"
        summary "Main message broker"
      }
    `);

    const graph = astToGraph(program);

    const channelNode = graph.nodes.find((n) => n.type === "channel");
    expect(channelNode).toBeDefined();
    expect(channelNode!.label).toBe("RabbitMQ");
    expect(channelNode!.metadata.version).toBe("1.0.0");
    expect(channelNode!.metadata.address).toBe("orders.topic");
    expect(channelNode!.metadata.summary).toBe("Main message broker");
  });

  it("channel node includes protocol metadata when defined inline", async () => {
    const program = await parseProgram(`
      visualizer main {
        name "View Name"

        channel KafkaTopic {
          version 1.0.0
          address "events.orders"
          protocol "Kafka"
          summary "Order events topic"
        }
      }
    `);

    const graph = astToGraph(program);

    const channelNode = graph.nodes.find((n) => n.type === "channel");
    expect(channelNode).toBeDefined();
    expect(channelNode!.metadata.protocols).toEqual(["Kafka"]);
    expect(channelNode!.metadata.address).toBe("events.orders");
  });

  it("channel node includes protocol metadata when defined outside visualizer", async () => {
    const program = await parseProgram(`
      visualizer main {
        name "View Name"

        service OrderService {
          version 1.0.0
          sends event OrderCreated to KafkaTopic
        }
      }

      channel KafkaTopic {
        version 1.0.0
        address "events.orders"
        protocol "Kafka"
        summary "Order events topic"
      }
    `);

    const graph = astToGraph(program);

    const channelNode = graph.nodes.find(
      (n) => n.type === "channel" && n.label === "KafkaTopic",
    );
    expect(channelNode).toBeDefined();
    expect(channelNode!.metadata.protocols).toEqual(["Kafka"]);
    expect(channelNode!.metadata.address).toBe("events.orders");
  });

  it("event defined outside visualizer has its metadata resolved via sends", async () => {
    const program = await parseProgram(`
      event OrderCreated {
        version 2.0.0
        summary "Order was created"
      }

      visualizer main {
        service OrderService {
          version 1.0.0
          sends event OrderCreated
        }
      }
    `);

    const graph = astToGraph(program);

    const eventNode = graph.nodes.find((n) => n.type === "event");
    expect(eventNode).toBeDefined();
    expect(eventNode!.metadata.summary).toBe("Order was created");
    expect(eventNode!.metadata.version).toBe("2.0.0");
  });

  // ─── Channel route tests ──────────────────────────────

  it("channel with route creates routes-to edge between channels", async () => {
    const program = await parseProgram(`
      visualizer main {
        channel KafkaRaw {
          version 1.0.0
          address "sensors.raw"
          protocol "Kafka"
          route KafkaFiltered
        }

        channel KafkaFiltered {
          version 1.0.0
          address "sensors.filtered"
          protocol "Kafka"
        }
      }
    `);

    const graph = astToGraph(program);

    const rawNode = graph.nodes.find(
      (n) => n.type === "channel" && n.label === "KafkaRaw",
    );
    const filteredNode = graph.nodes.find(
      (n) => n.type === "channel" && n.label === "KafkaFiltered",
    );
    expect(rawNode).toBeDefined();
    expect(filteredNode).toBeDefined();

    const routeEdge = graph.edges.find(
      (e) =>
        e.source === rawNode!.id &&
        e.target === filteredNode!.id &&
        e.type === "routes-to",
    );
    expect(routeEdge).toBeDefined();
  });

  it("channel chain with multiple routes creates sequential edges", async () => {
    const program = await parseProgram(`
      visualizer main {
        channel KafkaRaw {
          version 1.0.0
          protocol "Kafka"
          route KafkaFiltered
        }

        channel KafkaFiltered {
          version 1.0.0
          protocol "Kafka"
          route MqttBridge
        }

        channel MqttBridge {
          version 1.0.0
          protocol "MQTT"
        }
      }
    `);

    const graph = astToGraph(program);

    expect(graph.nodes.filter((n) => n.type === "channel")).toHaveLength(3);

    // KafkaRaw -> KafkaFiltered
    const edge1 = graph.edges.find(
      (e) =>
        e.source === "channel:KafkaRaw@1.0.0" &&
        e.target === "channel:KafkaFiltered@1.0.0" &&
        e.type === "routes-to",
    );
    expect(edge1).toBeDefined();

    // KafkaFiltered -> MqttBridge
    const edge2 = graph.edges.find(
      (e) =>
        e.source === "channel:KafkaFiltered@1.0.0" &&
        e.target === "channel:MqttBridge@1.0.0" &&
        e.type === "routes-to",
    );
    expect(edge2).toBeDefined();
  });

  it("channel route with versioned target resolves correctly", async () => {
    const program = await parseProgram(`
      visualizer main {
        channel SourceTopic {
          version 1.0.0
          route TargetTopic@2.0.0
        }

        channel TargetTopic {
          version 2.0.0
        }
      }
    `);

    const graph = astToGraph(program);

    const routeEdge = graph.edges.find(
      (e) =>
        e.source === "channel:SourceTopic@1.0.0" &&
        e.target === "channel:TargetTopic@2.0.0" &&
        e.type === "routes-to",
    );
    expect(routeEdge).toBeDefined();
  });

  it("channel with multiple routes creates multiple edges", async () => {
    const program = await parseProgram(`
      visualizer main {
        channel Ingestion {
          version 1.0.0
          route Analytics
          route Archive
        }

        channel Analytics {
          version 1.0.0
        }

        channel Archive {
          version 1.0.0
        }
      }
    `);

    const graph = astToGraph(program);

    const toAnalytics = graph.edges.find(
      (e) =>
        e.source === "channel:Ingestion@1.0.0" &&
        e.target === "channel:Analytics@1.0.0" &&
        e.type === "routes-to",
    );
    const toArchive = graph.edges.find(
      (e) =>
        e.source === "channel:Ingestion@1.0.0" &&
        e.target === "channel:Archive@1.0.0" &&
        e.type === "routes-to",
    );
    expect(toAnalytics).toBeDefined();
    expect(toArchive).toBeDefined();
  });

  it("end-to-end: service sends to channel chain, another service receives from last channel", async () => {
    const program = await parseProgram(`
      visualizer main {
        channel KafkaRaw {
          version 1.0.0
          protocol "Kafka"
          route KafkaFiltered
        }

        channel KafkaFiltered {
          version 1.0.0
          protocol "Kafka"
          route MqttDevices
        }

        channel MqttDevices {
          version 1.0.0
          protocol "MQTT"
        }

        service SensorGateway {
          version 1.0.0
          sends event SensorReading to KafkaRaw
        }

        service Dashboard {
          version 1.0.0
          receives event SensorReading from MqttDevices
        }
      }
    `);

    const graph = astToGraph(program);

    // Service -> Event (sends)
    expect(
      graph.edges.find(
        (e) =>
          e.source === "service:SensorGateway@1.0.0" &&
          e.target === "event:SensorReading" &&
          e.type === "sends",
      ),
    ).toBeDefined();

    // Event -> KafkaRaw (routes-to from sends)
    expect(
      graph.edges.find(
        (e) =>
          e.source === "event:SensorReading" &&
          e.target === "channel:KafkaRaw@1.0.0" &&
          e.type === "routes-to",
      ),
    ).toBeDefined();

    // KafkaRaw -> KafkaFiltered (routes-to from route stmt)
    expect(
      graph.edges.find(
        (e) =>
          e.source === "channel:KafkaRaw@1.0.0" &&
          e.target === "channel:KafkaFiltered@1.0.0" &&
          e.type === "routes-to",
      ),
    ).toBeDefined();

    // KafkaFiltered -> MqttDevices (routes-to from route stmt)
    expect(
      graph.edges.find(
        (e) =>
          e.source === "channel:KafkaFiltered@1.0.0" &&
          e.target === "channel:MqttDevices@1.0.0" &&
          e.type === "routes-to",
      ),
    ).toBeDefined();

    // MqttDevices -> Dashboard (receives, from "receives ... from MqttDevices")
    expect(
      graph.edges.find(
        (e) =>
          e.source === "channel:MqttDevices@1.0.0" &&
          e.target === "service:Dashboard@1.0.0" &&
          e.type === "receives",
      ),
    ).toBeDefined();

    // The direct Message → Channel edge should NOT exist because the message
    // already reaches MqttDevices via the channel chain (KafkaRaw → KafkaFiltered → MqttDevices)
    expect(
      graph.edges.find(
        (e) =>
          e.source === "event:SensorReading" &&
          e.target === "channel:MqttDevices@1.0.0" &&
          e.type === "routes-to",
      ),
    ).toBeUndefined();
  });

  it("cross-domain channel routing removes redundant direct message-to-channel edges", async () => {
    const program = await parseProgram(`
      visualizer main {
        channel MainEventBus {
          version 1.0.0
          protocol "EventBridge"
          route NotificationsEventBus
        }

        domain Orders {
          version 1.0.0

          channel OrderEventBus {
            version 1.0.0
            protocol "EventBridge"
            route MainEventBus
          }

          service OrderService {
            version 1.0.0
            sends event OrderCreated to OrderEventBus {
              version 1.0.0
            }
          }
        }

        domain Notifications {
          version 1.0.0

          channel NotificationsEventBus {
            version 1.0.0
            protocol "EventBridge"
            route EmailQueue
          }

          channel EmailQueue {
            version 1.0.0
            protocol "SQS"
          }

          service EmailService {
            version 1.0.0
            receives event OrderCreated from EmailQueue
          }
        }
      }
    `);

    const graph = astToGraph(program);

    // Full chain should exist: OrderCreated -> OrderEventBus -> MainEventBus -> NotificationsEventBus -> EmailQueue
    expect(
      graph.edges.find(
        (e) =>
          e.source === "event:OrderCreated@1.0.0" &&
          e.target === "channel:OrderEventBus@1.0.0" &&
          e.type === "routes-to",
      ),
    ).toBeDefined();
    expect(
      graph.edges.find(
        (e) =>
          e.source === "channel:OrderEventBus@1.0.0" &&
          e.target === "channel:MainEventBus@1.0.0" &&
          e.type === "routes-to",
      ),
    ).toBeDefined();
    expect(
      graph.edges.find(
        (e) =>
          e.source === "channel:MainEventBus@1.0.0" &&
          e.target === "channel:NotificationsEventBus@1.0.0" &&
          e.type === "routes-to",
      ),
    ).toBeDefined();
    expect(
      graph.edges.find(
        (e) =>
          e.source === "channel:NotificationsEventBus@1.0.0" &&
          e.target === "channel:EmailQueue@1.0.0" &&
          e.type === "routes-to",
      ),
    ).toBeDefined();

    // Direct OrderCreated -> EmailQueue edge should NOT exist (redundant with chain)
    expect(
      graph.edges.find(
        (e) =>
          e.source === "event:OrderCreated@1.0.0" &&
          e.target === "channel:EmailQueue@1.0.0" &&
          e.type === "routes-to",
      ),
    ).toBeUndefined();

    // EmailQueue -> EmailService receives edge should still exist
    expect(
      graph.edges.find(
        (e) =>
          e.source === "channel:EmailQueue@1.0.0" &&
          e.target === "service:EmailService@1.0.0" &&
          e.type === "receives",
      ),
    ).toBeDefined();
  });

  it("receives from channel without sends side still creates message-to-channel edge", async () => {
    const program = await parseProgram(`
      visualizer main {
        service NotificationService {
          version 1.0.0
          receives event OrderCreated from order-events
        }
      }
    `);

    const graph = astToGraph(program);

    // When there's no sends side, receives should still create message -> channel edge
    const eventNode = graph.nodes.find(
      (n) => n.type === "event" && n.label === "OrderCreated",
    );
    const channelNode = graph.nodes.find(
      (n) => n.type === "channel" && n.label === "order-events",
    );
    expect(eventNode).toBeDefined();
    expect(channelNode).toBeDefined();

    expect(
      graph.edges.find(
        (e) =>
          e.source === eventNode!.id &&
          e.target === channelNode!.id &&
          e.type === "routes-to",
      ),
    ).toBeDefined();
  });

  it("service with @note annotations includes notes in metadata", async () => {
    const program = await parseProgram(`
      visualizer main {
        service OrderService {
          version 1.0.0
          @note("Come back later")
          @note("Needs review", author: "dboyne", priority: "high")
        }
      }
    `);

    const graph = astToGraph(program);

    const serviceNode = graph.nodes.find(
      (n) => n.type === "service" && n.label === "OrderService",
    );
    expect(serviceNode).toBeDefined();
    expect(serviceNode!.metadata.notes).toBeDefined();
    const notes = serviceNode!.metadata.notes as Array<{
      content: string;
      author?: string;
      priority?: string;
    }>;
    expect(notes).toHaveLength(2);
    expect(notes[0].content).toBe("Come back later");
    expect(notes[1].content).toBe("Needs review");
    expect(notes[1].author).toBe("dboyne");
    expect(notes[1].priority).toBe("high");
  });

  it("service without @note annotations has no notes in metadata", async () => {
    const program = await parseProgram(`
      visualizer main {
        service OrderService {
          version 1.0.0
        }
      }
    `);

    const graph = astToGraph(program);

    const serviceNode = graph.nodes.find(
      (n) => n.type === "service" && n.label === "OrderService",
    );
    expect(serviceNode).toBeDefined();
    expect(serviceNode!.metadata.notes).toBeUndefined();
  });

  it("event with @note annotations includes notes in metadata", async () => {
    const program = await parseProgram(`
      visualizer main {
        event OrderCreated {
          version 1.0.0
          @note("Schema v2 adds shippingAddress", author: "alice")
        }
      }
    `);

    const graph = astToGraph(program);

    const eventNode = graph.nodes.find(
      (n) => n.type === "event" && n.label === "OrderCreated",
    );
    expect(eventNode).toBeDefined();
    expect(eventNode!.metadata.notes).toBeDefined();
    const notes = eventNode!.metadata.notes as Array<{
      content: string;
      author?: string;
      priority?: string;
    }>;
    expect(notes).toHaveLength(1);
    expect(notes[0].content).toBe("Schema v2 adds shippingAddress");
    expect(notes[0].author).toBe("alice");
  });

  it("command with @note annotations includes notes in metadata", async () => {
    const program = await parseProgram(`
      visualizer main {
        command CreateOrder {
          version 1.0.0
          @note("Validate idempotency key", author: "bob", priority: "high")
        }
      }
    `);

    const graph = astToGraph(program);

    const cmdNode = graph.nodes.find(
      (n) => n.type === "command" && n.label === "CreateOrder",
    );
    expect(cmdNode).toBeDefined();
    expect(cmdNode!.metadata.notes).toBeDefined();
    const notes = cmdNode!.metadata.notes as Array<{
      content: string;
      author?: string;
      priority?: string;
    }>;
    expect(notes).toHaveLength(1);
    expect(notes[0].content).toBe("Validate idempotency key");
    expect(notes[0].author).toBe("bob");
    expect(notes[0].priority).toBe("high");
  });

  it("query with @note annotations includes notes in metadata", async () => {
    const program = await parseProgram(`
      visualizer main {
        query GetOrder {
          version 1.0.0
          @note("Consider caching", author: "carol")
        }
      }
    `);

    const graph = astToGraph(program);

    const queryNode = graph.nodes.find(
      (n) => n.type === "query" && n.label === "GetOrder",
    );
    expect(queryNode).toBeDefined();
    expect(queryNode!.metadata.notes).toBeDefined();
    const notes = queryNode!.metadata.notes as Array<{
      content: string;
      author?: string;
      priority?: string;
    }>;
    expect(notes).toHaveLength(1);
    expect(notes[0].content).toBe("Consider caching");
    expect(notes[0].author).toBe("carol");
  });

  it("channel with @note annotations includes notes in metadata", async () => {
    const program = await parseProgram(`
      visualizer main {
        channel OrderEvents {
          version 1.0.0
          address "orders.events"
          protocol "kafka"
          @note("Partition key is orderId", author: "infra-team")
          @note("Retention set to 7 days")
        }
      }
    `);

    const graph = astToGraph(program);

    const channelNode = graph.nodes.find(
      (n) => n.type === "channel" && n.label === "OrderEvents",
    );
    expect(channelNode).toBeDefined();
    expect(channelNode!.metadata.notes).toBeDefined();
    const notes = channelNode!.metadata.notes as Array<{
      content: string;
      author?: string;
      priority?: string;
    }>;
    expect(notes).toHaveLength(2);
    expect(notes[0].content).toBe("Partition key is orderId");
    expect(notes[0].author).toBe("infra-team");
    expect(notes[1].content).toBe("Retention set to 7 days");
    expect(notes[1].author).toBeUndefined();
  });

  it("inline message with @note annotations includes notes in metadata", async () => {
    const program = await parseProgram(`
      visualizer main {
        service OrderService {
          version 1.0.0
          sends event OrderCreated {
            version 1.0.0
            @note("Schema v2 adds shippingAddress", author: "alice")
          }
          receives command CreateOrder {
            version 1.0.0
            @note("Validate idempotency key", priority: "high")
          }
        }
      }
    `);

    const graph = astToGraph(program);

    const eventNode = graph.nodes.find(
      (n) => n.type === "event" && n.label === "OrderCreated",
    );
    expect(eventNode).toBeDefined();
    expect(eventNode!.metadata.notes).toBeDefined();
    const eventNotes = eventNode!.metadata.notes as Array<{
      content: string;
      author?: string;
      priority?: string;
    }>;
    expect(eventNotes).toHaveLength(1);
    expect(eventNotes[0].content).toBe("Schema v2 adds shippingAddress");
    expect(eventNotes[0].author).toBe("alice");

    const cmdNode = graph.nodes.find(
      (n) => n.type === "command" && n.label === "CreateOrder",
    );
    expect(cmdNode).toBeDefined();
    expect(cmdNode!.metadata.notes).toBeDefined();
    const cmdNotes = cmdNode!.metadata.notes as Array<{
      content: string;
      author?: string;
      priority?: string;
    }>;
    expect(cmdNotes).toHaveLength(1);
    expect(cmdNotes[0].content).toBe("Validate idempotency key");
    expect(cmdNotes[0].priority).toBe("high");
  });

  it("channel inside domain with @note annotations includes notes in metadata", async () => {
    const program = await parseProgram(`
      visualizer main {
        domain Orders {
          version 1.0.0
          channel OrderEvents {
            version 1.0.0
            address "orders.events"
            @note("Owned by platform team", author: "dave")
          }
        }
      }
    `);

    const graph = astToGraph(program);

    const channelNode = graph.nodes.find(
      (n) => n.type === "channel" && n.label === "OrderEvents",
    );
    expect(channelNode).toBeDefined();
    expect(channelNode!.metadata.notes).toBeDefined();
    const notes = channelNode!.metadata.notes as Array<{
      content: string;
      author?: string;
    }>;
    expect(notes).toHaveLength(1);
    expect(notes[0].content).toBe("Owned by platform team");
    expect(notes[0].author).toBe("dave");
  });

  it("channel route defined outside visualizer is resolved when channel is discovered via sends", async () => {
    const program = await parseProgram(`
      visualizer main {
        name "View Name"

        service Hello {
          version 1.0.0
          sends event HelloWorld to ChannelOne
        }
      }

      channel ChannelOne {
        version 1.0.0
        address "topic"
        route ChannelTwo
      }

      channel ChannelTwo {
        version 1.0.0
        address "topic"
      }
    `);

    const graph = astToGraph(program);

    // ChannelOne should exist (from sends to)
    const ch1 = graph.nodes.find(
      (n) => n.type === "channel" && n.label === "ChannelOne",
    );
    expect(ch1).toBeDefined();
    expect(ch1!.metadata.address).toBe("topic");

    // ChannelTwo should exist (from route)
    const ch2 = graph.nodes.find(
      (n) => n.type === "channel" && n.label === "ChannelTwo",
    );
    expect(ch2).toBeDefined();

    // ChannelOne -> ChannelTwo (routes-to)
    const routeEdge = graph.edges.find(
      (e) =>
        e.source === ch1!.id && e.target === ch2!.id && e.type === "routes-to",
    );
    expect(routeEdge).toBeDefined();
  });

  it("includes owners in node metadata", async () => {
    const program = await parseProgram(`
      visualizer main {
        name "Test"

        service OrderService {
          version 1.0.0
          owner orders-team
          owner platform-team
        }
      }
    `);

    const graph = astToGraph(program);
    const svc = graph.nodes.find((n) => n.type === "service");
    expect(svc).toBeDefined();
    expect(svc!.metadata.owners).toEqual(["orders-team", "platform-team"]);
  });

  // ─── Version resolution tests ──────────────────────────────

  it("bare ref resolves to latest version when multiple versions exist", async () => {
    const program = await parseProgram(`
      service OrderService {
        version 1.0.0
        name "Order Service (Legacy)"
        sends event OrderCreatedV1
      }

      service OrderService {
        version 2.0.0
        name "Order Service (New)"
        sends event OrderCreatedV2
      }

      visualizer main {
        service OrderService
      }
    `);

    const graph = astToGraph(program);

    // Bare ref should resolve to v2.0.0 (latest)
    const svcNode = graph.nodes.find((n) => n.type === "service");
    expect(svcNode).toBeDefined();
    expect(svcNode!.metadata.version).toBe("2.0.0");
    expect(svcNode!.label).toBe("Order Service (New)");
  });

  it("versioned ref resolves to exact version, not latest", async () => {
    const program = await parseProgram(`
      service OrderService {
        version 1.0.0
        name "Order Service (Legacy)"
        sends event OrderCreatedV1
      }

      service OrderService {
        version 2.0.0
        name "Order Service (New)"
        sends event OrderCreatedV2
      }

      visualizer main {
        service OrderService@1.0.0
      }
    `);

    const graph = astToGraph(program);

    const svcNode = graph.nodes.find((n) => n.type === "service");
    expect(svcNode).toBeDefined();
    expect(svcNode!.metadata.version).toBe("1.0.0");
    expect(svcNode!.label).toBe("Order Service (Legacy)");
  });

  it("both versioned refs resolve to their correct definitions", async () => {
    const program = await parseProgram(`
      service OrderService {
        version 1.0.0
        name "Order Service (Legacy)"
        summary "The original order service"
        sends event OrderCreatedV1
      }

      service OrderService {
        version 2.0.0
        name "Order Service (New)"
        summary "Rebuilt order service"
        sends event OrderCreatedV2
      }

      visualizer main {
        service OrderService@1.0.0
        service OrderService@2.0.0
      }
    `);

    const graph = astToGraph(program);

    const v1 = graph.nodes.find((n) => n.id === "service:OrderService@1.0.0");
    const v2 = graph.nodes.find((n) => n.id === "service:OrderService@2.0.0");
    expect(v1).toBeDefined();
    expect(v2).toBeDefined();
    expect(v1!.label).toBe("Order Service (Legacy)");
    expect(v2!.label).toBe("Order Service (New)");
    expect(v1!.metadata.summary).toBe("The original order service");
    expect(v2!.metadata.summary).toBe("Rebuilt order service");

    // Each should have correct sends edges
    const v1Sends = graph.edges.find(
      (e) => e.source === v1!.id && e.type === "sends",
    );
    const v2Sends = graph.edges.find(
      (e) => e.source === v2!.id && e.type === "sends",
    );
    expect(v1Sends).toBeDefined();
    expect(v2Sends).toBeDefined();
    expect(v1Sends!.target).toContain("OrderCreatedV1");
    expect(v2Sends!.target).toContain("OrderCreatedV2");
  });

  it("bare ref resolves to latest even when older version is defined last", async () => {
    const program = await parseProgram(`
      service OrderService {
        version 3.0.0
        name "Order Service V3"
      }

      service OrderService {
        version 1.0.0
        name "Order Service V1"
      }

      service OrderService {
        version 2.0.0
        name "Order Service V2"
      }

      visualizer main {
        service OrderService
      }
    `);

    const graph = astToGraph(program);

    const svcNode = graph.nodes.find((n) => n.type === "service");
    expect(svcNode).toBeDefined();
    expect(svcNode!.metadata.version).toBe("3.0.0");
    expect(svcNode!.label).toBe("Order Service V3");
  });

  // ─── Nested definition inference tests ──────────────────────────────

  it("flow ref infers type from service nested inside a domain", async () => {
    const program = await parseProgram(`
      domain Orders {
        version 1.0.0
        service OrderService {
          version 1.0.0
        }
      }

      event OrderCreated {
        version 1.0.0
      }

      visualizer main {
        flow OrderFlow {
          version 1.0.0
          OrderService -> OrderCreated
        }
      }
    `);

    const graph = astToGraph(program);

    const svcNode = graph.nodes.find((n) => n.label === "OrderService");
    expect(svcNode).toBeDefined();
    // Without the fix, this would be "step" because OrderService is nested in a domain
    expect(svcNode!.type).toBe("service");

    const eventNode = graph.nodes.find((n) => n.label === "OrderCreated");
    expect(eventNode).toBeDefined();
    expect(eventNode!.type).toBe("event");
  });

  it("flow ref infers type from container nested inside a domain", async () => {
    const program = await parseProgram(`
      domain Inventory {
        version 1.0.0
        container InventoryDB {
          version 1.0.0
        }
      }

      service InventoryService {
        version 1.0.0
      }

      visualizer main {
        flow InventoryFlow {
          version 1.0.0
          InventoryService -> InventoryDB
        }
      }
    `);

    const graph = astToGraph(program);

    const containerNode = graph.nodes.find((n) => n.label === "InventoryDB");
    expect(containerNode).toBeDefined();
    // Without the fix, this would be "step" because InventoryDB is nested in a domain
    expect(containerNode!.type).toBe("container");
  });

  // ─── Data-product message type tests ──────────────────────────────

  it("data-product input command creates a command node, not event", async () => {
    const program = await parseProgram(`
      visualizer main {
        data-product OrderAnalytics {
          version 1.0.0
          input command PlaceOrder
          input event OrderCreated
        }
      }
    `);

    const graph = astToGraph(program);

    const cmdNode = graph.nodes.find((n) => n.label === "PlaceOrder");
    expect(cmdNode).toBeDefined();
    expect(cmdNode!.type).toBe("command");

    const eventNode = graph.nodes.find((n) => n.label === "OrderCreated");
    expect(eventNode).toBeDefined();
    expect(eventNode!.type).toBe("event");
  });

  it("data-product input query creates a query node, not event", async () => {
    const program = await parseProgram(`
      visualizer main {
        data-product OrderAnalytics {
          version 1.0.0
          input query GetOrders
        }
      }
    `);

    const graph = astToGraph(program);

    const queryNode = graph.nodes.find((n) => n.label === "GetOrders");
    expect(queryNode).toBeDefined();
    expect(queryNode!.type).toBe("query");
  });

  it("data-product output command creates a command node, not event", async () => {
    const program = await parseProgram(`
      visualizer main {
        data-product OrderAnalytics {
          version 1.0.0
          output command ProcessOrder
          output event OrderProcessed
          output query GetAnalytics
        }
      }
    `);

    const graph = astToGraph(program);

    const cmdNode = graph.nodes.find((n) => n.label === "ProcessOrder");
    expect(cmdNode).toBeDefined();
    expect(cmdNode!.type).toBe("command");

    const eventNode = graph.nodes.find((n) => n.label === "OrderProcessed");
    expect(eventNode).toBeDefined();
    expect(eventNode!.type).toBe("event");

    const queryNode = graph.nodes.find((n) => n.label === "GetAnalytics");
    expect(queryNode).toBeDefined();
    expect(queryNode!.type).toBe("query");
  });

  // ─── Receives from multiple channels tests ──────────────────────────────

  it("receives from multiple channels creates routes-to edges for all channels", async () => {
    const program = await parseProgram(`
      visualizer main {
        service NotificationService {
          version 1.0.0
          receives event OrderCreated from channel-a, channel-b
        }
      }
    `);

    const graph = astToGraph(program);

    const eventNode = graph.nodes.find(
      (n) => n.type === "event" && n.label === "OrderCreated",
    );
    const chA = graph.nodes.find(
      (n) => n.type === "channel" && n.label === "channel-a",
    );
    const chB = graph.nodes.find(
      (n) => n.type === "channel" && n.label === "channel-b",
    );
    expect(eventNode).toBeDefined();
    expect(chA).toBeDefined();
    expect(chB).toBeDefined();

    // Both channels should have a routes-to edge from the message
    const routeToA = graph.edges.find(
      (e) =>
        e.source === eventNode!.id &&
        e.target === chA!.id &&
        e.type === "routes-to",
    );
    const routeToB = graph.edges.find(
      (e) =>
        e.source === eventNode!.id &&
        e.target === chB!.id &&
        e.type === "routes-to",
    );
    expect(routeToA).toBeDefined();
    // Without the fix, this would be undefined because the dedupe check was too broad
    expect(routeToB).toBeDefined();

    // Both channels should have receives edges to the service
    const svcNode = graph.nodes.find((n) => n.type === "service");
    const chAReceives = graph.edges.find(
      (e) =>
        e.source === chA!.id &&
        e.target === svcNode!.id &&
        e.type === "receives",
    );
    const chBReceives = graph.edges.find(
      (e) =>
        e.source === chB!.id &&
        e.target === svcNode!.id &&
        e.type === "receives",
    );
    expect(chAReceives).toBeDefined();
    expect(chBReceives).toBeDefined();
  });
});
