import { describe, expect, it } from "vitest";
import { getRoutePath } from "./route";

// A route leaving the source at (0, 50), stepping down to arrive at (200, 150)
const route = {
  points: [
    { x: 0, y: 50 },
    { x: 100, y: 50 },
    { x: 100, y: 150 },
    { x: 200, y: 150 },
  ],
};

describe("getRoutePath", () => {
  it("draws the route between the edge's ends", () => {
    expect(getRoutePath(route, { x: 0, y: 50 }, { x: 200, y: 150 })?.path).toBe(
      "M 0 50 L 100 50 L 100 150 L 200 150",
    );
  });

  it("moves the ends onto the node sides, keeping where they were spread along them", () => {
    expect(getRoutePath(route, { x: 5, y: 60 }, { x: 195, y: 140 })?.path).toBe(
      "M 5 50 L 100 50 L 100 150 L 195 150",
    );
  });

  it("has no path when a node has moved away from where it was laid out", () => {
    expect(
      getRoutePath(route, { x: 300, y: 50 }, { x: 200, y: 150 }),
    ).toBeUndefined();
  });

  it("goes exactly to handles an edge is attached to, keeping the ends flat", () => {
    expect(
      getRoutePath(
        route,
        { x: 5, y: 60 },
        { x: 195, y: 140 },
        { toSourceHandle: true, toTargetHandle: true },
      )?.path,
    ).toBe("M 5 60 L 100 60 L 100 140 L 195 140");
  });

  it("keeps a straight route straight", () => {
    const straight = {
      points: [
        { x: 0, y: 50 },
        { x: 200, y: 50 },
      ],
    };

    expect(
      getRoutePath(straight, { x: 10, y: 60 }, { x: 190, y: 40 })?.path,
    ).toBe("M 10 50 L 190 50");
  });

  it("moves the ends with their nodes, keeping the end segments flat", () => {
    expect(
      getRoutePath(
        route,
        { x: 0, y: 80 },
        { x: 200, y: 150 },
        { sourceMoved: { x: 0, y: 30 } },
      )?.path,
    ).toBe("M 0 80 L 100 80 L 100 150 L 200 150");
  });

  it("moves the whole route, and its label, when both nodes move together", () => {
    const labelled = { ...route, label: { x: 100, y: 100 } };
    const moved = { x: 20, y: 30 };

    expect(
      getRoutePath(
        labelled,
        { x: 20, y: 80 },
        { x: 220, y: 180 },
        { sourceMoved: moved, targetMoved: moved },
      ),
    ).toEqual({
      path: "M 20 80 L 120 80 L 120 180 L 220 180",
      label: { x: 120, y: 130 },
    });
  });
});
