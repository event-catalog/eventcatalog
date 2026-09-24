import { describe, expect, it } from "vitest";
import type { Edge } from "@xyflow/react";
import { applyMessageAnimation } from "./message-animation";

describe("applyMessageAnimation", () => {
  it("animates message edges, including ones without a type (e.g. bridged edges)", () => {
    const [edge] = applyMessageAnimation(
      [{ id: "e1", source: "A", target: "B" }],
      true,
    );

    expect(edge).toMatchObject({ type: "animated", animated: true });
  });

  it("keeps edges that can't animate as they are, and can animate edges again", () => {
    const edges: Edge[] = [
      { id: "flow", source: "A", target: "B", type: "flow-edge" },
      { id: "message", source: "A", target: "B" },
    ];
    const stopped = applyMessageAnimation(edges, false);
    const [flow, message] = applyMessageAnimation(stopped, true);

    expect(stopped[1].type).toBe("smoothstep");
    expect(flow).toMatchObject({ type: "flow-edge", animated: false });
    expect(message).toMatchObject({ type: "animated", animated: true });
  });
});
