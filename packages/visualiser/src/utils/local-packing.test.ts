import { describe, expect, it } from "vitest";
import {
  packNodesAroundBounds,
  rectsIntersect,
  type PackableNode,
} from "./local-packing";

const node = (
  id: string,
  x: number,
  y: number,
  width = 100,
  height = 100,
): PackableNode => ({
  id,
  position: { x, y },
  measured: { width, height },
});

describe("packNodesAroundBounds", () => {
  it("moves intersecting nodes into the nearest non-overlapping slot", () => {
    const nodes = [
      node("group", 0, 0, 300, 300),
      node("move", 40, 180),
      node("occupied", 40, 360),
    ];
    const positions = packNodesAroundBounds({
      nodes,
      movableNodeIds: new Set(["move"]),
      protectedBounds: { x: 0, y: 0, width: 300, height: 300 },
      groupNodeId: "group",
      gap: 40,
    });

    expect(positions.get("move")).toEqual({ x: 40, y: 500 });
  });

  it("keeps moved nodes from colliding with existing nodes and each other", () => {
    const nodes = [
      node("group", 0, 0, 300, 300),
      node("move-a", 40, 180),
      node("move-b", 40, 220),
      node("occupied", 40, 360),
    ];
    const positions = packNodesAroundBounds({
      nodes,
      movableNodeIds: new Set(["move-a", "move-b"]),
      protectedBounds: { x: 0, y: 0, width: 300, height: 300 },
      groupNodeId: "group",
      gap: 40,
    });
    const movedRects = ["move-a", "move-b"].map((id) => {
      const moved = nodes.find((n) => n.id === id)!;
      const position = positions.get(id)!;
      return {
        ...position,
        width: moved.measured!.width!,
        height: moved.measured!.height!,
      };
    });

    expect(rectsIntersect(movedRects[0], movedRects[1], 40)).toBe(false);
    expect(movedRects.map((rect) => rect.y)).toEqual([500, 640]);
  });

  it("moves nodes above the protected bounds when they start above the group center", () => {
    const nodes = [node("group", 0, 0, 300, 300), node("move", 40, 20)];
    const positions = packNodesAroundBounds({
      nodes,
      movableNodeIds: new Set(["move"]),
      protectedBounds: { x: 0, y: 0, width: 300, height: 300 },
      groupNodeId: "group",
      gap: 40,
    });

    expect(positions.get("move")).toEqual({ x: 40, y: -140 });
  });
});
