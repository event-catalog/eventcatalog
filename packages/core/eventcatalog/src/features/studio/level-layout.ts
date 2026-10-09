import type { Edge, Node } from '@xyflow/react';
import { getNodeSize as getLayoutSize } from '@eventcatalog/visualiser/layout';
import type { LevelPlace } from './canvas-doc';
import { fitGroup, getAbsolutePosition } from './grouping';
import { getNodeSize, isGroupType } from './node-types';
import { placeNodes } from './placement';

/**
 * L1 and L2 as people arrange them. A level's content comes from the canvas (see levels.ts), but where things are on
 * it is its own: each level keeps a layout (a LevelPlace per node, in the canvas), so things stay where they're put.
 * Nothing on a level moves when something's added: new things are placed next to what they connect to (like agents
 * place what they add) and containers grow to fit.
 */

type Graph = { nodes: Node[]; edges: Edge[] };

/** A container's size: as it's being worked on (width and height), or as laid out (levels size containers with style) */
const containerSize = (node: Node) => {
  if (node.width && node.height) return { width: node.width, height: node.height };
  const { width, height } = node.style ?? {};
  return typeof width === 'number' && typeof height === 'number' ? { width, height } : undefined;
};

/** The size the visualiser's layout gives a container with nothing in it (levels leave containers' size to it) */
const emptyContainerSize = ({ type }: Pick<Node, 'type'>) => getLayoutSize({ id: '', type, position: { x: 0, y: 0 }, data: {} });

/**
 * The size something new of a type is shown at on L1 or L2: L1 shows domains and systems with nothing in them as
 * cards, L2 as empty containers
 */
export const getLevelNodeSize = (type: string | undefined, level: 1 | 2) => {
  if (!isGroupType(type)) return getNodeSize(type);
  return level === 1 ? getNodeSize() : emptyContainerSize({ type });
};

/** Where a node is on a level, and a container's size */
const placeOf = (node: Node): LevelPlace => ({
  x: node.position.x,
  y: node.position.y,
  ...(isGroupType(node.type) && containerSize(node)),
});

/** A level's nodes where they are, by id (not its notes, which are kept on the canvas): what its layout keeps */
export const levelPlaces = (nodes: Node[]) =>
  new Map(nodes.filter((node) => node.type !== 'note').map((node) => [node.id, placeOf(node)]));

/**
 * A level arranged: each node where the level's layout has it, else where the diagram the canvas was opened from had
 * it (`fallback`), and anything with neither placed next to what it connects to. Containers grow to fit what's in
 * them. `placed` is where things the layout didn't have were put, and containers that grew (to keep, so they stay
 * there). Undefined when nothing on the level has a place yet: it's laid out from scratch then.
 */
export const arrangeLevel = (
  graph: Graph,
  layout: ReadonlyMap<string, LevelPlace>,
  fallback: ReadonlyMap<string, LevelPlace> = new Map()
): { graph: Graph; placed: Map<string, LevelPlace> } | undefined => {
  const known = (id: string) => layout.get(id) ?? fallback.get(id);
  if (!graph.nodes.some((node) => known(node.id))) return undefined;

  const placed = new Map<string, LevelPlace>();
  // Containers carry their size as width and height while they're worked on (what placement and fitting read)
  let nodes: Node[] = graph.nodes.map((node) => {
    const place = known(node.id);
    const size = isGroupType(node.type)
      ? place?.width && place.height
        ? { width: place.width, height: place.height }
        : (containerSize(node) ?? emptyContainerSize(node))
      : undefined;
    return { ...node, position: place ? { x: place.x, y: place.y } : { x: 0, y: 0 }, ...size };
  });

  // Anything new, next to what it connects to (on the level), moving nothing that's there
  const toPlace = nodes.filter((node) => !known(node.id)).map((node) => node.id);
  if (toPlace.length) {
    const positions = placeNodes(nodes, toPlace, graph.edges);
    const lookup = new Map(nodes.map((node) => [node.id, node]));
    nodes = nodes.map((node) => {
      const at = positions.get(node.id);
      if (!at) return node;
      const parent = node.parentId ? lookup.get(node.parentId) : undefined;
      const origin = parent ? getAbsolutePosition(parent, lookup) : { x: 0, y: 0 };
      const moved = { ...node, position: { x: at.x - origin.x, y: at.y - origin.y } };
      placed.set(node.id, placeOf(moved));
      return moved;
    });
  }

  // Containers grow to fit what's in them (the innermost first), moving nothing on the level
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const depth = (node: Node): number => {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    return parent ? 1 + depth(parent) : 0;
  };
  const containers = nodes.filter((node) => isGroupType(node.type)).sort((a, b) => depth(b) - depth(a));
  for (const { id } of containers) {
    const fit = fitGroup(id, nodes);
    const current = nodes.find((node) => node.id === id)!;
    const { x: dx, y: dy } = fit?.shift ?? { x: 0, y: 0 };
    if (!fit || (!dx && !dy && fit.width === current.width && fit.height === current.height)) continue;
    nodes = nodes.map((node) => {
      if (node.parentId === id && (dx || dy)) {
        const shifted = { ...node, position: { x: node.position.x + dx, y: node.position.y + dy } };
        placed.set(node.id, placeOf(shifted));
        return shifted;
      }
      if (node.id !== id) return node;
      const grown = {
        ...node,
        position: { x: node.position.x - dx, y: node.position.y - dy },
        width: fit.width,
        height: fit.height,
      };
      placed.set(id, placeOf(grown));
      return grown;
    });
  }

  return {
    graph: {
      edges: graph.edges,
      // Containers drawn at their size with style, like levels laid out from scratch
      nodes: nodes.map(({ width, height, ...node }) =>
        isGroupType(node.type) && width && height ? { ...node, style: { ...node.style, width, height } } : node
      ),
    },
    placed,
  };
};

/**
 * A level's edges drawn along the routes the diagram the canvas was opened from had for the same connections (between
 * the same two nodes), once the level's worked out from the canvas: routes follow their nodes when they move, so
 * connections the diagram had stay drawn around what's in their way
 */
export const withDiagramRoutes = (edges: Edge[], diagramEdges: Edge[] = []) => {
  const routes = new Map(
    diagramEdges.flatMap((edge) => (edge.data?.route ? [[`${edge.source}>${edge.target}`, edge.data.route] as const] : []))
  );
  if (routes.size === 0) return edges;
  return edges.map((edge) => {
    const route = routes.get(`${edge.source}>${edge.target}`);
    return route && !edge.data?.route ? { ...edge, data: { ...edge.data, route } } : edge;
  });
};
