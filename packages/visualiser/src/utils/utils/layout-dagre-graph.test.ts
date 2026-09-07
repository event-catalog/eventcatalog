import { describe, expect, it } from "vitest";
import {
  LARGE_GRAPH_EDGE_THRESHOLD,
  LARGE_GRAPH_NODE_THRESHOLD,
  LARGE_GRAPH_RANKER,
  createDagreGraph,
  layoutDagreGraph,
  selectDagreRanker,
} from "./utils";

describe("layoutDagreGraph", () => {
  it("keeps the default ranker for small graphs", () => {
    expect(selectDagreRanker(10, 12)).toBeUndefined();
  });

  it("selects tight-tree for large graphs", () => {
    expect(selectDagreRanker(LARGE_GRAPH_NODE_THRESHOLD, 1)).toBe(
      LARGE_GRAPH_RANKER,
    );
    expect(selectDagreRanker(1, LARGE_GRAPH_EDGE_THRESHOLD)).toBe(
      LARGE_GRAPH_RANKER,
    );
  });

  it("respects an explicit ranker", () => {
    expect(selectDagreRanker(500, 2000, "network-simplex")).toBe(
      "network-simplex",
    );
  });

  it("applies tight-tree and positions nodes on a large graph", () => {
    const flow = createDagreGraph({ ranksep: 300, nodesep: 50 });
    for (let i = 0; i < LARGE_GRAPH_NODE_THRESHOLD; i++) {
      flow.setNode(`n${i}`, { width: 150, height: 120 });
    }
    for (let i = 0; i < LARGE_GRAPH_EDGE_THRESHOLD; i++) {
      flow.setEdge(
        `n${i % LARGE_GRAPH_NODE_THRESHOLD}`,
        `n${(i + 1) % LARGE_GRAPH_NODE_THRESHOLD}`,
      );
    }

    layoutDagreGraph(flow);

    expect(flow.graph().ranker).toBe(LARGE_GRAPH_RANKER);
    expect(typeof flow.node("n0").x).toBe("number");
    expect(typeof flow.node("n0").y).toBe("number");
  });
});
