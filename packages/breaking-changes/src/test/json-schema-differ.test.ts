import { describe, it, expect } from "vitest";
import { diffJsonSchemas } from "../json-schema/differ";

describe("diffJsonSchemas", () => {
  describe("field additions", () => {
    it("detects an added optional field", () => {
      const before = {
        type: "object",
        properties: { name: { type: "string" } },
      };
      const after = {
        type: "object",
        properties: { name: { type: "string" }, email: { type: "string" } },
      };
      const changes = diffJsonSchemas(before, after);
      expect(changes).toEqual([
        {
          type: "FIELD_ADDED_OPTIONAL",
          field: "email",
          message: "Optional field 'email' was added",
        },
      ]);
    });

    it("detects an added required field", () => {
      const before = {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      };
      const after = {
        type: "object",
        properties: { name: { type: "string" }, email: { type: "string" } },
        required: ["name", "email"],
      };
      const changes = diffJsonSchemas(before, after);
      expect(changes).toEqual([
        {
          type: "FIELD_ADDED_REQUIRED",
          field: "email",
          message: "Required field 'email' was added",
        },
      ]);
    });
  });

  describe("field removals", () => {
    it("detects a removed optional field", () => {
      const before = {
        type: "object",
        properties: { name: { type: "string" }, email: { type: "string" } },
        required: ["name"],
      };
      const after = {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      };
      const changes = diffJsonSchemas(before, after);
      expect(changes).toEqual([
        {
          type: "FIELD_REMOVED_OPTIONAL",
          field: "email",
          message: "Optional field 'email' was removed",
        },
      ]);
    });

    it("detects a removed required field", () => {
      const before = {
        type: "object",
        properties: { name: { type: "string" }, email: { type: "string" } },
        required: ["name", "email"],
      };
      const after = {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      };
      const changes = diffJsonSchemas(before, after);
      expect(changes).toEqual([
        {
          type: "FIELD_REMOVED_REQUIRED",
          field: "email",
          message: "Required field 'email' was removed",
        },
      ]);
    });
  });

  describe("type changes", () => {
    it("detects a field type change", () => {
      const before = {
        type: "object",
        properties: { amount: { type: "string" } },
      };
      const after = {
        type: "object",
        properties: { amount: { type: "number" } },
      };
      const changes = diffJsonSchemas(before, after);
      expect(changes).toEqual([
        {
          type: "TYPE_CHANGED",
          field: "amount",
          message: "Field 'amount' type changed from 'string' to 'number'",
          previousType: "string",
          currentType: "number",
        },
      ]);
    });
  });

  describe("required changes (without add/remove)", () => {
    it("detects a field becoming required", () => {
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
      const changes = diffJsonSchemas(before, after);
      expect(changes).toEqual([
        {
          type: "REQUIRED_ADDED",
          field: "email",
          message: "Field 'email' was made required",
        },
      ]);
    });

    it("detects a field becoming optional", () => {
      const before = {
        type: "object",
        properties: { name: { type: "string" }, email: { type: "string" } },
        required: ["name", "email"],
      };
      const after = {
        type: "object",
        properties: { name: { type: "string" }, email: { type: "string" } },
        required: ["name"],
      };
      const changes = diffJsonSchemas(before, after);
      expect(changes).toEqual([
        {
          type: "REQUIRED_REMOVED",
          field: "email",
          message: "Field 'email' was made optional",
        },
      ]);
    });
  });

  describe("nested objects", () => {
    it("detects changes in nested properties using dot-path notation", () => {
      const before = {
        type: "object",
        properties: {
          address: {
            type: "object",
            properties: {
              street: { type: "string" },
              zipCode: { type: "string" },
            },
            required: ["street"],
          },
        },
      };
      const after = {
        type: "object",
        properties: {
          address: {
            type: "object",
            properties: { street: { type: "string" } },
            required: ["street"],
          },
        },
      };
      const changes = diffJsonSchemas(before, after);
      expect(changes).toEqual([
        {
          type: "FIELD_REMOVED_OPTIONAL",
          field: "address.zipCode",
          message: "Optional field 'address.zipCode' was removed",
        },
      ]);
    });

    it("detects type changes in deeply nested fields", () => {
      const before = {
        type: "object",
        properties: {
          order: {
            type: "object",
            properties: {
              item: {
                type: "object",
                properties: { price: { type: "string" } },
              },
            },
          },
        },
      };
      const after = {
        type: "object",
        properties: {
          order: {
            type: "object",
            properties: {
              item: {
                type: "object",
                properties: { price: { type: "number" } },
              },
            },
          },
        },
      };
      const changes = diffJsonSchemas(before, after);
      expect(changes).toEqual([
        {
          type: "TYPE_CHANGED",
          field: "order.item.price",
          message:
            "Field 'order.item.price' type changed from 'string' to 'number'",
          previousType: "string",
          currentType: "number",
        },
      ]);
    });
  });

  describe("no changes", () => {
    it("returns empty array when schemas are identical", () => {
      const schema = {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      };
      expect(diffJsonSchemas(schema, schema)).toEqual([]);
    });
  });

  describe("edge cases", () => {
    it("handles empty schemas", () => {
      expect(diffJsonSchemas({}, {})).toEqual([]);
    });

    it("handles schema with no properties going to one with properties", () => {
      const before = { type: "object" };
      const after = {
        type: "object",
        properties: { name: { type: "string" } },
      };
      const changes = diffJsonSchemas(before, after);
      expect(changes).toEqual([
        {
          type: "FIELD_ADDED_OPTIONAL",
          field: "name",
          message: "Optional field 'name' was added",
        },
      ]);
    });

    it("handles schema with properties going to one with no properties", () => {
      const before = {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      };
      const after = { type: "object" };
      const changes = diffJsonSchemas(before, after);
      expect(changes).toEqual([
        {
          type: "FIELD_REMOVED_REQUIRED",
          field: "name",
          message: "Required field 'name' was removed",
        },
      ]);
    });

    it("handles multiple simultaneous changes", () => {
      const before = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "string" },
          email: { type: "string" },
        },
        required: ["name", "email"],
      };
      const after = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
          phone: { type: "string" },
        },
        required: ["name"],
      };
      const changes = diffJsonSchemas(before, after);
      expect(changes).toContainEqual({
        type: "TYPE_CHANGED",
        field: "age",
        message: "Field 'age' type changed from 'string' to 'number'",
        previousType: "string",
        currentType: "number",
      });
      expect(changes).toContainEqual({
        type: "FIELD_REMOVED_REQUIRED",
        field: "email",
        message: "Required field 'email' was removed",
      });
      expect(changes).toContainEqual({
        type: "FIELD_ADDED_OPTIONAL",
        field: "phone",
        message: "Optional field 'phone' was added",
      });
      expect(changes).toHaveLength(3);
    });
  });
});
