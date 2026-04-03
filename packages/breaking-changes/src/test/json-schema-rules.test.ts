import { describe, it, expect } from "vitest";
import { detectBreakingChanges } from "../json-schema/rules";
import type { CompatibilityStrategy } from "../types";

describe("detectBreakingChanges", () => {
  const beforeSchema = {
    type: "object",
    properties: {
      name: { type: "string" },
      email: { type: "string" },
    },
    required: ["name", "email"],
  };

  describe("NONE strategy", () => {
    it("never returns breaking changes regardless of schema diff", () => {
      const after = { type: "object" };
      const result = detectBreakingChanges(beforeSchema, after, "NONE");
      expect(result).toEqual([]);
    });
  });

  describe("BACKWARD strategy", () => {
    it("adding an optional field is NOT breaking", () => {
      const after = {
        ...beforeSchema,
        properties: { ...beforeSchema.properties, phone: { type: "string" } },
      };
      const result = detectBreakingChanges(beforeSchema, after, "BACKWARD");
      expect(result).toEqual([]);
    });

    it("adding a required field IS breaking", () => {
      const after = {
        type: "object",
        properties: { ...beforeSchema.properties, phone: { type: "string" } },
        required: ["name", "email", "phone"],
      };
      const result = detectBreakingChanges(beforeSchema, after, "BACKWARD");
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("FIELD_ADDED_REQUIRED");
      expect(result[0].breaking).toBe(true);
    });

    it("removing a required field IS breaking", () => {
      const after = {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      };
      const result = detectBreakingChanges(beforeSchema, after, "BACKWARD");
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("FIELD_REMOVED_REQUIRED");
    });

    it("removing an optional field is NOT breaking", () => {
      const before = {
        type: "object",
        properties: { name: { type: "string" }, nickname: { type: "string" } },
        required: ["name"],
      };
      const after = {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      };
      const result = detectBreakingChanges(before, after, "BACKWARD");
      expect(result).toEqual([]);
    });

    it("changing a field type IS breaking", () => {
      const after = {
        type: "object",
        properties: { name: { type: "number" }, email: { type: "string" } },
        required: ["name", "email"],
      };
      const result = detectBreakingChanges(beforeSchema, after, "BACKWARD");
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("TYPE_CHANGED");
    });

    it("making an optional field required IS breaking", () => {
      const before = {
        type: "object",
        properties: { name: { type: "string" }, email: { type: "string" } },
        required: ["name"],
      };
      const after = {
        type: "object",
        properties: { name: { type: "string" }, email: { type: "string" } },
        required: ["name", "email"],
      };
      const result = detectBreakingChanges(before, after, "BACKWARD");
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("REQUIRED_ADDED");
    });

    it("making a required field optional is NOT breaking", () => {
      const after = {
        type: "object",
        properties: { name: { type: "string" }, email: { type: "string" } },
        required: ["name"],
      };
      const result = detectBreakingChanges(beforeSchema, after, "BACKWARD");
      expect(result).toEqual([]);
    });
  });

  describe("FORWARD strategy", () => {
    it("adding a required field IS breaking", () => {
      const after = {
        type: "object",
        properties: { ...beforeSchema.properties, phone: { type: "string" } },
        required: ["name", "email", "phone"],
      };
      const result = detectBreakingChanges(beforeSchema, after, "FORWARD");
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("FIELD_ADDED_REQUIRED");
    });

    it("removing a required field IS breaking", () => {
      const after = {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      };
      const result = detectBreakingChanges(beforeSchema, after, "FORWARD");
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("FIELD_REMOVED_REQUIRED");
    });

    it("changing a field type IS breaking", () => {
      const after = {
        type: "object",
        properties: { name: { type: "number" }, email: { type: "string" } },
        required: ["name", "email"],
      };
      const result = detectBreakingChanges(beforeSchema, after, "FORWARD");
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("TYPE_CHANGED");
    });

    it("adding an optional field is NOT breaking", () => {
      const after = {
        ...beforeSchema,
        properties: { ...beforeSchema.properties, phone: { type: "string" } },
      };
      const result = detectBreakingChanges(beforeSchema, after, "FORWARD");
      expect(result).toEqual([]);
    });

    it("removing an optional field is NOT breaking", () => {
      const before = {
        type: "object",
        properties: { name: { type: "string" }, nickname: { type: "string" } },
        required: ["name"],
      };
      const after = {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      };
      const result = detectBreakingChanges(before, after, "FORWARD");
      expect(result).toEqual([]);
    });

    it("making an optional field required IS breaking", () => {
      const before = {
        type: "object",
        properties: { name: { type: "string" }, email: { type: "string" } },
        required: ["name"],
      };
      const after = {
        type: "object",
        properties: { name: { type: "string" }, email: { type: "string" } },
        required: ["name", "email"],
      };
      const result = detectBreakingChanges(before, after, "FORWARD");
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("REQUIRED_ADDED");
    });

    it("making a required field optional is NOT breaking", () => {
      const after = {
        type: "object",
        properties: { name: { type: "string" }, email: { type: "string" } },
        required: ["name"],
      };
      const result = detectBreakingChanges(beforeSchema, after, "FORWARD");
      expect(result).toEqual([]);
    });
  });

  describe("FULL strategy", () => {
    it("adding a required field IS breaking", () => {
      const after = {
        type: "object",
        properties: { ...beforeSchema.properties, phone: { type: "string" } },
        required: ["name", "email", "phone"],
      };
      const result = detectBreakingChanges(beforeSchema, after, "FULL");
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("FIELD_ADDED_REQUIRED");
    });

    it("removing a required field IS breaking", () => {
      const after = {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      };
      const result = detectBreakingChanges(beforeSchema, after, "FULL");
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("FIELD_REMOVED_REQUIRED");
    });

    it("changing a field type IS breaking", () => {
      const after = {
        type: "object",
        properties: { name: { type: "number" }, email: { type: "string" } },
        required: ["name", "email"],
      };
      const result = detectBreakingChanges(beforeSchema, after, "FULL");
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("TYPE_CHANGED");
    });

    it("adding an optional field is NOT breaking", () => {
      const after = {
        ...beforeSchema,
        properties: { ...beforeSchema.properties, phone: { type: "string" } },
      };
      const result = detectBreakingChanges(beforeSchema, after, "FULL");
      expect(result).toEqual([]);
    });

    it("removing an optional field is NOT breaking", () => {
      const before = {
        type: "object",
        properties: { name: { type: "string" }, nickname: { type: "string" } },
        required: ["name"],
      };
      const after = {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      };
      const result = detectBreakingChanges(before, after, "FULL");
      expect(result).toEqual([]);
    });

    it("making an optional field required IS breaking", () => {
      const before = {
        type: "object",
        properties: { name: { type: "string" }, email: { type: "string" } },
        required: ["name"],
      };
      const after = {
        type: "object",
        properties: { name: { type: "string" }, email: { type: "string" } },
        required: ["name", "email"],
      };
      const result = detectBreakingChanges(before, after, "FULL");
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("REQUIRED_ADDED");
    });
  });

  describe("multiple breaking changes", () => {
    it("returns all breaking changes in a single diff", () => {
      const after = {
        type: "object",
        properties: { name: { type: "number" }, phone: { type: "string" } },
        required: ["name", "phone"],
      };
      const result = detectBreakingChanges(beforeSchema, after, "BACKWARD");
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.every((c) => c.breaking === true)).toBe(true);
    });
  });

  describe("nested schemas", () => {
    it("detects breaking changes in nested fields", () => {
      const before = {
        type: "object",
        properties: {
          address: {
            type: "object",
            properties: {
              street: { type: "string" },
              city: { type: "string" },
            },
            required: ["street", "city"],
          },
        },
      };
      const after = {
        type: "object",
        properties: {
          address: {
            type: "object",
            properties: { street: { type: "number" } },
            required: ["street"],
          },
        },
      };
      const result = detectBreakingChanges(before, after, "BACKWARD");
      expect(result).toContainEqual(
        expect.objectContaining({
          type: "TYPE_CHANGED",
          field: "address.street",
          breaking: true,
        }),
      );
      expect(result).toContainEqual(
        expect.objectContaining({
          type: "FIELD_REMOVED_REQUIRED",
          field: "address.city",
          breaking: true,
        }),
      );
    });
  });
});
