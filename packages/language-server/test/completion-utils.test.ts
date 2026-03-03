import { describe, it, expect } from "vitest";
import {
  findEnclosingResource,
  extractResourceNamesFromText,
} from "../src/completion-utils.js";

describe("findEnclosingResource", () => {
  it("returns null at top level", () => {
    const text = ``;
    expect(findEnclosingResource(text)).toBe(null);
  });

  it("returns 'visualizer' inside a visualizer block", () => {
    const text = `visualizer main {
  name "Test"
  `;
    expect(findEnclosingResource(text)).toBe("visualizer");
  });

  it("returns 'service' inside a top-level service block", () => {
    const text = `visualizer main {
  name "Test"
  service Foo {
    version 1.0.0
    `;
    expect(findEnclosingResource(text)).toBe("service");
  });

  it("returns 'domain' inside a domain block", () => {
    const text = `visualizer main {
  name "Test"
  domain MyDomain {
    version 1.0.0
    `;
    expect(findEnclosingResource(text)).toBe("domain");
  });

  it("returns 'service' inside a service nested in a domain", () => {
    const text = `visualizer main {
  name "Test"
  domain HelloWorld {
    version 1.0.0
    summary "Bounded context responsible for HelloWorld"
    service MyService {
      version 1.0.0
      `;
    expect(findEnclosingResource(text)).toBe("service");
  });

  it("returns 'event' inside an event nested in a domain", () => {
    const text = `visualizer main {
  name "Test"
  domain HelloWorld {
    version 1.0.0
    event OrderCreated {
      version 1.0.0
      `;
    expect(findEnclosingResource(text)).toBe("event");
  });

  it("returns 'service' inside a service nested in a domain inside a visualizer", () => {
    const text = `visualizer main {
  name "View Name"
  service Name {
    version 1.0.0
    summary "Service that manages and processes Name operations"
  }
  domain HelloWorld {
    version 1.0.0
    summary "Bounded context responsible for HelloWorld"
    service MyService {
      version 1.0.0
      `;
    expect(findEnclosingResource(text)).toBe("service");
  });

  it("handles sends/receives blocks correctly", () => {
    const text = `visualizer main {
  name "Test"
  service Foo {
    version 1.0.0
    sends { event Bar }
    `;
    expect(findEnclosingResource(text)).toBe("service");
  });

  it("returns 'domain' after closing a nested service", () => {
    const text = `visualizer main {
  name "Test"
  domain HelloWorld {
    version 1.0.0
    service MyService {
      version 1.0.0
    }
    `;
    expect(findEnclosingResource(text)).toBe("domain");
  });
});

describe("extractResourceNamesFromText", () => {
  it("extracts service names", () => {
    const text = `service OrderService { version 1.0.0 }`;
    expect(extractResourceNamesFromText(text)).toEqual(
      new Set(["OrderService"]),
    );
  });

  it("extracts multiple resource types", () => {
    const text = `
      service OrderService { version 1.0.0 }
      event OrderCreated { version 1.0.0 }
      actor User { name "User" }
    `;
    const names = extractResourceNamesFromText(text);
    expect(names).toContain("OrderService");
    expect(names).toContain("OrderCreated");
    expect(names).toContain("User");
  });

  it("only extracts from the given text, not other files", () => {
    const actorsFile = `
      actor Admin { name "Admin" }
      actor User { name "User" }
    `;
    const servicesFile = `
      service OrderService { version 1.0.0 }
      service PaymentService { version 1.0.0 }
    `;
    const actorNames = extractResourceNamesFromText(actorsFile);
    expect(actorNames).toContain("Admin");
    expect(actorNames).toContain("User");
    expect(actorNames).not.toContain("OrderService");
    expect(actorNames).not.toContain("PaymentService");

    const serviceNames = extractResourceNamesFromText(servicesFile);
    expect(serviceNames).toContain("OrderService");
    expect(serviceNames).toContain("PaymentService");
    expect(serviceNames).not.toContain("Admin");
    expect(serviceNames).not.toContain("User");
  });

  it("extracts external-system and data-product names", () => {
    const text = `
      external-system Stripe { name "Stripe" }
      data-product Analytics { version 1.0.0 }
    `;
    const names = extractResourceNamesFromText(text);
    expect(names).toContain("Stripe");
    expect(names).toContain("Analytics");
  });
});
