import { describe, expect, it } from "vitest";
import type { Node } from "@xyflow/react";
import { getNodeDocUrl, NODE_TYPE_LABELS } from "./utils";

const node = (type: string, data: Record<string, unknown>): Node => ({
  id: "step-1",
  type,
  position: { x: 0, y: 0 },
  data,
});

describe("getNodeDocUrl", () => {
  it("links a system to its docs", () => {
    expect(
      getNodeDocUrl(
        node("systems", { system: { id: "checkout", version: "1.0.0" } }),
      ),
    ).toBe("/docs/systems/checkout/1.0.0");
  });

  it("links a channel to its docs", () => {
    expect(
      getNodeDocUrl(
        node("channels", { channel: { id: "orders", version: "2.0.0" } }),
      ),
    ).toBe("/docs/channels/orders/2.0.0");
  });
});

describe("NODE_TYPE_LABELS", () => {
  it("names systems", () => {
    expect(NODE_TYPE_LABELS.systems).toBe("System");
  });
});
