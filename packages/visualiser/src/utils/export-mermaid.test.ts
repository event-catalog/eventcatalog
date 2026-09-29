import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import { convertToMermaid } from "./export-mermaid";
import { SWIMLANE_NODE_TYPE } from "./swimlanes";

describe("convertToMermaid", () => {
  it("leaves out the boxes or lanes a flow's steps are grouped into", () => {
    const nodes: Node[] = [
      {
        id: "swimlane__domain-ordering",
        type: SWIMLANE_NODE_TYPE,
        position: { x: 0, y: 0 },
        data: { label: "Ordering" },
      },
      {
        id: "step-checkout",
        type: "step",
        parentId: "swimlane__domain-ordering",
        position: { x: 10, y: 10 },
        data: { step: { id: "checkout", title: "Checkout" } },
      },
    ];
    const edges: Edge[] = [];

    const mermaid = convertToMermaid(nodes, edges, { includeStyles: false });

    expect(mermaid).toContain('step_checkout["Checkout"]');
    expect(mermaid).not.toContain("Ordering");
  });
});
