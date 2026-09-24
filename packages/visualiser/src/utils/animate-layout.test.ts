import { afterEach, describe, expect, it, vi } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import {
  animateLayout,
  getLayoutBounds,
  getSystemMorphs,
  LAYOUT_ANIMATION_DURATION,
} from "./animate-layout";

const node = (id: string, x: number, y: number, extra = {}): Node => ({
  id,
  position: { x, y },
  data: {},
  ...extra,
});

const edge = (source: string, target: string): Edge => ({
  id: `${source}-${target}`,
  source,
  target,
});

// Runs requestAnimationFrame callbacks with a controllable clock
const useFakeFrames = () => {
  const callbacks: FrameRequestCallback[] = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callbacks.push(callback);
    return callbacks.length;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.spyOn(performance, "now").mockReturnValue(0);
  return (time: number) => callbacks.shift()?.(time);
};

describe("animateLayout", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("moves nodes towards their new position, fading removed nodes out", () => {
    const runFrame = useFakeFrames();
    const setNodes = vi.fn();
    const setEdges = vi.fn();

    animateLayout({
      fromNodes: [node("a", 0, 0), node("b", 100, 0)],
      fromEdges: [edge("a", "b")],
      toNodes: [node("a", 200, 100)],
      toEdges: [],
      setNodes,
      setEdges,
    });

    // The first frame is drawn straight away, at the old positions
    expect(setNodes.mock.calls[0][0][0].position).toEqual({ x: 0, y: 0 });

    runFrame(LAYOUT_ANIMATION_DURATION / 2);

    const [midway] = setNodes.mock.lastCall!;
    expect(midway[0].position).toEqual({ x: 100, y: 50 });
    expect(midway[1]).toMatchObject({ id: "b", className: "ec-exit" });
    expect(setEdges.mock.calls[0][0][0]).toMatchObject({
      id: "a-b",
      className: "ec-exit",
    });
  });

  it("ends on the new layout and drops the removed edges", () => {
    const runFrame = useFakeFrames();
    const setNodes = vi.fn();
    const setEdges = vi.fn();
    const onDone = vi.fn();
    const toNodes = [node("a", 200, 100), node("c", 0, 0)];

    animateLayout({
      fromNodes: [node("a", 0, 0), node("b", 100, 0)],
      fromEdges: [edge("a", "b")],
      toNodes,
      toEdges: [edge("a", "c")],
      setNodes,
      setEdges,
      onDone,
    });

    runFrame(LAYOUT_ANIMATION_DURATION);

    expect(setNodes).toHaveBeenLastCalledWith(toNodes);
    const updateEdges = setEdges.mock.lastCall![0];
    expect(
      updateEdges([
        { ...edge("a", "c"), className: "ec-enter" },
        { ...edge("a", "b"), className: "ec-exit" },
      ]),
    ).toEqual([{ ...edge("a", "c"), className: undefined }]);
    expect(onDone).toHaveBeenCalled();
  });
});

describe("animateLayout morphing", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("grows a group out of the node it replaces", () => {
    useFakeFrames();
    const setNodes = vi.fn();

    animateLayout({
      fromNodes: [
        node("system", 100, 100, { measured: { width: 200, height: 100 } }),
      ],
      fromEdges: [],
      toNodes: [
        node("group", 0, 0, {
          origin: [0, 0],
          style: { width: 800, height: 400 },
        }),
      ],
      toEdges: [],
      setNodes,
      setEdges: vi.fn(),
      morphs: [{ from: "system", to: "group" }],
      nodeOrigin: [0.5, 0.5],
    });

    // Starts on the system node's box (centred on 100,100), at its size
    const [group] = setNodes.mock.calls[0][0];
    expect(group.position).toEqual({ x: 0, y: 50 });
    expect(group.style).toMatchObject({ width: 200, height: 100 });
  });

  it("shrinks a group into the node that replaces it", () => {
    const runFrame = useFakeFrames();
    const setNodes = vi.fn();

    animateLayout({
      fromNodes: [
        node("group", 0, 0, {
          origin: [0, 0],
          style: { width: 800, height: 400 },
        }),
      ],
      fromEdges: [],
      toNodes: [node("system", 100, 100)],
      toEdges: [],
      setNodes,
      setEdges: vi.fn(),
      morphs: [{ from: "group", to: "system" }],
    });

    runFrame(LAYOUT_ANIMATION_DURATION);
    runFrame(LAYOUT_ANIMATION_DURATION);

    const frames = setNodes.mock.calls.map(([nodes]) => nodes);
    // The group fades out as it shrinks, then only the system node is left
    expect(frames[0][1]).toMatchObject({
      id: "group",
      className: "ec-morph-exit",
    });
    expect(frames.at(-1)!.map((n: Node) => n.id)).toEqual(["system"]);
  });
});

describe("getSystemMorphs", () => {
  it("pairs system nodes with their expanded groups, in either direction", () => {
    const systemNodes = [
      node("orders-1.0.0", 0, 0),
      node("billing-1.0.0", 0, 0),
      node("carrier-1.0.0", 0, 0),
    ];
    const expanded = [
      node("system-group-orders-1.0.0", 0, 0, { type: "system-group" }),
      node("system-group-billing-1.0.0", 0, 0, { type: "system-group" }),
      node("carrier-1.0.0", 0, 0),
    ];

    expect(getSystemMorphs(systemNodes, expanded)).toEqual([
      { from: "orders-1.0.0", to: "system-group-orders-1.0.0" },
      { from: "billing-1.0.0", to: "system-group-billing-1.0.0" },
    ]);
    expect(getSystemMorphs(expanded, systemNodes)).toEqual([
      { from: "system-group-orders-1.0.0", to: "orders-1.0.0" },
      { from: "system-group-billing-1.0.0", to: "billing-1.0.0" },
    ]);
  });
});

describe("getLayoutBounds", () => {
  it("covers the top level nodes, using group sizes and measured sizes", () => {
    const bounds = getLayoutBounds(
      [
        node("group", 0, 0, { style: { width: 500, height: 300 } }),
        node("child", 50, 50, { parentId: "group" }),
        node("system", 700, 100),
      ],
      [node("system", 0, 0, { measured: { width: 250, height: 120 } })],
    );

    expect(bounds).toEqual({ x: 0, y: 0, width: 950, height: 300 });
  });

  it("has no bounds for an empty graph", () => {
    expect(getLayoutBounds([], [])).toBeUndefined();
  });
});
