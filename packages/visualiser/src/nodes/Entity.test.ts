import { describe, expect, it } from "vitest";
import { getNestedEntityProperties, getPropertyTypeLabel } from "./Entity";

describe("getPropertyTypeLabel", () => {
  it("shows the item type for array properties", () => {
    expect(
      getPropertyTypeLabel({
        type: "array",
        items: {
          type: "Address",
        },
      }),
    ).toBe("Address[]");
  });

  it("falls back to the property type for scalar properties", () => {
    expect(getPropertyTypeLabel({ type: "string" })).toBe("string");
  });

  it("returns properties nested directly in an object", () => {
    expect(
      getNestedEntityProperties({
        name: "address",
        type: "object",
        properties: [{ name: "city", type: "string" }],
      }),
    ).toEqual([{ name: "city", type: "string" }]);
  });

  it("returns properties nested in array items", () => {
    expect(
      getNestedEntityProperties({
        name: "lines",
        type: "array",
        items: {
          type: "object",
          properties: [{ name: "quantity", type: "number" }],
        },
      }),
    ).toEqual([{ name: "quantity", type: "number" }]);
  });
});
