import { describe, it, expect } from "vitest";
import { createEcServices } from "../src/ec-module.js";
import { EmptyFileSystem } from "langium";
import { parseDocument } from "langium/test";
import type { Program } from "../src/generated/ast.js";

const services = createEcServices(EmptyFileSystem);

async function getValidationErrors(input: string): Promise<string[]> {
  const doc = await parseDocument<Program>(services.Ec, input, {
    validation: true,
  });
  const allDiags = doc.diagnostics ?? [];
  return allDiags
    .filter((d) => d.severity === 1) // 1 = Error in LSP
    .map((d) => d.message);
}

// ---------------------------------------------------------------------------
// Duplicate definitions — name + version uniqueness
// ---------------------------------------------------------------------------
describe("Duplicate definition validation", () => {
  it("allows same name with different versions", async () => {
    const errors = await getValidationErrors(`
      event OrderCreated {
        version 1.0.0
        summary "v1"
      }
      event OrderCreated {
        version 2.0.0
        summary "v2"
      }
    `);
    const dupes = errors.filter((e) => e.includes("Duplicate"));
    expect(dupes).toHaveLength(0);
  });

  it("rejects same name with same version", async () => {
    const errors = await getValidationErrors(`
      event OrderCreated {
        version 1.0.0
      }
      event OrderCreated {
        version 1.0.0
      }
    `);
    const dupes = errors.filter((e) => e.includes("Duplicate"));
    expect(dupes).toHaveLength(1);
    expect(dupes[0]).toContain("OrderCreated");
    expect(dupes[0]).toContain("1.0.0");
  });

  it("rejects same name+version across different resource types", async () => {
    const errors = await getValidationErrors(`
      event MyResource {
        version 1.0.0
      }
      query MyResource {
        version 1.0.0
      }
    `);
    const dupes = errors.filter((e) => e.includes("Duplicate"));
    expect(dupes).toHaveLength(1);
    expect(dupes[0]).toContain("MyResource");
  });

  it("rejects duplicate inline message definitions", async () => {
    const errors = await getValidationErrors(`
      service A {
        version 1.0.0
        sends event Foo {
          version 1.0.0
        }
      }
      service B {
        version 2.0.0
        sends event Foo {
          version 1.0.0
        }
      }
    `);
    const dupes = errors.filter((e) => e.includes("Duplicate"));
    expect(dupes).toHaveLength(1);
    expect(dupes[0]).toContain("Foo");
  });

  it("allows different services with different versions", async () => {
    const errors = await getValidationErrors(`
      service OrderService {
        version 1.0.0
      }
      service OrderService {
        version 2.0.0
      }
    `);
    const dupes = errors.filter((e) => e.includes("Duplicate"));
    expect(dupes).toHaveLength(0);
  });

  it("rejects duplicate service inside domain with same version as top-level", async () => {
    const errors = await getValidationErrors(`
      service MyService {
        version 1.0.0
      }
      domain MyDomain {
        version 1.0.0
        service MyService {
          version 1.0.0
        }
      }
    `);
    const dupes = errors.filter((e) => e.includes("Duplicate"));
    expect(dupes).toHaveLength(1);
    expect(dupes[0]).toContain("MyService");
  });
});

// ---------------------------------------------------------------------------
// Visualizer validation
// ---------------------------------------------------------------------------
describe("Visualizer validation", () => {
  it("visualizer without version does not produce error", async () => {
    const errors = await getValidationErrors(`
      visualizer main {
        service OrderService {
          version 1.0.0
        }
      }
    `);
    const versionErrors = errors.filter((e) => e.includes("version"));
    expect(versionErrors).toHaveLength(0);
  });

  it("inline resource inside visualizer without version produces error", async () => {
    const errors = await getValidationErrors(`
      visualizer main {
        service OrderService {
        }
      }
    `);
    const versionErrors = errors.filter((e) => e.includes("version"));
    expect(versionErrors).toHaveLength(1);
    expect(versionErrors[0]).toContain("OrderService");
  });
});
