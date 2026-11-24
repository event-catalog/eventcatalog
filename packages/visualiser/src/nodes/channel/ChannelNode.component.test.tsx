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
  useNodeId: () => "channel",
  useStore: () => 0,
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

      expect(
        container.querySelector(".border-\\[\\#3e63dd\\]\\/70"),
      ).not.toBeNull();
      expect(container.textContent).toContain("Viewing");
    },
  );

  it("does not render the focused border for related channels", () => {
    renderChannel(false);

    expect(container.querySelector(".border-\\[\\#3e63dd\\]\\/70")).toBeNull();
    expect(container.textContent).not.toContain("Viewing");
  });

  const renderDeadLetterChannel = (
    label?: string,
    styles?: { node?: { label?: string; color?: string } },
  ) => {
    act(() => {
      root.render(
        <ChannelNode
          id="OrdersDLQ-1.0.0"
          type="channel"
          position={{ x: 0, y: 0 }}
          data={{
            mode: "simple",
            channel: {
              name: "Orders DLQ",
              version: "1.0.0",
              summary: "Orders that couldn't be processed",
              isDeadLetterChannel: true,
              ...((label || styles) && {
                styles: { ...styles, node: { ...styles?.node, label } },
              }),
            },
          }}
        />,
      );
    });
  };

  it("labels a dead letter channel as one", () => {
    renderDeadLetterChannel();

    expect(container.textContent).toContain("Dead Letter Channel");
  });

  it("keeps a dead letter channel's own label", () => {
    renderDeadLetterChannel("Redrive queue");

    expect(container.textContent).toContain("Redrive queue");
    expect(container.textContent).not.toContain("Dead Letter Channel");
  });

  const card = () =>
    container.querySelector<HTMLElement>(".rounded-xl.border-2")!;

  const badge = () =>
    container.querySelector<HTMLElement>(".absolute.-top-2\\.5 span")!;

  it("marks a dead letter channel with a red border and a dark badge", () => {
    renderDeadLetterChannel();

    expect(badge().style.background).toBe("rgb(32, 32, 32)");
    expect(card().style.borderColor).toBe("rgb(239, 68, 68)");
  });

  it("draws a dead letter channel in its own colour when it has one, keeping the dark badge", () => {
    renderDeadLetterChannel(undefined, { node: { color: "blue" } });

    expect(card().style.borderColor).toBe("rgb(59, 130, 246)");
    expect(badge().style.background).toBe("rgb(32, 32, 32)");
  });

  it("leaves a dead letter channel's address off its card", () => {
    act(() => {
      root.render(
        <ChannelNode
          id="OrdersDLQ-1.0.0"
          type="channel"
          position={{ x: 0, y: 0 }}
          data={{
            mode: "full",
            channel: {
              name: "Orders DLQ",
              version: "1.0.0",
              summary: "",
              address: "orders-dlq",
              isDeadLetterChannel: true,
            },
          }}
        />,
      );
    });

    expect(container.textContent).not.toContain("orders-dlq");
  });

  const renderTypedChannel = (channel: Record<string, unknown>) => {
    act(() => {
      root.render(
        <ChannelNode
          id="OrderEvents-1.0.0"
          type="channel"
          position={{ x: 0, y: 0 }}
          data={{
            mode: "simple",
            channel: {
              name: "Order Events",
              version: "1.0.0",
              summary: "Order lifecycle events",
              ...channel,
            },
          }}
        />,
      );
    });
  };

  it.each([
    ["queue", "Queue"],
    ["topic", "Topic"],
    ["stream", "Stream"],
  ])("labels a %s as one, keeping the channel's grey", (type, label) => {
    renderTypedChannel({ type });

    expect(container.textContent).toContain(label);
    expect(card().style.borderColor).toBe("");
  });

  it("labels a channel without a type, or with one it doesn't know, as a channel", () => {
    renderTypedChannel({ type: "pipe" });

    expect(container.textContent).toContain("Channel");
    expect(card().style.borderColor).toBe("");
  });

  it("labels a dead letter queue as one, with a red border rather than the queue's colour", () => {
    renderTypedChannel({ type: "queue", isDeadLetterChannel: true });

    expect(container.textContent).toContain("Dead Letter Queue");
    expect(card().style.borderColor).toBe("rgb(239, 68, 68)");
  });

  it("draws a typed channel in its own colour when it has one", () => {
    renderTypedChannel({ type: "stream", styles: { node: { color: "blue" } } });

    expect(card().style.borderColor).toBe("rgb(59, 130, 246)");
  });
});
