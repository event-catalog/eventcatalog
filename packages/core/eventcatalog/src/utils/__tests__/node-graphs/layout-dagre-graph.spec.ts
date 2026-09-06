import { describe, expect, it } from 'vitest';
import dagre from 'dagre';
import {
  LARGE_GRAPH_EDGE_THRESHOLD,
  LARGE_GRAPH_NODE_THRESHOLD,
  LARGE_GRAPH_RANKER,
  createDagreGraph,
  layoutDagreGraph,
  selectDagreRanker,
} from '@utils/node-graphs/utils/utils';

const addCompleteGraph = (flow: dagre.graphlib.Graph, nodeCount: number, extraEdges = 0) => {
  for (let i = 0; i < nodeCount; i++) {
    flow.setNode(`n${i}`, { width: 150, height: 120 });
  }
  for (let i = 0; i < nodeCount - 1; i++) {
    flow.setEdge(`n${i}`, `n${i + 1}`);
  }
  for (let i = 0; i < extraEdges; i++) {
    flow.setEdge(`n${i % nodeCount}`, `n${(i + 3) % nodeCount}`);
  }
};

describe('layoutDagreGraph', () => {
  it('keeps the default network-simplex ranker for small graphs', () => {
    expect(selectDagreRanker(10, 12)).toBeUndefined();
    expect(selectDagreRanker(LARGE_GRAPH_NODE_THRESHOLD - 1, LARGE_GRAPH_EDGE_THRESHOLD - 1)).toBeUndefined();
  });

  it('selects tight-tree once a graph crosses the node or edge threshold', () => {
    expect(selectDagreRanker(LARGE_GRAPH_NODE_THRESHOLD, 10)).toBe(LARGE_GRAPH_RANKER);
    expect(selectDagreRanker(10, LARGE_GRAPH_EDGE_THRESHOLD)).toBe(LARGE_GRAPH_RANKER);
  });

  it('respects an explicit ranker', () => {
    expect(selectDagreRanker(500, 2000, 'network-simplex')).toBe('network-simplex');
    expect(selectDagreRanker(5, 4, 'longest-path')).toBe('longest-path');
  });

  it('positions every node on a small graph without changing the ranker', () => {
    const flow = createDagreGraph({ ranksep: 300, nodesep: 50 });
    addCompleteGraph(flow, 6);
    layoutDagreGraph(flow);

    expect(flow.graph().ranker).toBeUndefined();
    for (let i = 0; i < 6; i++) {
      const node = flow.node(`n${i}`);
      expect(typeof node.x).toBe('number');
      expect(typeof node.y).toBe('number');
    }
  });

  it('applies tight-tree to a large graph and still positions every node', () => {
    const flow = createDagreGraph({ ranksep: 300, nodesep: 50 });
    addCompleteGraph(flow, LARGE_GRAPH_NODE_THRESHOLD, LARGE_GRAPH_EDGE_THRESHOLD);
    layoutDagreGraph(flow);

    expect(flow.graph().ranker).toBe(LARGE_GRAPH_RANKER);
    for (let i = 0; i < LARGE_GRAPH_NODE_THRESHOLD; i++) {
      const node = flow.node(`n${i}`);
      expect(typeof node.x).toBe('number');
      expect(typeof node.y).toBe('number');
    }
  });
});
