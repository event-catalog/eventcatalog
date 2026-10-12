import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import type { Node } from "@xyflow/react";
import { addNodes, fitContainersAround, getCanvasMaps } from "../canvas-doc";
import { getAbsolutePosition } from "../grouping";

const node = (
  id: string,
  type: string,
  x: number,
  y: number,
  extra: Partial<Node> = {},
): Node => ({ id, type, position: { x, y }, data: {}, ...extra });

describe("containers in containers", () => {
  it("grows every container around something added inside the innermost one", () => {
    const doc = new Y.Doc();
    addNodes(doc, [
      node("domain", "domain-group", 0, 0, { width: 720, height: 460 }),
      node("system", "system-group", 80, 100, {
        width: 560,
        height: 360,
        parentId: "domain",
      }),
      // Left of the system's content area, so the system grows left
      node("service", "service", -100, 120, { parentId: "system" }),
    ]);
    fitContainersAround(doc, "service");
    const nodes = Array.from(getCanvasMaps(doc).nodes.values());
    const lookup = new Map(nodes.map((n) => [n.id, n]));
    const rect = (id: string) => {
      const n = lookup.get(id)!;
      const at = getAbsolutePosition(n, lookup);
      return {
        left: at.x,
        top: at.y,
        right: at.x + (n.width ?? 240),
        bottom: at.y + (n.height ?? 112),
      };
    };
    const [domain, system, service] = [
      rect("domain"),
      rect("system"),
      rect("service"),
    ];
    expect(system.left).toBeGreaterThanOrEqual(domain.left);
    expect(system.right).toBeLessThanOrEqual(domain.right);
    expect(system.bottom).toBeLessThanOrEqual(domain.bottom);
    expect(service.left).toBeGreaterThanOrEqual(system.left);
  });
});

describe("what containers hold", () => {
  it("puts a domain in a domain (a subdomain), never in a system", async () => {
    const { canHold } = await import("../node-types");
    const { findGroupAtPoint } = await import("../grouping");
    expect(canHold("domain-group", "domain-group")).toBe(true);
    expect(canHold("domain-group", "system-group")).toBe(true);
    expect(canHold("system-group", "service")).toBe(true);
    expect(canHold("system-group", "domain-group")).toBe(false);
    expect(canHold("system-group", "note")).toBe(false);
    const nodes: Node[] = [
      node("domain", "domain-group", 0, 0, { width: 800, height: 600 }),
      node("system", "system-group", 100, 100, {
        width: 500,
        height: 400,
        parentId: "domain",
      }),
    ];
    // A point inside the system (so inside the domain too)
    expect(findGroupAtPoint({ x: 300, y: 300 }, nodes, "service")?.id).toBe(
      "system",
    );
    expect(
      findGroupAtPoint({ x: 300, y: 300 }, nodes, "domain-group")?.id,
    ).toBe("domain");
  });
});
