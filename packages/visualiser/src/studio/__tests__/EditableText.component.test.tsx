// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditableText } from "../components/NodeCard";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLElement;
let root: Root;
const onSave = vi.fn();

const render = (value: string, startEmpty = true) =>
  act(() =>
    root.render(
      <EditableText
        label="Name"
        value={value}
        onSave={onSave}
        startEmpty={startEmpty}
        required
      />,
    ),
  );
const input = () => host.querySelector("input")!;
// Typed as React sees it (its own value setter, then an input event)
const type = (text: string) =>
  act(() => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input(), text);
    input().dispatchEvent(new Event("input", { bubbles: true }));
  });

beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  onSave.mockClear();
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("EditableText with startEmpty", () => {
  it("starts empty rather than showing its value", () => {
    render("NewEvent");
    expect(input().value).toBe("");
  });

  it("keeps its value when it's left with nothing typed", () => {
    render("NewEvent");
    act(() => input().focus());
    act(() => input().blur());
    expect(input().value).toBe("NewEvent");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("saves what's typed in it", () => {
    render("NewEvent");
    act(() => input().focus());
    type("OrderShipped");
    act(() => input().blur());
    expect(onSave).toHaveBeenCalledWith("OrderShipped");
  });

  it("still shows a change made somewhere else", () => {
    render("NewEvent");
    render("OrderPlaced");
    expect(input().value).toBe("OrderPlaced");
  });

  it("shows its value straight away without it", () => {
    render("NewEvent", false);
    expect(input().value).toBe("NewEvent");
  });
});

describe("EditableText with accept", () => {
  const taken = new Set(["id", "createdAt"]);
  const renderAccepting = () =>
    act(() =>
      root.render(
        <EditableText
          label="Property name"
          value="customerId"
          onSave={onSave}
          accept={(name) => !taken.has(name)}
          required
        />,
      ),
    );

  it("doesn't save a value it won't accept, while it's typed or when it's left, and puts back what was there", () => {
    vi.useFakeTimers();
    try {
      renderAccepting();
      act(() => input().focus());
      type("id");
      act(() => vi.advanceTimersByTime(1000));
      expect(onSave).not.toHaveBeenCalled();
      act(() => input().blur());
      expect(onSave).not.toHaveBeenCalled();
      expect(input().value).toBe("customerId");
    } finally {
      vi.useRealTimers();
    }
  });

  it("saves what it accepts, even after passing through a value it won't", () => {
    vi.useFakeTimers();
    try {
      renderAccepting();
      act(() => input().focus());
      type("id");
      act(() => vi.advanceTimersByTime(1000));
      type("idempotencyKey");
      act(() => vi.advanceTimersByTime(1000));
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith("idempotencyKey");
    } finally {
      vi.useRealTimers();
    }
  });
});
