// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ExportModal from "./ExportModal";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("ExportModal", () => {
  let container: HTMLDivElement;
  let root: Root;
  const handlers = {
    onClose: vi.fn(),
    onExportImage: vi.fn(),
    onExportMermaid: vi.fn(),
  };

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    Object.values(handlers).forEach((handler) => handler.mockReset());
    act(() => root.render(<ExportModal {...handlers} />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const button = (text: string) =>
    [...container.querySelectorAll("button")].find((element) =>
      element.textContent?.includes(text),
    )!;

  it("offers exporting the diagram as an image or as Mermaid", () => {
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain(
      "Export",
    );
    expect(button("Export as image")).toBeTruthy();
    expect(button("Export as Mermaid")).toBeTruthy();
  });

  it("closes and exports what was picked", () => {
    act(() => button("Export as Mermaid").click());

    expect(handlers.onClose).toHaveBeenCalledTimes(1);
    expect(handlers.onExportMermaid).toHaveBeenCalledTimes(1);
    expect(handlers.onExportImage).not.toHaveBeenCalled();
  });

  it("closes on Escape without exporting", () => {
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(handlers.onClose).toHaveBeenCalledTimes(1);
    expect(handlers.onExportImage).not.toHaveBeenCalled();
    expect(handlers.onExportMermaid).not.toHaveBeenCalled();
  });
});
