import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import {
  convertToMermaid,
  getMermaidNodeShape,
  getNodeLabel,
  sanitizeMermaidId,
} from "./export-mermaid";
import { SWIMLANE_NODE_TYPE } from "./swimlanes";

const node = (
  id: string,
  type: string,
  data: Record<string, unknown>,
  extra: Partial<Node> = {},
): Node => ({ id, type, position: { x: 0, y: 0 }, data, ...extra });

const service = (id: string, name: string, extra: Partial<Node> = {}) =>
  node(id, "services", { service: { id, name, version: "1.0.0" } }, extra);

describe("sanitizeMermaidId", () => {
  it("replaces anything that isn't alphanumeric or an underscore", () => {
    expect(sanitizeMermaidId("my.service-v1.2.3")).toBe("my_service_v1_2_3");
    expect(sanitizeMermaidId("order_service_v1")).toBe("order_service_v1");
  });

  it("prefixes ids Mermaid reads as keywords, which would break the diagram", () => {
    expect(sanitizeMermaidId("end")).toBe("node_end");
    expect(sanitizeMermaidId("Style")).toBe("node_Style");
    expect(sanitizeMermaidId("end-1.0.0")).toBe("end_1_0_0");
  });
});

describe("getMermaidNodeShape", () => {
  it("gives each kind of resource its shape, and a rectangle otherwise", () => {
    expect(getMermaidNodeShape("services")).toEqual(["[[", "]]"]);
    expect(getMermaidNodeShape("events")).toEqual([">", "]"]);
    expect(getMermaidNodeShape("queries")).toEqual(["{{", "}}"]);
    expect(getMermaidNodeShape("channels")).toEqual(["[/", "/]"]);
    expect(getMermaidNodeShape("context-actor")).toEqual(["((", "))"]);
    expect(getMermaidNodeShape("unknown")).toEqual(["[", "]"]);
  });
});

describe("getNodeLabel", () => {
  it("labels resources by name and version", () => {
    expect(getNodeLabel(service("svc", "Order Service"))).toBe(
      "Order Service (1.0.0)",
    );
    expect(
      getNodeLabel(
        node("evt", "events", {
          message: {
            id: "order-created",
            name: "OrderCreated",
            version: "2.0.0",
          },
        }),
      ),
    ).toBe("OrderCreated (2.0.0)");
  });

  it("reads domains nested in their collection entry", () => {
    expect(
      getNodeLabel(
        node("d", "domains", {
          domain: { data: { id: "orders", name: "Orders", version: "1.0.0" } },
        }),
      ),
    ).toBe("Orders (1.0.0)");
  });

  it("labels systems, domains and their boundaries by name", () => {
    expect(
      getNodeLabel(
        node("g", "system-group", {
          system: { name: "Checkout System", version: "1.0.0" },
        }),
      ),
    ).toBe("Checkout System (1.0.0)");
    expect(
      getNodeLabel(
        node("g", "domain-group", {
          domain: { name: "Ordering", version: "1.0.0" },
        }),
      ),
    ).toBe("Ordering (1.0.0)");
    expect(
      getNodeLabel(
        node("c", "context-domain", {
          domain: { id: "payments", name: "Payments", version: "1.0.0" },
        }),
      ),
    ).toBe("Payments (1.0.0)");
  });

  it("labels data stores, flow steps, actors and lanes", () => {
    expect(
      getNodeLabel(node("db", "data", { data: { name: "Orders DB" } })),
    ).toBe("Orders DB");
    expect(
      getNodeLabel(
        node("s", "custom", { custom: { title: "Order Confirmed" } }),
      ),
    ).toBe("Order Confirmed");
    expect(getNodeLabel(node("a", "context-actor", { name: "Customer" }))).toBe(
      "Customer",
    );
    expect(
      getNodeLabel(node("l", SWIMLANE_NODE_TYPE, { label: "Ordering" })),
    ).toBe("Ordering");
  });

  it("falls back to the node id", () => {
    expect(getNodeLabel(node("fallback-id", "services", {}))).toBe(
      "fallback-id",
    );
  });
});

