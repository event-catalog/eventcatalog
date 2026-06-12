import { describe, expect, it } from "vitest";
import { getPropertyTypeLabel } from "./Entity";

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
});
