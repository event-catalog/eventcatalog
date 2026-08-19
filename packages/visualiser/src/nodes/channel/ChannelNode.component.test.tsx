// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ChannelNode from "./ChannelNode";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@xyflow/react", () => ({
  Handle: ({ type }: { type: string }) => (
    <div className="react-flow__handle" data-handle-type={type} />
  ),
  Position: {
    Left: "left",
    Right: "right",
  },
  useNodeConnections: () => [],
}));

describe("ChannelNode", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const renderChannel = (isFocused: boolean, style?: string) => {
    act(() => {
      root.render(
        <ChannelNode
          id="ProductEvents-1.0.0"
          type="channel"
          position={{ x: 0, y: 0 }}
          data={{
            mode: "simple",
            style,
            isFocused,
            channel: {
              name: "Product Events",
              version: "1.0.0",
              summary: "Product lifecycle events",
            },
          }}
        />,
      );
    });
  };

  it.each([undefined, "post-it"])(
    "renders the focused border for the %s channel style",
    (style) => {
      renderChannel(true, style);

      expect(container.querySelector(".border-indigo-500\\/70")).not.toBeNull();
      expect(container.textContent).toContain("Viewing");
    },
  );

  it("does not render the focused border for related channels", () => {
    renderChannel(false);

    expect(container.querySelector(".border-indigo-500\\/70")).toBeNull();
    expect(container.textContent).not.toContain("Viewing");
  });
});
