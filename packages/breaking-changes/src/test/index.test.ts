import { describe, it, expect } from "vitest";
import { detectBreakingChanges, diffJsonSchemas } from "../index";

describe("public API", () => {
  it("detectBreakingChanges returns breaking changes for a real schema evolution", () => {
    const v1 = {
      type: "object",
      properties: {
        orderId: { type: "string" },
        amount: { type: "string" },
        currency: { type: "string" },
      },
      required: ["orderId", "amount"],
    };

    const v2 = {
      type: "object",
      properties: {
        orderId: { type: "string" },
        amount: { type: "number" },
        currency: { type: "string" },
        region: { type: "string" },
      },
      required: ["orderId", "amount", "region"],
    };

    const result = detectBreakingChanges(v1, v2, "BACKWARD");

    expect(result).toContainEqual(
      expect.objectContaining({
        type: "TYPE_CHANGED",
        field: "amount",
        breaking: true,
      }),
    );
    expect(result).toContainEqual(
      expect.objectContaining({
        type: "FIELD_ADDED_REQUIRED",
        field: "region",
        breaking: true,
      }),
    );
    expect(result).toHaveLength(2);
  });

  it("diffJsonSchemas is exported and returns all changes", () => {
    const before = {
      type: "object",
      properties: { name: { type: "string" } },
    };
    const after = {
      type: "object",
      properties: { name: { type: "number" } },
    };

    const changes = diffJsonSchemas(before, after);
    expect(changes).toHaveLength(1);
    expect(changes[0].type).toBe("TYPE_CHANGED");
  });

  it("NONE strategy always returns empty", () => {
    const result = detectBreakingChanges(
      {
        type: "object",
        properties: { a: { type: "string" } },
        required: ["a"],
      },
      { type: "object" },
      "NONE",
    );
    expect(result).toEqual([]);
  });
});
