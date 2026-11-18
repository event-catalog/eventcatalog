// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { NodeProps } from "@xyflow/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const { updateNodeInternals } = vi.hoisted(() => ({
  updateNodeInternals: vi.fn(),
}));

vi.mock("@xyflow/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@xyflow/react")>()),
  Handle: ({ id }: { id?: string }) => (
    <div className="react-flow__handle" data-handle-id={id} />
  ),
  useUpdateNodeInternals: () => updateNodeInternals,
}));

const { nodeTypes } = await import("../components/canvas-nodes");
const EntityCard = nodeTypes.entity as React.ComponentType<NodeProps>;

const entity = (names: string[]) =>
  ({
    id: "order",
    type: "entity",
    data: {
      entity: {
        name: "Order",
        properties: names.map((name) => ({ name, type: "string" })),
      },
    },
    selected: false,
    dragging: false,
    draggable: true,
    selectable: true,
    deletable: true,
    isConnectable: true,
    zIndex: 0,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
  }) as unknown as NodeProps;

describe("Studio's entity card", () => {
  let root: Root;

  beforeEach(() => {
    updateNodeInternals.mockClear();
    root = createRoot(document.createElement("div"));
  });

  afterEach(() => act(() => root.unmount()));

  const render = (names: string[]) =>
    act(() => root.render(<EntityCard {...entity(names)} />));

  it("measures its handles again when its properties are renamed, added or removed, so their connections are drawn", () => {
    render(["id", "customerId"]);
    expect(updateNodeInternals).not.toHaveBeenCalled();

    render(["id", "buyerId"]);
    render(["id", "buyerId", "total"]);
    render(["buyerId", "total"]);
    expect(updateNodeInternals).toHaveBeenCalledTimes(3);
    expect(updateNodeInternals).toHaveBeenLastCalledWith("order");
  });

  it("doesn't measure them again when nothing about its rows changed (e.g. a property's type, or its name)", () => {
    render(["id", "customerId"]);
    act(() =>
      root.render(
        <EntityCard
          {...entity(["id", "customerId"])}
          data={{
            entity: {
              name: "Purchase",
              properties: [
                { name: "id", type: "uuid" },
                { name: "customerId", type: "string" },
              ],
            },
          }}
        />,
      ),
    );
    expect(updateNodeInternals).not.toHaveBeenCalled();
  });
});
