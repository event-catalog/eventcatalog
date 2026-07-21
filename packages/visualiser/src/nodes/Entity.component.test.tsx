// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EntityNode, { ENTITY_TARGET_HANDLE_ID } from "./Entity";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const { updateNodeInternals } = vi.hoisted(() => ({
  updateNodeInternals: vi.fn(),
}));

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type }: { id?: string; type: string }) => (
    <div
      className="react-flow__handle"
      data-handle-id={id}
      data-handle-type={type}
    />
  ),
  Position: {
    Left: "left",
    Right: "right",
  },
  useUpdateNodeInternals: () => updateNodeInternals,
}));

vi.mock("@radix-ui/react-context-menu", () => ({
  Root: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Trigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Content: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Item: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../utils/badges", () => ({
  getIcon: () => () => <span data-testid="entity-icon" />,
}));

vi.mock("../context/PortalContainerContext", () => ({
  usePortalContainer: () => undefined,
}));

describe("EntityNode", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    updateNodeInternals.mockClear();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("renders the whole-entity target and expands embedded properties from the whole row", () => {
    act(() => {
      root.render(
        <EntityNode
          id="Order-1.0.0"
          data={{
            mode: "full",
            entityTargetHandle: ENTITY_TARGET_HANDLE_ID,
            referencePropertyNames: ["orderLines"],
            entity: {
              data: {
                id: "Order",
                name: "Order",
                version: "1.0.0",
                properties: [
                  {
                    name: "customerId",
                    type: "UUID",
                    references: "Customer",
                  },
                  {
                    name: "orderLines",
                    type: "array",
                    items: { type: "OrderLine" },
                  },
                  {
                    name: "adjustments",
                    type: "array",
                    items: {
                      type: "object",
                      properties: [{ name: "amount", type: "decimal" }],
                    },
                  },
                  {
                    name: "deliveryAddress",
                    type: "object",
                    properties: [{ name: "city", type: "string" }],
                  },
                ],
              },
            },
          }}
        />,
      );
    });

    expect(
      container.querySelector(`[data-handle-id="${ENTITY_TARGET_HANDLE_ID}"]`),
    ).not.toBeNull();
    expect(
      container.querySelector('[title="References Customer"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[title="References OrderLine"]'),
    ).not.toBeNull();
    expect(container.querySelector('[title="References object"]')).toBeNull();
    expect(container.textContent).not.toContain("city");
    expect(updateNodeInternals).not.toHaveBeenCalled();

    const row = container.querySelector<HTMLElement>(
      '[role="button"][aria-label="Expand deliveryAddress"]',
    );
    expect(row).not.toBeNull();

    act(() => {
      row?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("city");
    expect(
      container.querySelector(
        '[role="button"][aria-label="Collapse deliveryAddress"]',
      ),
    ).not.toBeNull();
    expect(updateNodeInternals).toHaveBeenCalledTimes(1);
    expect(updateNodeInternals).toHaveBeenCalledWith("Order-1.0.0");

    const expandedRow = container.querySelector<HTMLElement>(
      '[role="button"][aria-label="Collapse deliveryAddress"]',
    );
    act(() => {
      expandedRow?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).not.toContain("city");
    expect(updateNodeInternals).toHaveBeenCalledTimes(2);
  });
});
