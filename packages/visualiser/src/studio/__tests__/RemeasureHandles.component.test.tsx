// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RemeasureHandles } from "../components/RemeasureHandles";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const { updateNodeInternals, canvas } = vi.hoisted(() => ({
  updateNodeInternals: vi.fn(),
  canvas: { current: null as HTMLElement | null },
}));

vi.mock("@xyflow/react", () => ({
  useStore: (select: (state: { domNode: HTMLElement | null }) => unknown) =>
    select({ domNode: canvas.current }),
  useUpdateNodeInternals: () => updateNodeInternals,
}));

const fire = (
  element: Element,
  type: "animationend" | "transitionend",
  detail: Record<string, string>,
) => {
  const event = new Event(type, { bubbles: true });
  Object.assign(event, detail);
  element.dispatchEvent(event);
};

// Frames run when the test says so
let frames: FrameRequestCallback[] = [];
const runFrame = () => {
  const run = frames;
  frames = [];
  run.forEach((callback) => callback(0));
};
vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
  frames.push(callback);
  return frames.length;
});
vi.stubGlobal("cancelAnimationFrame", () => {});

describe("RemeasureHandles", () => {
  let root: Root;
  let node: HTMLElement;

  beforeEach(() => {
    frames = [];
    updateNodeInternals.mockClear();
    canvas.current = document.createElement("div");
    node = document.createElement("div");
    node.className = "react-flow__node";
    node.dataset.id = "domain-1";
    canvas.current.appendChild(node);
    document.body.appendChild(canvas.current);
    root = createRoot(document.createElement("div"));
    act(() => root.render(<RemeasureHandles />));
  });

  afterEach(() => {
    act(() => root.unmount());
    canvas.current?.remove();
  });

  it("measures a node's handles again once it has popped in", () => {
    fire(node, "animationend", { animationName: "studio-node-in" });
    runFrame();

    expect(updateNodeInternals).toHaveBeenCalledWith(["domain-1"]);
  });

  it("measures a container's handles again once its size has eased in, once for its width and height", () => {
    fire(node, "transitionend", { propertyName: "width" });
    fire(node, "transitionend", { propertyName: "height" });
    runFrame();

    expect(updateNodeInternals).toHaveBeenCalledTimes(1);
    expect(updateNodeInternals).toHaveBeenCalledWith(["domain-1"]);
  });

  it("leaves nodes alone for other animations and transitions, and for what's inside them", () => {
    fire(node, "animationend", { animationName: "ec-handle-glow" });
    fire(node, "transitionend", { propertyName: "transform" });
    const inside = document.createElement("span");
    node.appendChild(inside);
    fire(inside, "animationend", { animationName: "studio-node-in" });
    runFrame();

    expect(updateNodeInternals).not.toHaveBeenCalled();
  });
});