describe("convertToMermaid", () => {
  it("writes nodes and labelled edges as a flowchart", () => {
    const result = convertToMermaid(
      [
        service("order-service-1.0.0", "Order Service"),
        node("order-created-1.0.0", "events", {
          message: { name: "OrderCreated", version: "1.0.0" },
        }),
      ],
      [
        {
          id: "e",
          source: "order-service-1.0.0",
          target: "order-created-1.0.0",
          label: "publishes",
        },
      ],
    );

    expect(result).toContain("flowchart LR");
    expect(result).toContain('order_service_1_0_0[["Order Service (1.0.0)"]]');
    expect(result).toContain('order_created_1_0_0>"OrderCreated (1.0.0)"]');
    expect(result).toContain(
      'order_service_1_0_0 -->|"publishes"| order_created_1_0_0',
    );
  });

  it("styles nodes by type only when asked", () => {
    const nodes = [service("svc", "Service")];

    expect(convertToMermaid(nodes, [])).toContain("classDef services");
    expect(convertToMermaid(nodes, [])).toContain(":::services");
    const unstyled = convertToMermaid(nodes, [], { includeStyles: false });
    expect(unstyled).not.toContain("classDef");
    expect(unstyled).not.toContain(":::");
  });

  it("supports other directions", () => {
    expect(convertToMermaid([], [], { direction: "TB" })).toContain(
      "flowchart TB",
    );
  });

  it("escapes quotes and #, which Mermaid reads as entity codes", () => {
    const result = convertToMermaid([service("svc", 'C# "Billing"')], []);

    expect(result).toContain("C#35; #quot;Billing#quot; (1.0.0)");
  });

  it("puts multiline edge labels on one line without the gaps around the line breaks", () => {
    const result = convertToMermaid(
      [service("a", "A"), node("db", "data", { data: { name: "DB" } })],
      [
        {
          id: "e",
          source: "a",
          target: "db",
          label: "read and writes to \n (postgres@16)",
        },
      ],
    );

    expect(result).toContain('a -->|"read and writes to (postgres@16)"| db');
  });

  it("leaves out hidden nodes and edges, and edges to nodes that aren't shown", () => {
    const result = convertToMermaid(
      [
        service("a", "A"),
        service("b", "B"),
        service("hidden", "Hidden", { hidden: true }),
      ],
      [
        { id: "1", source: "a", target: "b", hidden: true },
        { id: "2", source: "a", target: "hidden" },
        { id: "3", source: "a", target: "missing" },
      ],
      { includeStyles: false },
    );

    expect(result).not.toContain("hidden");
    expect(result).not.toContain("missing");
    expect(result).not.toContain("-->");
  });

  it("keeps ids that sanitize the same way apart", () => {
    const result = convertToMermaid(
      [service("order.service", "Dotted"), service("order-service", "Dashed")],
      [{ id: "e", source: "order.service", target: "order-service" }],
      { includeStyles: false },
    );

    expect(result).toContain('order_service[["Dotted (1.0.0)"]]');
    expect(result).toContain('order_service_2[["Dashed (1.0.0)"]]');
    expect(result).toContain("order_service --> order_service_2");
  });

  it("marks the resource the diagram is about", () => {
    const result = convertToMermaid(
      [
        service("svc", "Service", {
          data: { isFocused: true, service: { name: "Service" } },
        }),
      ],
      [],
    );

    expect(result).toContain("classDef focused");
    expect(result).toContain("class svc focused");
  });
});

