// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { memoNode } from "./node-memo";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
});

const nodeProps = (overrides: Record<string, unknown> = {}) => ({
  id: "order-service",
  type: "services",
  data: { label: "Order Service" },
  selected: false,
  dragging: false,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
  ...overrides,
});

describe("memoNode", () => {
  const renderCounting = () => {
    let renders = 0;
    const Node = memoNode((props: { data: { label: string } }) => {
      renders++;
      return <div>{props.data.label}</div>;
    });
    const container = document.createElement("div");
    root = createRoot(container);
    return { Node, renders: () => renders, container };
  };

  // React Flow moves a node by its wrapper's transform, so a node only
  // repositioned (e.g. every frame of a level change animation) need not render again.
  it("does not render the node again when only its position changes", () => {
    const { Node, renders } = renderCounting();
    const data = { label: "Order Service" };

    act(() => root!.render(<Node {...nodeProps({ data })} />));
    act(() =>
      root!.render(
        <Node
          {...nodeProps({
            data,
            positionAbsoluteX: 120,
            positionAbsoluteY: 40,
          })}
        />,
      ),
    );

    expect(renders()).toBe(1);
  });

  it("renders the node again when anything else changes", () => {
    const { Node, renders, container } = renderCounting();
    const data = { label: "Order Service" };

    act(() => root!.render(<Node {...nodeProps({ data })} />));
    act(() => root!.render(<Node {...nodeProps({ data, selected: true })} />));
    act(() =>
      root!.render(
        <Node {...nodeProps({ data: { label: "Orders" }, selected: true })} />,
      ),
    );

    expect(renders()).toBe(3);
    expect(container.textContent).toBe("Orders");
  });
});
