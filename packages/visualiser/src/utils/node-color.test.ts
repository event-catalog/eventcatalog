import { describe, expect, it } from "vitest";
import {
  getNodeCardStyle,
  getNodeColorStyles,
  resolveNodeColor,
} from "./node-color";

describe("resolveNodeColor", () => {
  it("resolves a Tailwind colour name to its palette", () => {
    const color = resolveNodeColor("blue");
    expect(color?.["500"]).toBe("#3b82f6");
    expect(color?.["700"]).toBe("#1d4ed8");
    expect(color?.rgb).toBe("59, 130, 246");
  });

  it("ignores the shade and case of a Tailwind colour", () => {
    expect(resolveNodeColor("Emerald-600")?.["500"]).toBe("#10b981");
  });

  it("resolves a hex colour, using it as the 500", () => {
    const color = resolveNodeColor("#0EA5E9");
    expect(color?.["500"]).toBe("#0ea5e9");
    expect(color?.rgb).toBe("14, 165, 233");
    expect(color?.["200"]).not.toBe(color?.["500"]);
  });

  it("resolves a short hex colour", () => {
    expect(resolveNodeColor("#f00")?.["500"]).toBe("#ff0000");
  });

  it.each([undefined, "", "not-a-colour", "rgb(1, 2, 3)", "#12345"])(
    "returns undefined for %s",
    (value) => {
      expect(resolveNodeColor(value)).toBeUndefined();
    },
  );
});

describe("getNodeCardStyle", () => {
  const styles = getNodeColorStyles(resolveNodeColor("blue")!);

  it("colours the border of a card", () => {
    expect(getNodeCardStyle(styles, {}).borderColor).toBe("#3b82f6");
  });

  it("keeps a deprecated card's red border", () => {
    expect(
      getNodeCardStyle(styles, { deprecated: true }).borderColor,
    ).toBeUndefined();
  });
});