describe("domain and system diagrams", () => {
  // Level 2 of a domain: the domain viewed, its system, another domain's
  // subdomain (inside that domain) and an actor
  const nodes = [
    node("domain-group-ordering-1.0.0", "domain-group", {
      domain: { name: "Ordering", version: "1.0.0" },
      isFocused: true,
    }),
    node(
      "system-group-checkout-system-1.0.0",
      "system-group",
      { system: { name: "Checkout System", version: "1.0.0" } },
      { parentId: "domain-group-ordering-1.0.0" },
    ),
    service("checkout-api-1.0.0", "Checkout API", {
      parentId: "system-group-checkout-system-1.0.0",
    }),
    node("domain-group-customer-1.0.0", "domain-group", {
      domain: { name: "Customer", version: "1.0.0" },
      otherDomain: true,
    }),
    node(
      "domain-loyalty-1.0.0",
      "context-domain",
      { domain: { name: "Loyalty", version: "1.0.0" }, subdomain: true },
      { parentId: "domain-group-customer-1.0.0" },
    ),
    node("fulfilment-system-1.0.0", "systems", {
      system: { name: "Fulfilment System", version: "1.0.0" },
    }),
    node("actor-customer", "context-actor", { name: "Customer" }),
  ];
  const edges: Edge[] = [
    {
      id: "e1",
      source: "actor-customer",
      target: "system-group-checkout-system-1.0.0",
      label: "checks out",
    },
    {
      id: "e2",
      source: "checkout-api-1.0.0",
      target: "domain-loyalty-1.0.0",
      label: "publishes\nOrder Placed",
      data: { crossDomain: true },
    },
  ];

  it("nests systems in their domain, and other domains' subdomains in those domains", () => {
    const result = convertToMermaid(nodes, edges, { includeStyles: false });

    expect(result).toContain(
      [
        '    subgraph domain_group_ordering_1_0_0["Ordering (1.0.0)"]',
        '        subgraph system_group_checkout_system_1_0_0["Checkout System (1.0.0)"]',
        '            checkout_api_1_0_0[["Checkout API (1.0.0)"]]',
        "        end",
        "    end",
      ].join("\n"),
    );
    expect(result).toContain(
      [
        '    subgraph domain_group_customer_1_0_0["Customer (1.0.0)"]',
        '        domain_loyalty_1_0_0["Loyalty (1.0.0)"]',
        "    end",
      ].join("\n"),
    );
    expect(result).toContain(
      'fulfilment_system_1_0_0[["Fulfilment System (1.0.0)"]]',
    );
    expect(result).toContain('actor_customer(("Customer"))');
  });

  it("lets edges connect to a boundary, e.g. an actor using a system", () => {
    const result = convertToMermaid(nodes, edges, { includeStyles: false });

    expect(result).toContain(
      'actor_customer -->|"checks out"| system_group_checkout_system_1_0_0',
    );
  });

  it("styles the domain viewed, other domains and systems apart", () => {
    const result = convertToMermaid(nodes, edges);

    expect(result).toContain("class domain_group_ordering_1_0_0 domainGroup");
    expect(result).toContain(
      "class domain_group_customer_1_0_0 otherDomainGroup",
    );
    expect(result).toContain(
      "class system_group_checkout_system_1_0_0 systemGroup",
    );
    expect(result).toMatch(/classDef domainGroup .*stroke-dasharray/);
    // A boundary isn't a node, so it's styled as a boundary rather than as focused
    expect(result).not.toContain("focused");
  });

  it("highlights edges to and from other domains", () => {
    const result = convertToMermaid(nodes, edges);

    expect(result).toContain(
      'checkout_api_1_0_0 -->|"publishes Order Placed"| domain_loyalty_1_0_0',
    );
    expect(result).toContain("linkStyle 1 stroke:#4f46e5,stroke-width:3px");
  });

  it("renders an empty system as an empty boundary", () => {
    const result = convertToMermaid(
      [
        node("system-group-returns-1.0.0", "system-group", {
          system: { name: "Returns", version: "1.0.0" },
        }),
      ],
      [],
      { includeStyles: false },
    );

    expect(result).toContain(
      '    subgraph system_group_returns_1_0_0["Returns (1.0.0)"]\n    end',
    );
  });

  it("renders a node whose parent isn't in the graph at the top level", () => {
    const result = convertToMermaid(
      [service("orphan", "Orphan", { parentId: "missing-group" })],
      [],
      { includeStyles: false },
    );

    expect(result).toContain('    orphan[["Orphan (1.0.0)"]]');
  });
});

describe("flows", () => {
  it("groups a flow's steps in the lanes they're grouped into", () => {
    const nodes: Node[] = [
      node("swimlane__domain-ordering", SWIMLANE_NODE_TYPE, {
        label: "Ordering",
      }),
      node(
        "swimlane__domain-ordering__system-checkout",
        SWIMLANE_NODE_TYPE,
        { label: "Checkout" },
        { parentId: "swimlane__domain-ordering" },
      ),
      node(
        "step-checkout",
        "step",
        { step: { id: "checkout", title: "Checkout" } },
        { parentId: "swimlane__domain-ordering__system-checkout" },
      ),
    ];

    const result = convertToMermaid(nodes, []);

    expect(result).toContain(
      [
        '    subgraph swimlane__domain_ordering["Ordering"]',
        '        subgraph swimlane__domain_ordering__system_checkout["Checkout"]',
        '            step_checkout["Checkout"]:::step',
        "        end",
        "    end",
      ].join("\n"),
    );
    expect(result).toContain(
      "class swimlane__domain_ordering,swimlane__domain_ordering__system_checkout laneGroup",
    );
  });
});

