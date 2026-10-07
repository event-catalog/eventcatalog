import type { Node, XYPosition } from '@xyflow/react';
import { fitGroup, getAbsolutePosition, GROUP_PADDING, sizeOf } from './grouping';

/**
 * Where agents put what they add without a position, the way an architect would: next to what it connects to,
 * following the flow left to right (what sends to it on its left, what it sends to on its right), lined up with
 * it, and stacked around it when several things connect to the same node. Nothing already on the canvas moves.
 * Things connected to nothing go in a row below what's there. Containers are filled first, so what goes around them
 * leaves room for what they grow to hold.
 */

/** A connection between two nodes, from the one that sends to the one that receives */
export type Link = { source: string; target: string };

/** Between connected nodes side by side (room for the labels on their connections), and nodes stacked in a column */
const GAP = { x: 200, y: 80 };
/** The least room left around nodes */
const CLEARANCE = { x: 120, y: 60 };
/** Between what's on the canvas and things connected to nothing added below it */
const BELOW_GAP = 120;
/** Things connected to nothing go side by side (so connecting them later is easy), this many to a row */
const ROW_LENGTH = 4;
/** How far to look for free space before giving up and going below everything */
const MAX_ROWS = 12;
const MAX_COLUMNS = 8;

type Rect = { x: number; y: number; width: number; height: number };
type Anchor = { rect: Rect; centerY: number; upstream: boolean };

const rectOf = (node: Node): Rect => ({ ...node.position, ...sizeOf(node) });

const tooClose = (a: Rect, b: Rect) =>
  a.x < b.x + b.width + CLEARANCE.x &&
  b.x < a.x + a.width + CLEARANCE.x &&
  a.y < b.y + b.height + CLEARANCE.y &&
  b.y < a.y + a.height + CLEARANCE.y;

const below = (rects: Rect[]): XYPosition => ({
  x: Math.min(...rects.map((rect) => rect.x)),
  y: Math.max(...rects.map((rect) => rect.y + rect.height)) + BELOW_GAP,
});

/** 0, 1, -1, 2, -2, …: rows below and above in turn, so things stacked around a node stay centred on it */
const rowOffset = (row: number) => (row % 2 ? (row + 1) / 2 : -row / 2);

/**
 * Where the nodes to place go on the canvas (not relative to their containers: containers that grow to fit them
 * move what's in them, but nothing moves on the canvas). They're among `nodes`, with their containers set.
 * Everything else in `nodes` stays where it is.
 */
