// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ServiceNode from "./ServiceNode";

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
  useNodeId: () => "service",
  useStore: () => 0,
}));

describe("ServiceNode", () => {
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

  const renderService = (
    styles?: { node?: { color?: string; label?: string } },
    style?: string,
  ) => {
    act(() => {
      root.render(
        <ServiceNode
          id="DataExport-0.0.1"
          type="service"
          position={{ x: 0, y: 0 }}
          data={{
            mode: "full",
            style,
            service: {
              name: "A Cron Job",
              version: "0.0.1",
              summary: "Daily job for data export",
              styles,
            },
          }}
        />,
      );
    });
  };

  const badge = () =>
    container.querySelector<HTMLElement>(".absolute.-top-2\\.5 > span")!;

  it("labels the node with its type by default", () => {
    renderService();

    expect(badge().textContent).toBe("Service");
    expect(badge().style.backgroundColor).toBe("");
  });

  it("uses the label and colour set in styles.node", () => {
    renderService({ node: { color: "blue", label: "job" } });

    expect(badge().textContent).toBe("job");
    expect(badge().style.backgroundColor).toBe("rgb(59, 130, 246)");
    const card = container.firstElementChild as HTMLElement;
    expect(card.style.borderColor).toBe("rgb(59, 130, 246)");
  });

  it("uses the label and colour on post-it nodes", () => {
    renderService({ node: { color: "blue", label: "job" } }, "post-it");

    expect(container.textContent).toContain("job");
    expect(container.textContent).not.toContain("Service");
    expect(container.innerHTML).toContain("rgb(191, 219, 254)");
  });
});
