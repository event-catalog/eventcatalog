// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import type { Edge } from "@xyflow/react";
import {
  ANIMATE_MESSAGES_STORAGE_KEY,
  applyMessageAnimation,
  LARGE_GRAPH_NODE_THRESHOLD,
  shouldAnimateMessages,
} from "./message-animation";

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

describe("shouldAnimateMessages", () => {
  const ask = (search: string, stored: string | null, nodeCount = 10) => {
    window.history.replaceState(null, "", `/${search}`);
    if (stored === null) localStorage.removeItem(ANIMATE_MESSAGES_STORAGE_KEY);
    else localStorage.setItem(ANIMATE_MESSAGES_STORAGE_KEY, stored);
    return shouldAnimateMessages({ nodeCount });
  };

  it("never animates graphs that aren't message flows, and follows the animated prop", () => {
    expect(
      shouldAnimateMessages({ disabled: true, animated: true, nodeCount: 1 }),
    ).toBe(false);
    expect(shouldAnimateMessages({ animated: false, nodeCount: 1 })).toBe(
      false,
    );
  });

  it("follows the URL, then the person's choice", () => {
    expect(ask("?animate=false", "true")).toBe(false);
    expect(ask("?animate=true", "false", LARGE_GRAPH_NODE_THRESHOLD + 1)).toBe(
      true,
    );
    expect(ask("", "false")).toBe(false);
    expect(ask("", "true")).toBe(true);
  });

  it("doesn't animate large graphs unless asked to, even when the person turned it on for another graph", () => {
    expect(ask("", null, LARGE_GRAPH_NODE_THRESHOLD + 1)).toBe(false);
    expect(ask("", "true", LARGE_GRAPH_NODE_THRESHOLD + 1)).toBe(false);
    expect(ask("", null, LARGE_GRAPH_NODE_THRESHOLD)).toBe(true);
  });
});
