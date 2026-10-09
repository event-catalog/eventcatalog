import type { Edge, Node } from '@xyflow/react';
import type { VisualiserSnapshot } from '@eventcatalog/visualiser';
import { getNodeCatalogResource } from '@utils/node-graphs/node-resource';
import type { DiagramLevelsSpec, NewCanvasEdges, NodeSpecs } from './canvas-actions';
import { DEFAULT_NODE_SIZE, isCatalogCollection, isGroupType } from './node-types';

/**
 * A canvas started from a diagram (the visualiser's "Open in Studio"): the catalog resources and actors it shows,
 * where they are on it (the same top-left corners), in the domains and systems they're shown in, and the
 * connections between them, drawn along the same routes. Other nodes (e.g. flow steps, users, entities) are left
 * out, with their connections. Its levels 1 and 2 come as the diagram shows them, for Studio to show them the same.
 */

// Actors (people and roles) aren't catalog resources: they go on the canvas as Studio's actors, by the name shown
const ACTOR_TYPES = new Set(['context-actor', 'actor']);
const actorNameOf = (node: VisualiserSnapshot['nodes'][number]) =>
  node.type && ACTOR_TYPES.has(node.type) && typeof node.data.name === 'string' ? node.data.name : undefined;

export const canvasFromVisualiser = (
  snapshot: VisualiserSnapshot
): { nodes: NodeSpecs; edges: NewCanvasEdges; levels: DiagramLevelsSpec } => {
  const byId = new Map(snapshot.nodes.map((node) => [node.id, node]));
  const depthOf = (node: VisualiserSnapshot['nodes'][number]): number => {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    return parent ? 1 + depthOf(parent) : 0;
  };

  const containers = new Set<string>();
  const parentOf = new Map<string, string>();
  const nodes = [...snapshot.nodes]
    // Containers before what's in them (specs refer to containers given before them)
    .sort((a, b) => depthOf(a) - depthOf(b))
    .flatMap((node) => {
      const resource = getNodeCatalogResource(node);
      const fromCatalog =
        resource && isCatalogCollection(resource.collection) ? { collection: resource.collection, id: resource.id } : undefined;
      const actorName = actorNameOf(node);
      if (!fromCatalog && !actorName) return [];
      // Domains and systems shown as boxes are containers on the canvas
      const container = isGroupType(node.type);
      // In the innermost container shown that's on the canvas
      let inside: string | undefined;
      for (let parent = node.parentId; parent && !inside; parent = byId.get(parent)?.parentId) {
        if (containers.has(parent)) inside = parent;
      }
      if (container) containers.add(node.id);
      if (inside) parentOf.set(node.id, inside);
      // Where it is: its top-left corner, as cards are put by their centre at the size they're created at (and
      // render at the size they need from there), and containers at their size
      const left = node.center.x - node.width / 2;
      const top = node.center.y - node.height / 2;
      return [
        {
          ref: node.id,
          ...(fromCatalog ? { resource: fromCatalog } : { type: 'actor', name: actorName }),
          ...(container
            ? { x: node.center.x, y: node.center.y, container: true, width: node.width, height: node.height }
            : { x: left + DEFAULT_NODE_SIZE.width / 2, y: top + DEFAULT_NODE_SIZE.height / 2 }),
          ...(inside && { inside }),
        },
      ];
    });

  // Connections between nodes on the canvas, not between a container and what's in it (it holds it instead)
  const onCanvas = new Set(nodes.map((node) => node.ref));
  const isInside = (nodeId: string, containerId: string) => {
    for (let parent = parentOf.get(nodeId); parent; parent = parentOf.get(parent)) if (parent === containerId) return true;
    return false;
  };
  const edges = snapshot.edges
    .filter(({ source, target }) => onCanvas.has(source) && onCanvas.has(target) && source !== target)
    .filter(({ source, target }) => !isInside(source, target) && !isInside(target, source))
    .map(({ source, target, label, route }) => ({ from: source, to: target, ...(label && { label }), ...(route && { route }) }));

  const levels = {
    ...(snapshot.levels[1] && { 1: levelFromVisualiser(snapshot.levels[1], nodes) }),
    ...(snapshot.levels[2] && { 2: levelFromVisualiser(snapshot.levels[2], nodes) }),
    ...(Object.keys(snapshot.unavailableLevels).length > 0 && { unavailable: snapshot.unavailableLevels }),
  };
  return { nodes, edges, levels };
};

const sameResource = (a?: { collection: string; id: string }, b?: { collection: string; id: string }) =>
  !!a && !!b && a.collection === b.collection && a.id === b.id;
const sizeOf = (node: Node) => ({
  width: typeof node.style?.width === 'number' ? node.style.width : (node.width ?? node.measured?.width),
  height: typeof node.style?.height === 'number' ? node.style.height : (node.height ?? node.measured?.height),
});

/**
 * One of the diagram's levels, as it shows it: each node stands for the canvas node with the same id (on level 3),
 * or the same catalog resource (e.g. a system shown as a card on level 1 and as a container on level 3), so moving
 * between levels glides from one to the other. Nodes only on the level keep their own id.
 */
const levelFromVisualiser = (level: { nodes: Node[]; edges: Edge[] }, specs: NodeSpecs) => {
  const used = new Set<string>();
  const refs = new Map<string, string>();
  for (const node of level.nodes) {
    const resource = getNodeCatalogResource(node);
    const ref = [
      specs.find((spec) => spec.ref === node.id)?.ref,
      specs.find((spec) => sameResource(spec.resource, resource))?.ref,
    ].find((candidate) => candidate && !used.has(candidate));
    refs.set(node.id, ref ?? node.id);
    used.add(ref ?? node.id);
  }
  return {
    nodes: level.nodes.map((node) => {
      const { width, height } = sizeOf(node);
      // The diagram marks the resource whose page it's on ("Viewing"): a canvas isn't on one
      const { isFocused: _, ...data } = node.data as Record<string, unknown>;
      return {
        ref: refs.get(node.id)!,
        type: node.type ?? 'default',
        data,
        ...(node.parentId && refs.has(node.parentId) && { parent: refs.get(node.parentId) }),
        x: node.position.x,
        y: node.position.y,
        ...(isGroupType(node.type) && width && height && { width, height }),
      };
    }),
    edges: level.edges.flatMap((edge) => {
      const [from, to] = [refs.get(edge.source), refs.get(edge.target)];
      if (!from || !to) return [];
      return [
        {
          from,
          to,
          ...(typeof edge.label === 'string' && { label: edge.label }),
          ...(edge.type && { type: edge.type }),
          ...(edge.style && { style: edge.style as Record<string, unknown> }),
          ...(edge.markerEnd && { markerEnd: edge.markerEnd }),
          ...(edge.data && { data: edge.data }),
        },
      ];
    }),
  };
};