describe("entity maps", () => {
  const entity = (
    id: string,
    data: Record<string, unknown>,
    extra: Record<string, unknown> = {},
  ) =>
    node(`${id}-1.0.0`, "entities", {
      label: data.name,
      entity: { data: { id, version: "1.0.0", ...data } },
      ...extra,
    });

  const nodes = [
    entity(
      "order",
      {
        name: "Order",
        identifier: "orderId",
        aggregateRoot: true,
        properties: [
          { name: "orderId", type: "UUID", required: true },
          {
            name: "customer",
            type: "Customer",
            required: true,
            references: "customer-profile",
            relationType: "belongsTo",
          },
          {
            name: "lines",
            type: "array",
            items: { type: "OrderLine" },
            references: "order-line",
            relationType: "hasMany",
          },
          {
            name: "reservation",
            type: "Reservation",
            references: "reservation",
            relationType: "reserves",
          },
          { name: "3dsResult", type: "string" },
        ],
      },
      { referencePropertyNames: ["customer", "lines", "reservation"] },
    ),
    entity(
      "customer-profile",
      {
        name: "Customer Profile",
        identifier: "customerId",
        properties: [{ name: "customerId", type: "UUID" }],
      },
      { externalToDomain: true, domainName: "Customer" },
    ),
    entity("order-line", { name: "Order Line" }),
    entity("reservation", { name: "Reservation" }),
  ];
  const edge = (property: string, target: string): Edge => ({
    id: `order-${property}`,
    source: "order-1.0.0",
    sourceHandle: `${property}-source`,
    target: `${target}-1.0.0`,
    targetHandle: "__eventcatalog-entity-target",
    label: "references",
  });
  const edges = [
    edge("customer", "customer-profile"),
    edge("lines", "order-line"),
    edge("reservation", "reservation"),
  ];

  it("exports an entity map as an entity relationship diagram", () => {
    const result = convertToMermaid(nodes, edges);

    expect(result.startsWith("erDiagram")).toBe(true);
    expect(result).not.toContain("flowchart");
  });

  it("lists each entity's properties, with its identifier as PK and references as FK", () => {
    const result = convertToMermaid(nodes, edges, { includeStyles: false });

    expect(result).toContain(
      [
        '    order_1_0_0["Order"] {',
        "        UUID orderId PK",
        "        Customer customer FK",
        "        OrderLine[] lines FK",
        "        Reservation reservation FK",
        // Mermaid names start with a letter
        "        string p_3dsResult",
        "    }",
      ].join("\n"),
    );
    // An entity without properties is still listed
    expect(result).toContain('    order_line_1_0_0["Order Line"]');
  });

  it("gives each relationship its cardinality, labelled with the property or the relation's verb", () => {
    const result = convertToMermaid(nodes, edges, { includeStyles: false });

    // Many orders belong to one (required) customer
    expect(result).toContain(
      'order_1_0_0 }o--|| customer_profile_1_0_0 : "customer"',
    );
    // An order has many lines
    expect(result).toContain('order_1_0_0 ||--o{ order_line_1_0_0 : "lines"');
    // Other relations keep their name
    expect(result).toContain(
      'order_1_0_0 }o--o| reservation_1_0_0 : "reserves"',
    );
  });

  it("names the domain of entities from other domains, and styles them and aggregate roots apart", () => {
    const result = convertToMermaid(nodes, edges);

    expect(result).toContain(
      'customer_profile_1_0_0["Customer Profile (Customer)"]',
    );
    expect(result).toContain("class customer_profile_1_0_0 externalEntity");
    expect(result).toContain("class order_1_0_0 aggregateRoot");
    expect(
      convertToMermaid(nodes, edges, { includeStyles: false }),
    ).not.toContain("classDef");
  });
});