export const placeNodes = (nodes: Node[], toPlace: string[], links: Link[]): Map<string, XYPosition> => {
  const working = new Map(nodes.map((node) => [node.id, node]));
  const remaining = new Set(toPlace.filter((id) => working.has(id)));

  const neighbours = new Map<string, { id: string; upstream: boolean }[]>();
  const addNeighbour = (id: string, neighbour: { id: string; upstream: boolean }) =>
    neighbours.set(id, [...(neighbours.get(id) ?? []), neighbour]);
  for (const { source, target } of links) {
    addNeighbour(source, { id: target, upstream: false });
    addNeighbour(target, { id: source, upstream: true });
  }

  const depthOf = (id: string | undefined): number => {
    const node = id ? working.get(id) : undefined;
    return node ? 1 + depthOf(node.parentId) : 0;
  };

  /** The node, or the container it's in, that sits directly in a level (undefined for the canvas itself) */
  const atLevel = (id: string, level: string | undefined) => {
    let node = working.get(id);
    while (node && node.parentId !== level) node = node.parentId ? working.get(node.parentId) : undefined;
    return node;
  };

  /** The containers things are put in grow to fit them (innermost first), as they will on the canvas */
  const growing = new Set<string>();
  for (const id of remaining) {
    for (let parentId = working.get(id)!.parentId; parentId; parentId = working.get(parentId)?.parentId) growing.add(parentId);
  }
  const fitContainers = () => {
    const containers = [...growing].filter((id) => working.has(id)).sort((a, b) => depthOf(b) - depthOf(a));
    for (const id of containers) {
      const fit = fitGroup(
        id,
        [...working.values()].filter((node) => node.parentId !== id || !remaining.has(node.id))
      );
      if (!fit) continue;
      const container = working.get(id)!;
      // Growing up or left: what's in it moves the other way, so nothing moves on the canvas
      if (fit.shift.x || fit.shift.y) {
        for (const child of working.values()) {
          if (child.parentId !== id) continue;
          working.set(child.id, {
            ...child,
            position: { x: child.position.x + fit.shift.x, y: child.position.y + fit.shift.y },
          });
        }
      }
      working.set(id, {
        ...container,
        position: { x: container.position.x - fit.shift.x, y: container.position.y - fit.shift.y },
        width: fit.width,
        height: fit.height,
      });
    }
  };

  // Innermost containers first, then outwards to the canvas
  const levels = [...new Set([...remaining].map((id) => working.get(id)!.parentId))].sort((a, b) => depthOf(b) - depthOf(a));

  for (const level of levels) {
    fitContainers();
    const parent = level ? working.get(level) : undefined;
    const origin = parent ? getAbsolutePosition(parent, working) : { x: 0, y: 0 };
    // Inside a container: clear of its header, so it grows down rather than up
    const start = parent ? { x: GROUP_PADDING.left, y: GROUP_PADDING.top } : { x: 0, y: 0 };
    const todo = [...remaining].filter((id) => working.get(id)!.parentId === level);
    // Things connected to nothing: a row below what was there, each to the right of what's been placed so far
    let row: { y: number; length: number } | undefined;
    const placedHere: Rect[] = [];
    const obstacles = () =>
      [...working.values()].filter((node) => node.parentId === level && !remaining.has(node.id)).map(rectOf);

    /** What a node connects to that's already placed: the node itself, or the container it's in, at this level */
    const anchorsOf = (id: string): Anchor[] =>
      (neighbours.get(id) ?? []).flatMap(({ id: other, upstream }) => {
        const shown = atLevel(other, level);
        if (!shown || shown.id === id || remaining.has(shown.id)) return [];
        const node = working.get(other)!;
        // Lined up with the node itself, even when it's inside a container
        const centerY = getAbsolutePosition(node, working).y + sizeOf(node).height / 2 - origin.y;
        return [{ rect: rectOf(shown), centerY, upstream }];
      });

    /** Nothing placed to start from: the first one with nothing sending to it, so the flow grows left to right */
    const startOf = (ids: string[]) =>
      ids.find(
        (id) =>
          !(neighbours.get(id) ?? []).some(({ id: other, upstream }) => {
            const shown = atLevel(other, level);
            return upstream && shown && shown.id !== id && ids.includes(shown.id);
          })
      ) ?? ids[0];

    const findSpot = (from: XYPosition, size: { width: number; height: number }, direction: 1 | -1): XYPosition => {
      const rects = obstacles();
      for (let column = 0; column < MAX_COLUMNS; column++) {
        const x = from.x + direction * column * (size.width + GAP.x);
        for (let row = 0; row < MAX_ROWS * 2; row++) {
          const spot = { x, y: from.y + rowOffset(row) * (size.height + GAP.y) };
          if (parent && spot.y < GROUP_PADDING.top) continue;
          if (!rects.some((rect) => tooClose({ ...spot, ...size }, rect))) return spot;
        }
      }
      return rects.length ? below(rects) : start;
    };

    while (todo.length > 0) {
      const candidates = todo.map((id) => ({ id, anchors: anchorsOf(id) }));
      const connected = candidates.reduce((best, candidate) =>
        candidate.anchors.length > best.anchors.length ? candidate : best
      );
      const { id, anchors } = connected.anchors.length > 0 ? connected : { id: startOf(todo), anchors: [] };
      const node = working.get(id)!;
      const size = sizeOf(node);

      let spot: XYPosition;
      if (anchors.length > 0) {
        const upstream = anchors.filter((anchor) => anchor.upstream);
        const downstream = anchors.filter((anchor) => !anchor.upstream);
        const x = upstream.length
          ? Math.max(...upstream.map(({ rect }) => rect.x + rect.width)) + GAP.x
          : Math.min(...downstream.map(({ rect }) => rect.x)) - GAP.x - size.width;
        const centerY = anchors.reduce((sum, anchor) => sum + anchor.centerY, 0) / anchors.length;
        spot = findSpot({ x, y: centerY - size.height / 2 }, size, upstream.length ? 1 : -1);
      } else {
        const rects = obstacles();
        if (!row || row.length === ROW_LENGTH) {
          spot = findSpot(rects.length ? below(rects) : start, size, 1);
          row = { y: spot.y, length: 1 };
        } else {
          spot = findSpot({ x: Math.max(...placedHere.map((rect) => rect.x + rect.width)) + GAP.x, y: row.y }, size, 1);
          row.length++;
        }
      }

      const position = { x: Math.round(spot.x), y: Math.round(spot.y) };
      working.set(id, { ...node, position });
      placedHere.push({ ...position, ...size });
      remaining.delete(id);
      todo.splice(todo.indexOf(id), 1);
    }
  }

  fitContainers();
  return new Map(toPlace.filter((id) => working.has(id)).map((id) => [id, getAbsolutePosition(working.get(id)!, working)]));
};
