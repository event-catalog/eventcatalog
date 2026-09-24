import { useCallback } from "react";
import { useStore, type ReactFlowState } from "@xyflow/react";
import type { EdgeRoute } from "../utils/elk-layout";

type Point = { x: number; y: number };
type Route = EdgeRoute;

// How far an edge's end can be from its handle before the route no longer
// fits (nodes render a little wider or narrower than the layout estimated).
// Vertically, edges can start or end anywhere along a node's side (the layout
// spreads them out), so that allows for tall nodes and groups.
const ROUTE_TOLERANCE = { x: 60, y: 400 };

const isStraight = (a: Point, b: Point) => a.x === b.x || a.y === b.y;
const add = (a: Point, b: Point) => ({ x: a.x + b.x, y: a.y + b.y });
const NOT_MOVED = { x: 0, y: 0 };

/**
 * SVG path along a laid out route (at right angles), and where its label goes.
 * Its ends are moved onto the sides of the edge's source and target (they
 * render a little wider or narrower than the layout estimated), and with them
 * when they've moved since they were laid out (e.g. dragged): the segments at
 * the ends stay flat, and the whole route moves when both nodes move together.
 * Undefined when the ends are too far from the route to use it.
 */
export const getRoutePath = (
  route: Route,
  source: Point,
  target: Point,
  {
    // Ends at a specific handle (e.g. a service listed in a domain) go exactly
    // to it, rather than where the layout spread them along the node's side
    toSourceHandle = false,
    toTargetHandle = false,
    // How far the source and target have moved since they were laid out
    sourceMoved = NOT_MOVED,
    targetMoved = NOT_MOVED,
  }: {
    toSourceHandle?: boolean;
    toTargetHandle?: boolean;
    sourceMoved?: Point;
    targetMoved?: Point;
  } = {},
) => {
  const { points } = route;
  if (points.length < 2) return undefined;
  const last = points.length - 1;
  const start = add(points[0], sourceMoved);
  const end = add(points[last], targetMoved);
  const fits = (a: Point, b: Point) =>
    Math.abs(a.x - b.x) <= ROUTE_TOLERANCE.x &&
    Math.abs(a.y - b.y) <= ROUTE_TOLERANCE.y;
  if (!fits(start, source) || !fits(end, target)) return undefined;

  const movedTogether =
    Math.abs(sourceMoved.x - targetMoved.x) < 1 &&
    Math.abs(sourceMoved.y - targetMoved.y) < 1;
  const moved = points.map((point) =>
    movedTogether ? add(point, sourceMoved) : { ...point },
  );
  // Keep where the layout spread the ends along each side, just on the sides
  moved[0] = { x: source.x, y: toSourceHandle ? source.y : start.y };
  moved[last] = { x: target.x, y: toTargetHandle ? target.y : end.y };
  // Keep the first and last segments flat as their ends move
  if (last > 1 && points[1].y === points[0].y) moved[1].y = moved[0].y;
  if (last > 1 && points[last - 1].y === points[last].y)
    moved[last - 1].y = moved[last].y;

  // Anything no longer at right angles gets a step in the middle
  const path = [moved[0]];
  moved.slice(1).forEach((point) => {
    const previous = path[path.length - 1];
    if (!isStraight(previous, point)) {
      const middleX = (previous.x + point.x) / 2;
      path.push({ x: middleX, y: previous.y }, { x: middleX, y: point.y });
    }
    path.push(point);
  });

  return {
    path: path
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" "),
    label: route.label && moveLabel(route.label, points, moved),
  };
};

/** Moves a label with the segment of the route it sits on */
const moveLabel = (label: Point, points: Point[], moved: Point[]) => {
  const distance = (index: number) => {
    const [a, b] = [points[index], points[index + 1]];
    const x = Math.min(
      Math.max(label.x, Math.min(a.x, b.x)),
      Math.max(a.x, b.x),
    );
    const y = Math.min(
      Math.max(label.y, Math.min(a.y, b.y)),
      Math.max(a.y, b.y),
    );
    return Math.hypot(label.x - x, label.y - y);
  };
  const segment = points
    .slice(1)
    .map((_, index) => index)
    .reduce((nearest, index) =>
      distance(index) < distance(nearest) ? index : nearest,
    );
  const shift = (index: number) => ({
    x: moved[index].x - points[index].x,
    y: moved[index].y - points[index].y,
  });
  const [a, b] = [shift(segment), shift(segment + 1)];
  return { x: label.x + (a.x + b.x) / 2, y: label.y + (a.y + b.y) / 2 };
};

// How far a node has moved since it was laid out (top-left, in the flow)
const getMoved = (state: ReactFlowState, nodeId: string, at: Point) => {
  const position = state.nodeLookup.get(nodeId)?.internals.positionAbsolute;
  return position && { x: position.x - at.x, y: position.y - at.y };
};
type EdgeState = { moved?: [Point, Point]; zIndex: number };
const isSamePoint = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
const isSameEdgeState = (a: EdgeState, b: EdgeState) =>
  a.zIndex === b.zIndex &&
  (a.moved === b.moved ||
    (!!a.moved &&
      !!b.moved &&
      isSamePoint(a.moved[0], b.moved[0]) &&
      isSamePoint(a.moved[1], b.moved[1])));

/**
 * An edge's path, label position and layer: along the route the layout gave it
 * (`data.route`), following its nodes when they move (e.g. dragged or between
 * layouts), otherwise the fallback (e.g. a smooth step path) passed in. The
 * layer (z-index) is React Flow's for the edge: above the groups its nodes are
 * in and under the nodes, for its label to be drawn in too.
 */
export const useRoute = (
  {
    data,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourceHandleId,
    targetHandleId,
  }: {
    data?: object;
    source: string;
    target: string;
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    sourceHandleId?: string | null;
    targetHandleId?: string | null;
  },
  [path, labelX, labelY]: [string, number, number, ...unknown[]],
): [string, number, number, number] => {
  const route = (data as { route?: Route } | undefined)?.route;
  // One subscription per edge, as selectors run on every store update
  const { moved, zIndex } = useStore(
    useCallback(
      (state: ReactFlowState): EdgeState => {
        const z = (nodeId: string) => {
          const node = state.nodeLookup.get(nodeId);
          return node?.parentId ? node.internals.z : 0;
        };
        const zIndex = Math.max(z(source), z(target));
        if (!route?.source || !route.target) return { zIndex };
        const sourceMoved = getMoved(state, source, route.source);
        const targetMoved = getMoved(state, target, route.target);
        return {
          zIndex,
          moved:
            sourceMoved && targetMoved ? [sourceMoved, targetMoved] : undefined,
        };
      },
      [route, source, target],
    ),
    isSameEdgeState,
  );
  const routed =
    route &&
    moved &&
    getRoutePath(
      route,
      { x: sourceX, y: sourceY },
      { x: targetX, y: targetY },
      {
        toSourceHandle: !!sourceHandleId,
        toTargetHandle: !!targetHandleId,
        sourceMoved: moved[0],
        targetMoved: moved[1],
      },
    );
  if (!routed) return [path, labelX, labelY, zIndex];
  return [
    routed.path,
    routed.label?.x ?? labelX,
    routed.label?.y ?? labelY,
    zIndex,
  ];
};
