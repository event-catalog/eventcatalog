// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TruncatedResourceName } from "./TruncatedResourceName";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let observerCallbacks: Array<() => void> = [];
const scrollWidthReads = vi.fn(() => 300);
// jsdom's own layout properties, put back after each test
const layoutProperties = ["scrollWidth", "clientWidth"].map((name) => ({
  name,
  descriptor: Object.getOwnPropertyDescriptor(HTMLElement.prototype, name),
}));

beforeEach(() => {
  observerCallbacks = [];
  scrollWidthReads.mockClear();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        observerCallbacks.push(callback);
      }
      observe() {}
      disconnect() {}
    },
  );
  Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
    configurable: true,
    get: scrollWidthReads,
  });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get: () => 100,
  });
});

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  vi.unstubAllGlobals();
  layoutProperties.forEach(({ name, descriptor }) => {
    if (descriptor)
      Object.defineProperty(HTMLElement.prototype, name, descriptor);
    else delete (HTMLElement.prototype as any)[name];
  });
});

const renderName = () => {
  const container = document.createElement("div");
  root = createRoot(container);
  act(() =>
    root!.render(
      <TruncatedResourceName value="Order Fulfilment Service">
        Order Fulfilment Service
      </TruncatedResourceName>,
    ),
  );
  return container;
};

const tooltipText = (container: HTMLElement) =>
  container.querySelector(".ec-truncated-resource-name-tooltip")?.textContent;

describe("TruncatedResourceName", () => {
  // Reading layout while mounting forces a synchronous reflow for every node
  // that mounts (e.g. switching levels); the observer reports after layout instead.
  it("does not read the layout while mounting", () => {
    renderName();

    expect(scrollWidthReads).not.toHaveBeenCalled();
  });

  it("shows the full name on hover once the observer reports the name is cut off", () => {
    const container = renderName();

    act(() => observerCallbacks.forEach((callback) => callback()));

    expect(tooltipText(container)).toBe("Order Fulfilment Service");
  });

  it("checks whether the name is cut off on the next frame in browsers without ResizeObserver", () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("ResizeObserver", undefined);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
      frames.push(callback),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const container = renderName();
    expect(scrollWidthReads).not.toHaveBeenCalled();

    act(() => frames.forEach((callback) => callback(0)));

    expect(tooltipText(container)).toBe("Order Fulfilment Service");
  });
});
