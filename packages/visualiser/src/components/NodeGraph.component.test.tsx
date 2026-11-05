// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import NodeGraph from "./NodeGraph";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const flow = vi.hoisted(() => ({
  fitView: vi.fn(),
  props: {} as { onPaneClick?: () => void; nodes?: Node[] },
}));

// The canvas needs a real browser to draw: all that's looked at here is what NodeGraph gives it, and what it moves
vi.mock("@xyflow/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xyflow/react")>();
  return {
    ...actual,
    ReactFlow: (props: typeof flow.props) => {
      flow.props = props;
      return null;
    },
    useReactFlow: () => ({ ...actual.useReactFlow(), fitView: flow.fitView }),
  };
});

const PORTAL_ID = "diagram";

const nodes: Node[] = [
  {
    id: "orders",
    type: "services",
    position: { x: 0, y: 0 },
    data: { label: "Orders" },
  },
  {
    id: "order-placed",
    type: "events",
    position: { x: 300, y: 0 },
    selected: true,
    data: { label: "OrderPlaced" },
  },
];
const edges: Edge[] = [{ id: "e1", source: "orders", target: "order-placed" }];

describe("NodeGraph", () => {
  let container: HTMLDivElement;
  let portal: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    flow.props = {};
    portal = document.createElement("div");
    portal.id = PORTAL_ID;
    container = document.createElement("div");
    document.body.append(portal, container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        <NodeGraph
          id="orders-diagram"
          portalId={PORTAL_ID}
          nodes={nodes}
          edges={edges}
        />,
      );
    });
    // Fitting the diagram when it first opens isn't what's being tested
    flow.fitView.mockClear();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    portal.remove();
  });

  describe("clicking the canvas background", () => {
    it("keeps the current zoom and position, so a stray click on a large diagram doesn't lose your place", async () => {
      await act(async () => flow.props.onPaneClick?.());

      expect(flow.props.onPaneClick).toBeDefined();
      expect(flow.fitView).not.toHaveBeenCalled();
    });

    it("clears the selected node", async () => {
      const isSelected = () =>
        flow.props.nodes?.find((node) => node.id === "order-placed")?.selected;
      expect(isSelected()).toBe(true);

      await act(async () => flow.props.onPaneClick?.());

      expect(isSelected()).toBe(false);
    });
  });
});
