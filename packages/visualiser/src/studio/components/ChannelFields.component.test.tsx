// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChannelFields } from "./ChannelFields";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("ChannelFields", () => {
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

  const render = (props: { type?: string; deadLetter?: boolean }) => {
    const onChange = vi.fn();
    const onSaved = vi.fn();
    act(() => {
      root.render(
        <ChannelFields {...props} onChange={onChange} onSaved={onSaved} />,
      );
    });
    return { onChange, onSaved };
  };
  const option = (label: string) =>
    Array.from(
      container.querySelectorAll<HTMLButtonElement>('[role="radio"]'),
    ).find((button) => button.textContent === label)!;

  it("shows the channel's type as picked, and None without one", () => {
    render({ type: "stream" });
    expect(option("Stream").getAttribute("aria-checked")).toBe("true");
    expect(option("None").getAttribute("aria-checked")).toBe("false");

    render({});
    expect(option("None").getAttribute("aria-checked")).toBe("true");
  });

  it("saves the type picked, and takes it off with None", () => {
    const { onChange, onSaved } = render({ type: "queue" });

    act(() => option("Topic").click());
    expect(onChange).toHaveBeenCalledWith({ type: "topic" });
    expect(onSaved).toHaveBeenCalled();

    act(() => option("None").click());
    expect(onChange).toHaveBeenCalledWith({ type: undefined });
  });

  it("doesn't save the type it already has", () => {
    const { onChange } = render({ type: "queue" });
    act(() => option("Queue").click());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("makes it a dead letter channel, or not", () => {
    const { onChange } = render({ deadLetter: false });
    const checkbox = container.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    )!;

    act(() => checkbox.click());
    expect(onChange).toHaveBeenCalledWith({ isDeadLetterChannel: true });
  });
});
