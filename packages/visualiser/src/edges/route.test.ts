import { describe, expect, it } from "vitest";
import { Position } from "@xyflow/react";
import { getRoutePath, getStepPath } from "./route";

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

  it("gives where the route meets each node, for the dots drawn where an edge meets a domain's box", () => {
    expect(
      getRoutePath(route, { x: 5, y: 60 }, { x: 195, y: 140 }),
    ).toMatchObject({ start: { x: 5, y: 50 }, end: { x: 195, y: 150 } });
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

  it("lands an edge laid out in the middle of a node in the middle of the node as rendered, when it renders shorter", () => {
    // Laid out 100 tall, rendered 40 tall: the middle moves from 50 to 20 below the top
    const laidOut = {
      ...route,
      source: { x: 0, y: 0, height: 100 },
      target: { x: 200, y: 100, height: 100 },
    };

    expect(
      getRoutePath(
        laidOut,
        { x: 0, y: 20 },
        { x: 200, y: 120 },
        { sourceHeight: 40, targetHeight: 40 },
      )?.path,
    ).toBe("M 0 20 L 100 20 L 100 120 L 200 120");
  });

  it("keeps edges as far apart as they were spread along a node's side, so their labels don't overlap", () => {
    // 10 below the middle of a node laid out 100 tall, so 10 below the middle of one rendered 40 tall
    const lower = {
      points: [
        { x: 0, y: 60 },
        { x: 200, y: 60 },
      ],
      source: { x: 0, y: 0, height: 100 },
      target: { x: 200, y: 0, height: 100 },
    };

    expect(
      getRoutePath(
        lower,
        { x: 0, y: 20 },
        { x: 200, y: 20 },
        { sourceHeight: 40, targetHeight: 40 },
      )?.path,
    ).toBe("M 0 30 L 200 30");
  });

  it("keeps an edge spread further than a node renders on the node's side", () => {
    // 45 below the middle of a node laid out 100 tall: a node rendered 40 tall ends 20 below
    // its middle, so the edge goes just inside its bottom corner
    const nearBottom = {
      points: [
        { x: 0, y: 95 },
        { x: 200, y: 95 },
      ],
      source: { x: 0, y: 0, height: 100 },
      target: { x: 200, y: 0, height: 100 },
    };

    expect(
      getRoutePath(
        nearBottom,
        { x: 0, y: 20 },
        { x: 200, y: 20 },
        { sourceHeight: 40, targetHeight: 40 },
      )?.path,
    ).toBe("M 0 32 L 200 32");
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
      start: { x: 20, y: 80 },
      end: { x: 220, y: 180 },
    });
  });
});

describe("getStepPath", () => {
  const fromService = {
    sourceX: 0,
    sourceY: 0,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  };

  it("puts the label on the last stretch into the target, where no other edge from the source runs", () => {
    // Two edges from one service to nodes in the same column turn at the same x (100)
    const [, toDatabaseX, toDatabaseY] = getStepPath({
      ...fromService,
      targetX: 200,
      targetY: 150,
    });
    const [, toEventX, toEventY] = getStepPath({
      ...fromService,
      targetX: 200,
      targetY: 300,
    });

    expect([toDatabaseX, toDatabaseY]).toEqual([150, 150]);
    expect([toEventX, toEventY]).toEqual([150, 300]);
  });

  it("keeps the middle for an edge that loops back to a target left of its source", () => {
    const [, labelX, labelY] = getStepPath({
      ...fromService,
      targetX: -200,
      targetY: 150,
    });

    expect(labelX).toBeLessThan(0);
    expect(labelY).not.toBe(150);
  });
});
