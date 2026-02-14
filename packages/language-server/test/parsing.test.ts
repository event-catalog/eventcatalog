import { describe, it, expect, beforeAll } from "vitest";
import { createEcServices } from "../src/ec-module.js";
import { EmptyFileSystem } from "langium";
import { parseDocument } from "langium/test";
import type { Program } from "../src/generated/ast.js";
import {
  isDomainDef,
  isServiceDef,
  isSendsStmt,
  isReceivesStmt,
  isToClause,
  isFromClause,
  isChannelDef,
  isContainerDef,
  isFlowDef,
  isUserDef,
  isTeamDef,
  isDataProductDef,
  isDiagramDef,
  isEventDef,
  isSubdomainDef,
  isServiceRefStmt,
  isActorDef,
  isExternalSystemDef,
} from "../src/generated/ast.js";
import * as utils from "../src/ast-utils.js";

const services = createEcServices(EmptyFileSystem);

async function parseProgram(input: string) {
  const doc = await parseDocument<Program>(services.Ec, input);
  return doc;
}

// ---------------------------------------------------------------------------
// 1. Simple domain
// ---------------------------------------------------------------------------
describe("Simple domain", () => {
  it("parses a domain with version and summary", async () => {
    const doc = await parseProgram(`
      domain Orders {
        version 1.0.0
        summary "Order management"
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const program = doc.parseResult.value;
    expect(program.definitions).toHaveLength(1);

    const def = program.definitions[0];
    expect(isDomainDef(def)).toBe(true);
    if (isDomainDef(def)) {
      expect(def.name).toBe("Orders");
      expect(utils.getVersion(def.body)).toBe("1.0.0");
      expect(utils.getSummary(def.body)).toBe("Order management");
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Domain with services
// ---------------------------------------------------------------------------
describe("Domain with services", () => {
  it("parses a nested service inside a domain", async () => {
    const doc = await parseProgram(`
      domain Payment {
        version 1.0.0

        service PaymentService {
          version 2.0.0
          summary "Handles payments"
        }
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const domain = doc.parseResult.value.definitions[0];
    expect(isDomainDef(domain)).toBe(true);
    if (isDomainDef(domain)) {
      const svcs = utils.getServices(domain.body);
      expect(svcs).toHaveLength(1);
      expect(svcs[0].name).toBe("PaymentService");
      expect(utils.getVersion(svcs[0].body)).toBe("2.0.0");
      expect(utils.getSummary(svcs[0].body)).toBe("Handles payments");
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Sends with inline definition
// ---------------------------------------------------------------------------
describe("Sends with inline definition", () => {
  it("parses sends event with an inline body", async () => {
    const doc = await parseProgram(`
      service OrderService {
        version 1.0.0

        sends event OrderCreated {
          version 1.0.0
          summary "A new order"
        }
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const svc = doc.parseResult.value.definitions[0];
    expect(isServiceDef(svc)).toBe(true);
    if (isServiceDef(svc)) {
      const sends = utils.getSends(svc.body);
      expect(sends).toHaveLength(1);
      expect(sends[0].messageName).toBe("OrderCreated");
      expect(sends[0].messageType).toBe("event");
      expect(sends[0].body.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Channel routing (to and from)
// ---------------------------------------------------------------------------
describe("Channel routing", () => {
  it("parses sends to channel", async () => {
    const doc = await parseProgram(`
      service OrderService {
        version 1.0.0
        sends event OrderCreated to orders-topic
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const svc = doc.parseResult.value.definitions[0];
    if (isServiceDef(svc)) {
      const sends = utils.getSends(svc.body);
      expect(sends).toHaveLength(1);
      expect(sends[0].channelClause).toBeDefined();
      expect(isToClause(sends[0].channelClause)).toBe(true);
      if (isToClause(sends[0].channelClause)) {
        expect(sends[0].channelClause.channels).toHaveLength(1);
        expect(sends[0].channelClause.channels[0].channelName).toBe(
          "orders-topic",
        );
      }
    }
  });

  it("parses receives from channel with delivery mode", async () => {
    const doc = await parseProgram(`
      service PaymentService {
        version 1.0.0
        receives event PaymentProcessed from payment-queue delivery pull
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const svc = doc.parseResult.value.definitions[0];
    if (isServiceDef(svc)) {
      const receives = utils.getReceives(svc.body);
      expect(receives).toHaveLength(1);
      expect(receives[0].channelClause).toBeDefined();
      expect(isFromClause(receives[0].channelClause)).toBe(true);
      if (isFromClause(receives[0].channelClause)) {
        expect(receives[0].channelClause.channels).toHaveLength(1);
        expect(receives[0].channelClause.channels[0].channelName).toBe(
          "payment-queue",
        );
        expect(receives[0].channelClause.deliveryMode).toBe("pull");
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Sends to channel with inline body
// ---------------------------------------------------------------------------
describe("Sends to channel with inline body", () => {
  it("parses sends with both channel clause and inline body", async () => {
    const doc = await parseProgram(`
      service OrderService {
        version 1.0.0
        sends event OrderCancelled to order-events {
          version 1.0.0
        }
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const svc = doc.parseResult.value.definitions[0];
    if (isServiceDef(svc)) {
      const sends = utils.getSends(svc.body);
      expect(sends).toHaveLength(1);
      expect(sends[0].channelClause).toBeDefined();
      expect(isToClause(sends[0].channelClause)).toBe(true);
      expect(sends[0].body.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 6. Channel definition
// ---------------------------------------------------------------------------
describe("Channel definition", () => {
  it("parses a channel with address, protocol, and parameter", async () => {
    const doc = await parseProgram(`
      channel orders-topic {
        version 1.0.0
        summary "Order events topic"
        address "orders.events.v1"
        protocol "Kafka"

        parameter region {
          description "AWS region"
          default "us-east-1"
          enum ["us-east-1", "eu-west-1"]
        }
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const ch = doc.parseResult.value.definitions[0];
    expect(isChannelDef(ch)).toBe(true);
    if (isChannelDef(ch)) {
      expect(ch.name).toBe("orders-topic");
      expect(utils.getAddress(ch.body)).toBe("orders.events.v1");
      expect(utils.getProtocols(ch.body)).toContain("Kafka");
      expect(utils.getParameters(ch.body)).toHaveLength(1);
    }
  });

  it("rejects message statement inside a channel", async () => {
    const doc = await parseProgram(`
      channel orders-topic {
        version 1.0.0
        message event OrderCreated@1.0.0
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors.length).toBeGreaterThan(0);
  });

  it("parses a channel with route statements", async () => {
    const doc = await parseProgram(`
      channel KafkaRaw {
        version 1.0.0
        protocol "Kafka"
        route KafkaFiltered
        route MqttBridge@2.0.0
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const ch = doc.parseResult.value.definitions[0];
    expect(isChannelDef(ch)).toBe(true);
    if (isChannelDef(ch)) {
      const routes = utils.getRoutes(ch.body);
      expect(routes).toHaveLength(2);
      expect(routes[0].ref.name).toBe("KafkaFiltered");
      expect(routes[0].ref.version).toBeUndefined();
      expect(routes[1].ref.name).toBe("MqttBridge");
      expect(routes[1].ref.version).toBe("2.0.0");
    }
  });
});

// ---------------------------------------------------------------------------
// 7. Container
// ---------------------------------------------------------------------------
describe("Container definition", () => {
  it("parses a container with container-type, technology, access-mode, classification", async () => {
    const doc = await parseProgram(`
      container orders-db {
        version 1.0.0
        summary "Orders database"
        container-type database
        technology "postgres@15"
        access-mode readWrite
        classification internal
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const container = doc.parseResult.value.definitions[0];
    expect(isContainerDef(container)).toBe(true);
    if (isContainerDef(container)) {
      expect(container.name).toBe("orders-db");
      expect(utils.getContainerType(container.body)).toBe("database");
      expect(utils.getTechnology(container.body)).toBe("postgres@15");
      expect(utils.getAccessMode(container.body)).toBe("readWrite");
      expect(utils.getClassification(container.body)).toBe("internal");
    }
  });

  it("parses a container with deprecated", async () => {
    const doc = await parseProgram(`
      container testing-db {
        version 1.0.0
        summary "Testing database"
        container-type database
        deprecated true
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const container = doc.parseResult.value.definitions[0];
    expect(isContainerDef(container)).toBe(true);
    if (isContainerDef(container)) {
      expect(utils.getDeprecated(container.body)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 9. Flow with arrow-based chains
// ---------------------------------------------------------------------------
describe("Flow with when blocks", () => {
  it("parses a flow with an entry chain", async () => {
    const doc = await parseProgram(`
      flow OrderFulfillment {
        version 1.0.0
        summary "Order fulfillment process"

        Customer "places an order" -> PlaceOrder -> OrderService "creates the order" -> OrderCreated
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const flow = doc.parseResult.value.definitions[0];
    expect(isFlowDef(flow)).toBe(true);
    if (isFlowDef(flow)) {
      expect(flow.name).toBe("OrderFulfillment");
      const chains = utils.getFlowEntryChains(flow.body);
      expect(chains).toHaveLength(1);
      expect(chains[0].sources).toHaveLength(1);
      expect(chains[0].sources[0].name).toBe("Customer");
      expect(chains[0].sources[0].label).toBe("places an order");
      expect(chains[0].targets).toHaveLength(3);
    }
  });

  it("parses a when block with actions", async () => {
    const doc = await parseProgram(`
      flow PaymentFlow {
        version 1.0.0

        when OrderCreated
          PaymentService "processes the payment"
            -> PaymentProcessed
          InventoryService "reserves stock"
            -> StockReserved
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const flow = doc.parseResult.value.definitions[0];
    if (isFlowDef(flow)) {
      const blocks = utils.getFlowWhenBlocks(flow.body);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].triggers).toHaveLength(1);
      expect(blocks[0].triggers[0].name).toBe("OrderCreated");
      expect(blocks[0].actions).toHaveLength(2);
      expect(blocks[0].actions[0].ref.name).toBe("PaymentService");
      expect(blocks[0].actions[0].outputs).toHaveLength(1);
      expect(blocks[0].actions[0].outputs[0].target.name).toBe(
        "PaymentProcessed",
      );
    }
  });

  it("parses labeled outputs (success/failure)", async () => {
    const doc = await parseProgram(`
      flow BranchFlow {
        version 1.0.0

        when OrderCreated
          PaymentService "processes payment"
            -> "success": PaymentProcessed
            -> "failure": PaymentFailed
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const flow = doc.parseResult.value.definitions[0];
    if (isFlowDef(flow)) {
      const blocks = utils.getFlowWhenBlocks(flow.body);
      const action = blocks[0].actions[0];
      expect(action.outputs).toHaveLength(2);
      expect(action.outputs[0].label).toBe("success");
      expect(action.outputs[0].target.name).toBe("PaymentProcessed");
      expect(action.outputs[1].label).toBe("failure");

      expect(action.outputs[1].target.name).toBe("PaymentFailed");
    }
  });

  it("parses convergence with 'and' keyword", async () => {
    const doc = await parseProgram(`
      flow ConvergeFlow {
        version 1.0.0

        when PaymentProcessed and StockReserved
          FulfillmentService "ships the order"
            -> OrderShipped
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const flow = doc.parseResult.value.definitions[0];
    if (isFlowDef(flow)) {
      const blocks = utils.getFlowWhenBlocks(flow.body);
      expect(blocks[0].triggers).toHaveLength(2);
      expect(blocks[0].triggers[0].name).toBe("PaymentProcessed");
      expect(blocks[0].triggers[1].name).toBe("StockReserved");
    }
  });

  it("parses a terminal action with no output", async () => {
    const doc = await parseProgram(`
      flow NotifyFlow {
        version 1.0.0

        when PaymentFailed
          NotificationService "notifies the customer of failure"
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const flow = doc.parseResult.value.definitions[0];
    if (isFlowDef(flow)) {
      const blocks = utils.getFlowWhenBlocks(flow.body);
      expect(blocks[0].actions).toHaveLength(1);
      expect(blocks[0].actions[0].ref.name).toBe("NotificationService");
      expect(blocks[0].actions[0].outputs).toHaveLength(0);
    }
  });

  it("parses a full flow with entry chain and multiple when blocks", async () => {
    const doc = await parseProgram(`
      flow OrderFulfillment {
        version 1.0.0
        name "Order Fulfillment"

        Customer "places an order" -> PlaceOrder -> OrderService -> OrderCreated

        when OrderCreated
          PaymentService "processes the payment"
            -> "success": PaymentProcessed
            -> "failure": PaymentFailed
          InventoryService "reserves stock"
            -> StockReserved

        when PaymentFailed
          NotificationService "notifies the customer"

        when PaymentProcessed and StockReserved
          FulfillmentService "ships the order" -> OrderShipped

        when OrderShipped
          WarehouseWMS "syncs with legacy WMS"
          NotificationService "notifies the customer" -> CustomerNotified
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const flow = doc.parseResult.value.definitions[0];
    if (isFlowDef(flow)) {
      const chains = utils.getFlowEntryChains(flow.body);
      const blocks = utils.getFlowWhenBlocks(flow.body);
      expect(chains).toHaveLength(1);
      expect(blocks).toHaveLength(4);
    }
  });
});

// ---------------------------------------------------------------------------
// 10. User and team
// ---------------------------------------------------------------------------
describe("User and team definitions", () => {
  it("parses a user with name, email, and role", async () => {
    const doc = await parseProgram(`
      user dboyne {
        name "David Boyne"
        email "david@example.com"
        role "Principal Engineer"
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const user = doc.parseResult.value.definitions[0];
    expect(isUserDef(user)).toBe(true);
    if (isUserDef(user)) {
      expect(user.name).toBe("dboyne");
    }
  });

  it("parses a team with members", async () => {
    const doc = await parseProgram(`
      team payment-team {
        name "Payment Team"
        summary "Handles all payment processing"
        email "payments@company.com"
        member dboyne
        member jane-doe
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const team = doc.parseResult.value.definitions[0];
    expect(isTeamDef(team)).toBe(true);
    if (isTeamDef(team)) {
      expect(team.name).toBe("payment-team");
    }
  });
});

// ---------------------------------------------------------------------------
// 11. Annotations
// ---------------------------------------------------------------------------
describe("Annotations", () => {
  it("parses an annotation with positional and named args", async () => {
    const doc = await parseProgram(`
      domain Orders {
        version 1.0.0
        @badge("Production", bg: "#22c55e", text: "#fff")
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const domain = doc.parseResult.value.definitions[0];
    if (isDomainDef(domain)) {
      const annotations = utils.getAnnotations(domain.body);
      expect(annotations).toHaveLength(1);
      expect(annotations[0].name).toBe("badge");
      expect(annotations[0].args).toHaveLength(3);
    }
  });
});

// ---------------------------------------------------------------------------
// 12. Data product
// ---------------------------------------------------------------------------
describe("Data product definition", () => {
  it("parses a data product with input and output with contract", async () => {
    const doc = await parseProgram(`
      data-product customer-analytics {
        version 1.0.0
        summary "Customer analytics data product"

        input event OrderCreated
        output event CustomerReport {
          contract {
            path "schemas/report.avro"
            name "CustomerReport"
            type "avro"
          }
        }
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const dp = doc.parseResult.value.definitions[0];
    expect(isDataProductDef(dp)).toBe(true);
    if (isDataProductDef(dp)) {
      expect(dp.name).toBe("customer-analytics");
      expect(utils.getInputs(dp.body)).toHaveLength(1);
      expect(utils.getOutputs(dp.body)).toHaveLength(1);
    }
  });
});

// ---------------------------------------------------------------------------
// 13. Diagram
// ---------------------------------------------------------------------------
describe("Diagram definition", () => {
  it("parses a simple diagram with name and summary", async () => {
    const doc = await parseProgram(`
      diagram system-overview {
        version 1.0.0
        name "System Overview"
        summary "High-level architecture diagram"
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const diag = doc.parseResult.value.definitions[0];
    expect(isDiagramDef(diag)).toBe(true);
    if (isDiagramDef(diag)) {
      expect(diag.name).toBe("system-overview");
      expect(utils.getSummary(diag.body)).toBe(
        "High-level architecture diagram",
      );
    }
  });
});

// ---------------------------------------------------------------------------
// 14. Writes-to and reads-from
// ---------------------------------------------------------------------------
describe("Writes-to and reads-from", () => {
  it("parses writes-to and reads-from statements in a service", async () => {
    const doc = await parseProgram(`
      service OrderService {
        version 1.0.0
        writes-to container orders-db
        reads-from container analytics-db
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const svc = doc.parseResult.value.definitions[0];
    if (isServiceDef(svc)) {
      const writesTo = utils.getWritesToRefs(svc.body);
      expect(writesTo).toHaveLength(1);
      const readsFrom = utils.getReadsFromRefs(svc.body);
      expect(readsFrom).toHaveLength(1);
    }
  });
});

// ---------------------------------------------------------------------------
// 15. Subdomains
// ---------------------------------------------------------------------------
describe("Subdomains", () => {
  it("parses a subdomain inside a domain with a service", async () => {
    const doc = await parseProgram(`
      domain Commerce {
        version 1.0.0

        subdomain Checkout {
          version 1.0.0
          summary "Checkout subdomain"

          service CheckoutService {
            version 1.0.0
          }
        }
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const domain = doc.parseResult.value.definitions[0];
    if (isDomainDef(domain)) {
      const subdomains = utils.getSubdomains(domain.body);
      expect(subdomains).toHaveLength(1);
      expect(subdomains[0].name).toBe("Checkout");
      const subServices = utils.getServices(subdomains[0].body);
      expect(subServices).toHaveLength(1);
      expect(subServices[0].name).toBe("CheckoutService");
    }
  });
});

// ---------------------------------------------------------------------------
// 16. Standalone events
// ---------------------------------------------------------------------------
describe("Standalone events", () => {
  it("parses a standalone event without channel refs", async () => {
    const doc = await parseProgram(`
      event OrderCreated {
        version 1.0.0
        summary "Order was created"
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const evt = doc.parseResult.value.definitions[0];
    expect(isEventDef(evt)).toBe(true);
    if (isEventDef(evt)) {
      expect(evt.name).toBe("OrderCreated");
    }
  });

  it("rejects channel statement inside a message", async () => {
    const doc = await parseProgram(`
      event OrderCreated {
        version 1.0.0
        channel orders-topic
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 17. Owner statements
// ---------------------------------------------------------------------------
describe("Owner statements", () => {
  it("parses owner references in a service", async () => {
    const doc = await parseProgram(`
      service OrderService {
        version 1.0.0
        owner orders-team
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const svc = doc.parseResult.value.definitions[0];
    if (isServiceDef(svc)) {
      const owners = utils.getOwners(svc.body);
      expect(owners).toHaveLength(1);
      expect(owners[0]).toBe("orders-team");
    }
  });
});

// ---------------------------------------------------------------------------
// 18. Draft statements
// ---------------------------------------------------------------------------
describe("Draft statements", () => {
  it("parses draft in a service", async () => {
    const doc = await parseProgram(`
      service OrderService {
        version 1.0.0
        draft true
      }
    `);
    expect(doc.parseResult.parserErrors).toHaveLength(0);
  });

  it("parses draft in a domain", async () => {
    const doc = await parseProgram(`
      domain Orders {
        version 1.0.0
        draft true
      }
    `);
    expect(doc.parseResult.parserErrors).toHaveLength(0);
  });

  it("parses draft in an event", async () => {
    const doc = await parseProgram(`
      event OrderCreated {
        version 1.0.0
        draft true
      }
    `);
    expect(doc.parseResult.parserErrors).toHaveLength(0);
  });

  it("parses draft in a container", async () => {
    const doc = await parseProgram(`
      container orders-db {
        version 1.0.0
        draft true
      }
    `);
    expect(doc.parseResult.parserErrors).toHaveLength(0);
  });

  it("parses draft in a data product", async () => {
    const doc = await parseProgram(`
      data-product OrderAnalytics {
        version 1.0.0
        draft true
      }
    `);
    expect(doc.parseResult.parserErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 19. Service references inside domains
// ---------------------------------------------------------------------------
describe("Service references inside domains", () => {
  it("parses a service reference with version inside a domain", async () => {
    const doc = await parseProgram(`
      domain Name {
        version 1.0.0
        service Random@1.0.0
      }

      service Random {
        version 1.0.0
        summary "This is really cool"
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const domain = doc.parseResult.value.definitions[0];
    expect(isDomainDef(domain)).toBe(true);
    if (isDomainDef(domain)) {
      const serviceRefs = utils.getServiceRefs(domain.body);
      expect(serviceRefs).toHaveLength(1);
      expect(serviceRefs[0].ref.name).toBe("Random");
      expect(serviceRefs[0].ref.version).toBe("1.0.0");
    }
  });

  it("parses a service reference without version inside a domain", async () => {
    const doc = await parseProgram(`
      domain Name {
        version 1.0.0
        service Random
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const domain = doc.parseResult.value.definitions[0];
    if (isDomainDef(domain)) {
      const serviceRefs = utils.getServiceRefs(domain.body);
      expect(serviceRefs).toHaveLength(1);
      expect(serviceRefs[0].ref.name).toBe("Random");
    }
  });
});

// ---------------------------------------------------------------------------
// 20. Visualizer
// ---------------------------------------------------------------------------
describe("Visualizer", () => {
  it("parses a visualizer with inline definitions", async () => {
    const doc = await parseProgram(`
      visualizer main {
        service OrderService {
          version 1.0.0
          sends event OrderCreated
        }
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const viz = doc.parseResult.value.definitions[0];
    expect(viz.$type).toBe("VisualizerDef");
    expect(viz.name).toBe("main");
  });

  it("parses a visualizer with service references", async () => {
    const doc = await parseProgram(`
      service OrderService {
        version 1.0.0
      }

      visualizer main {
        service OrderService@1.0.0
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    expect(doc.parseResult.value.definitions).toHaveLength(2);
    const viz = doc.parseResult.value.definitions[1];
    expect(viz.$type).toBe("VisualizerDef");
  });

  it("parses a visualizer with container reference", async () => {
    const doc = await parseProgram(`
      visualizer main {
        container OrdersDB@1.0.0
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);
  });

  it("parses multiple visualizer blocks", async () => {
    const doc = await parseProgram(`
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
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const defs = doc.parseResult.value.definitions;
    expect(defs).toHaveLength(2);
    expect(defs[0].$type).toBe("VisualizerDef");
    expect(defs[1].$type).toBe("VisualizerDef");
    expect(defs[0].name).toBe("overview");
    expect(defs[1].name).toBe("detailed");
  });

  it("parses a visualizer with animated property", async () => {
    const doc = await parseProgram(`
      visualizer main {
        animated true
        service OrderService {
          version 1.0.0
        }
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Multiple channels and @ version syntax
// ---------------------------------------------------------------------------
describe("Multiple channels with comma-separated syntax", () => {
  it("parses sends to multiple channels", async () => {
    const doc = await parseProgram(`
      service OrderService {
        version 1.0.0
        sends event OrderCreated to orders-topic, backup-topic, audit-topic
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const svc = doc.parseResult.value.definitions[0];
    if (isServiceDef(svc)) {
      const sends = utils.getSends(svc.body);
      expect(sends).toHaveLength(1);
      expect(sends[0].channelClause).toBeDefined();
      expect(isToClause(sends[0].channelClause)).toBe(true);
      if (isToClause(sends[0].channelClause)) {
        expect(sends[0].channelClause.channels).toHaveLength(3);
        expect(sends[0].channelClause.channels[0].channelName).toBe(
          "orders-topic",
        );
        expect(sends[0].channelClause.channels[1].channelName).toBe(
          "backup-topic",
        );
        expect(sends[0].channelClause.channels[2].channelName).toBe(
          "audit-topic",
        );
      }
    }
  });

  it("parses receives from multiple channels", async () => {
    const doc = await parseProgram(`
      service PaymentService {
        version 1.0.0
        receives event PaymentProcessed from payment-events, payment-retry
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const svc = doc.parseResult.value.definitions[0];
    if (isServiceDef(svc)) {
      const receives = utils.getReceives(svc.body);
      expect(receives).toHaveLength(1);
      expect(receives[0].channelClause).toBeDefined();
      expect(isFromClause(receives[0].channelClause)).toBe(true);
      if (isFromClause(receives[0].channelClause)) {
        expect(receives[0].channelClause.channels).toHaveLength(2);
        expect(receives[0].channelClause.channels[0].channelName).toBe(
          "payment-events",
        );
        expect(receives[0].channelClause.channels[1].channelName).toBe(
          "payment-retry",
        );
      }
    }
  });

  it("parses multiple channels with delivery mode", async () => {
    const doc = await parseProgram(`
      service OrderService {
        version 1.0.0
        sends event OrderCreated to orders-topic, backup-topic delivery push
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const svc = doc.parseResult.value.definitions[0];
    if (isServiceDef(svc)) {
      const sends = utils.getSends(svc.body);
      expect(sends).toHaveLength(1);
      expect(isToClause(sends[0].channelClause)).toBe(true);
      if (isToClause(sends[0].channelClause)) {
        expect(sends[0].channelClause.channels).toHaveLength(2);
        expect(sends[0].channelClause.deliveryMode).toBe("push");
      }
    }
  });
});

// ---------------------------------------------------------------------------
// @note annotation
// ---------------------------------------------------------------------------
describe("@note annotation", () => {
  it("parses @note with simple string", async () => {
    const doc = await parseProgram(`
      service OrderService {
        version 1.0.0
        @note("Come back later")
      }
    `);
    expect(doc.parseResult.parserErrors).toHaveLength(0);

    const svc = doc.parseResult.value.definitions[0];
    if (isServiceDef(svc)) {
      const annotations = utils.getAnnotations(svc.body);
      expect(annotations).toHaveLength(1);
      expect(annotations[0].name).toBe("note");
    }
  });

  it("parses @note with named parameters", async () => {
    const doc = await parseProgram(`
      service OrderService {
        version 1.0.0
        @note("Needs review", author: "dboyne", priority: "high")
      }
    `);
    expect(doc.parseResult.parserErrors).toHaveLength(0);

    const svc = doc.parseResult.value.definitions[0];
    if (isServiceDef(svc)) {
      const annotations = utils.getAnnotations(svc.body);
      expect(annotations).toHaveLength(1);
      expect(annotations[0].args).toHaveLength(3);
    }
  });

  it("parses multiple @note annotations on same resource", async () => {
    const doc = await parseProgram(`
      event OrderCreated {
        version 1.0.0
        @note("First note")
        @note("Second note")
      }
    `);
    expect(doc.parseResult.parserErrors).toHaveLength(0);

    const evt = doc.parseResult.value.definitions[0];
    if (isEventDef(evt)) {
      const annotations = utils.getAnnotations(evt.body);
      expect(annotations).toHaveLength(2);
      expect(annotations[0].name).toBe("note");
      expect(annotations[1].name).toBe("note");
    }
  });
});

describe("@ version syntax", () => {
  it("parses message reference with @ version", async () => {
    const doc = await parseProgram(`
      service OrderService {
        version 1.0.0
        sends event OrderCreated@2.0.0
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const svc = doc.parseResult.value.definitions[0];
    if (isServiceDef(svc)) {
      const sends = utils.getSends(svc.body);
      expect(sends).toHaveLength(1);
      expect(sends[0].messageName).toBe("OrderCreated");
      expect(sends[0].version).toBe("2.0.0");
    }
  });

  it("parses channel reference with @ version", async () => {
    const doc = await parseProgram(`
      service OrderService {
        version 1.0.0
        sends event OrderCreated to orders-topic@1.0.0
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const svc = doc.parseResult.value.definitions[0];
    if (isServiceDef(svc)) {
      const sends = utils.getSends(svc.body);
      expect(sends).toHaveLength(1);
      expect(isToClause(sends[0].channelClause)).toBe(true);
      if (isToClause(sends[0].channelClause)) {
        expect(sends[0].channelClause.channels[0].channelName).toBe(
          "orders-topic",
        );
        expect(sends[0].channelClause.channels[0].channelVersion).toBe("1.0.0");
      }
    }
  });

  it("parses multiple channels with mixed versions", async () => {
    const doc = await parseProgram(`
      service PaymentService {
        version 1.0.0
        receives event PaymentProcessed from payment-events@1.0.0, payment-retry@2.1.0, payment-dlq
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const svc = doc.parseResult.value.definitions[0];
    if (isServiceDef(svc)) {
      const receives = utils.getReceives(svc.body);
      expect(receives).toHaveLength(1);
      expect(isFromClause(receives[0].channelClause)).toBe(true);
      if (isFromClause(receives[0].channelClause)) {
        expect(receives[0].channelClause.channels).toHaveLength(3);
        expect(receives[0].channelClause.channels[0].channelName).toBe(
          "payment-events",
        );
        expect(receives[0].channelClause.channels[0].channelVersion).toBe(
          "1.0.0",
        );
        expect(receives[0].channelClause.channels[1].channelName).toBe(
          "payment-retry",
        );
        expect(receives[0].channelClause.channels[1].channelVersion).toBe(
          "2.1.0",
        );
        expect(receives[0].channelClause.channels[2].channelName).toBe(
          "payment-dlq",
        );
        expect(
          receives[0].channelClause.channels[2].channelVersion,
        ).toBeUndefined();
      }
    }
  });

  it("parses message with @ version and multiple channels with @ versions", async () => {
    const doc = await parseProgram(`
      service OrderService {
        version 1.0.0
        sends event OrderCreated@2.0.0 to orders-topic@1.0.0, backup-topic@2.0.0
      }
    `);
    const errors = doc.parseResult.parserErrors;
    expect(errors).toHaveLength(0);

    const svc = doc.parseResult.value.definitions[0];
    if (isServiceDef(svc)) {
      const sends = utils.getSends(svc.body);
      expect(sends).toHaveLength(1);
      expect(sends[0].messageName).toBe("OrderCreated");
      expect(sends[0].version).toBe("2.0.0");
      expect(isToClause(sends[0].channelClause)).toBe(true);
      if (isToClause(sends[0].channelClause)) {
        expect(sends[0].channelClause.channels).toHaveLength(2);
        expect(sends[0].channelClause.channels[0].channelName).toBe(
          "orders-topic",
        );
        expect(sends[0].channelClause.channels[0].channelVersion).toBe("1.0.0");
        expect(sends[0].channelClause.channels[1].channelName).toBe(
          "backup-topic",
        );
        expect(sends[0].channelClause.channels[1].channelVersion).toBe("2.0.0");
      }
    }
  });
});

describe("Actor definition", () => {
  it("should parse a bare actor (no body)", async () => {
    const doc = await parseProgram(`
      actor Customer
    `);
    expect(doc.parseResult.parserErrors).toHaveLength(0);
    const program = doc.parseResult.value;
    expect(program.definitions).toHaveLength(1);
    const def = program.definitions[0];
    expect(isActorDef(def)).toBe(true);
    if (isActorDef(def)) {
      expect(def.name).toBe("Customer");
    }
  });

  it("should parse an actor with body", async () => {
    const doc = await parseProgram(`
      actor Customer {
        name "End User"
        summary "A customer placing orders"
      }
    `);
    expect(doc.parseResult.parserErrors).toHaveLength(0);
    const program = doc.parseResult.value;
    const def = program.definitions[0];
    expect(isActorDef(def)).toBe(true);
    if (isActorDef(def)) {
      expect(def.name).toBe("Customer");
      const body = def.body as any[];
      expect(utils.getName(body)).toBe("End User");
      expect(utils.getSummary(body)).toBe("A customer placing orders");
    }
  });

  it("should resolve actor type in flows", async () => {
    const doc = await parseProgram(`
      actor Customer {
        name "Customer"
      }

      flow OrderFlow {
        version 1.0.0
        Customer "places an order" -> PlaceOrder
      }
    `);
    expect(doc.parseResult.parserErrors).toHaveLength(0);
    const program = doc.parseResult.value;
    expect(program.definitions).toHaveLength(2);
    expect(isActorDef(program.definitions[0])).toBe(true);
    expect(isFlowDef(program.definitions[1])).toBe(true);
  });
});

describe("External system definition", () => {
  it("should parse a bare external-system (no body)", async () => {
    const doc = await parseProgram(`
      external-system WarehouseWMS
    `);
    expect(doc.parseResult.parserErrors).toHaveLength(0);
    const program = doc.parseResult.value;
    expect(program.definitions).toHaveLength(1);
    const def = program.definitions[0];
    expect(isExternalSystemDef(def)).toBe(true);
    if (isExternalSystemDef(def)) {
      expect(def.name).toBe("WarehouseWMS");
    }
  });

  it("should parse an external-system with body", async () => {
    const doc = await parseProgram(`
      external-system WarehouseWMS {
        name "Warehouse WMS"
        summary "Legacy warehouse management system"
      }
    `);
    expect(doc.parseResult.parserErrors).toHaveLength(0);
    const program = doc.parseResult.value;
    const def = program.definitions[0];
    expect(isExternalSystemDef(def)).toBe(true);
    if (isExternalSystemDef(def)) {
      expect(def.name).toBe("WarehouseWMS");
      const body = def.body as any[];
      expect(utils.getName(body)).toBe("Warehouse WMS");
      expect(utils.getSummary(body)).toBe("Legacy warehouse management system");
    }
  });

  it("should resolve external-system type in flows", async () => {
    const doc = await parseProgram(`
      external-system WarehouseWMS {
        name "Warehouse WMS"
      }

      flow ShippingFlow {
        version 1.0.0
        when OrderShipped
          WarehouseWMS "syncs inventory"
      }
    `);
    expect(doc.parseResult.parserErrors).toHaveLength(0);
    const program = doc.parseResult.value;
    expect(program.definitions).toHaveLength(2);
    expect(isExternalSystemDef(program.definitions[0])).toBe(true);
    expect(isFlowDef(program.definitions[1])).toBe(true);
  });
});
