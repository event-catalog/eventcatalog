/**
 * The agent's changes to the diagram (edit_diagram), written into the canvas's document: from the canvas the
 * changed model should give (modelToCanvas, laid out from where things are now), only what's different is written.
 * Resources and connections added, changed and removed, and hotspots added and removed; notes and text are left as
 * they are (the view adds the agent's), but for those about a resource removed (they go with it, as in the model),
 * and comments are left as they are. What's kept stays where it is, unless it moved into another container; containers grow
 * around what's new in them.
 */
import type * as Y from 'yjs';
import type { Edge, Node } from '@xyflow/react';
import { deleteNodes, fitContainersAround, getCanvasMaps, isGroupType, isWrittenOnCanvas, modelToCanvas, resourceTypeOf, toSharedNode, type Hotspot, type RenderedSizes } from '@eventcatalog/visualiser/studio';
import type { Model } from '@eventcatalog/visualiser/model';

/**
 * What the canvas should have: the changed model on the canvas (modelToCanvas), and which resources the changes
 * touched (changedResources: nodes are compared through the model, as the canvas fills in what the model leaves out)
 */
export type AgentCanvas = { nodes: Node[]; edges: Edge[]; hotspots?: Hotspot[]; changed: ReadonlySet<string> };

/**
 * What was on the canvas when the agent's edit began (canvasIds): only that can be taken off by it, and what of it
 * is gone by the time it's written isn't put back. Laying the edit out takes a moment: what people (or a live
 * session) add meanwhile isn't in it, but stays, and what they delete meanwhile is still in it, but stays deleted
 */
export type CanvasIds = { nodes: ReadonlySet<string>; edges: ReadonlySet<string>; hotspots: ReadonlySet<string> };

/** What's on the canvas now, from its document */
export function canvasIds(doc: Y.Doc): CanvasIds {
  const { nodes, edges, hotspots } = getCanvasMaps(doc);
  return { nodes: new Set(nodes.keys()), edges: new Set(edges.keys()), hotspots: new Set(hotspots.keys()) };
}

/**
 * The canvas a changed model should give, from the model as the canvas has it now (`current`, with where things
 * are) and after the agent's changes (`next`). What moved into another container (or out of one) is placed again:
 * where it was is relative to the container it was in
 */
export async function agentCanvasFor(current: Model, next: Model): Promise<AgentCanvas> {
  const parents = new Map(current.resources.map((resource) => [resource.id, resource.parent]));
  const moved = new Set(next.resources.filter((resource) => parents.has(resource.id) && parents.get(resource.id) !== resource.parent).map((resource) => resource.id));
  const places = next.layout?.messages;
  const placed =
    moved.size && places
      ? { ...next, layout: { ...next.layout, messages: Object.fromEntries(Object.entries(places).filter(([id]) => !moved.has(id))) } }
      : next;
  return { ...(await modelToCanvas(placed)), changed: changedResources(current, next) };
}

/** The resources whose fields differ between two models */
export function changedResources(before: Model, after: Model) {
  const was = new Map(before.resources.map((resource) => [resource.id, JSON.stringify(resource)]));
  return new Set(after.resources.filter((resource) => was.has(resource.id) && was.get(resource.id) !== JSON.stringify(resource)).map((resource) => resource.id));
}

const isResource = (node: Node) => resourceTypeOf(node.type) !== undefined;
// What a new container starts at before it's fitted to what's in it: its header and padding
const NEW_CONTAINER = { width: 200, height: 140 };
// Where an edge is drawn (its route) is the canvas's own, not something the agent changes
const withoutRoute = (edge: Edge) => JSON.stringify({ ...edge, data: { ...edge.data, route: undefined } });

/**
 * Writes the differences (call it inside one transaction), taking off only what was there when the edit began
 * (`before`). Returns the resources added, changed and removed
 */
export function applyAgentCanvasToDoc(doc: Y.Doc, target: AgentCanvas, before: CanvasIds, sizes?: RenderedSizes) {
  const { nodes, edges, hotspots } = getCanvasMaps(doc);
  const wanted = new Map(target.nodes.filter(isResource).map((node) => [node.id, node]));
  const added: string[] = [];
  const changed: string[] = [];

  // Containers before what's in them (the target's order), and kept and new before any goes, so nothing kept is
  // taken away with a container that's removed
  for (const [id, node] of wanted) {
    const current = nodes.get(id);
    if (!current) {
      // Deleted by someone else since the edit began
      if (before.nodes.has(id)) continue;
      // (in a container someone else deleted meanwhile: where it'd be in it is on the canvas, out of it)
      const parentId = node.parentId && nodes.has(node.parentId) ? node.parentId : undefined;
      nodes.set(id, toSharedNode({ ...node, parentId }));
      added.push(id);
      continue;
    }
    const moved = (current.parentId ?? undefined) !== (node.parentId ?? undefined);
    if (!moved && !target.changed.has(id)) continue;
    // A changed resource's node shows it as it is now, fields taken off it included
    const data = target.changed.has(id) ? node.data : current.data;
    const { parentId: _, ...rest } = current;
    const parentId = moved ? node.parentId : current.parentId;
    nodes.set(id, { ...rest, type: node.type, data, ...(moved && { position: node.position }), ...(parentId && { parentId }) });
    changed.push(id);
  }
  const removed = [...nodes.values()].filter((node) => isResource(node) && !wanted.has(node.id) && before.nodes.has(node.id)).map((node) => node.id);
  // With the notes about them (remove_resource takes those off the model too)
  const gone = new Set(removed);
  const notes = [...nodes.values()].filter((node) => isWrittenOnCanvas(node.type) && gone.has(node.data?.resource as string)).map((node) => node.id);
  if (removed.length) deleteNodes(doc, [...removed, ...notes]);

  const wantedEdges = new Map(target.edges.map((edge) => [edge.id, edge]));
  wantedEdges.forEach((edge, id) => {
    const current = edges.get(id);
    // Deleted by someone else since the edit began, or between things that were
    if (!current && (before.edges.has(id) || !nodes.has(edge.source) || !nodes.has(edge.target))) return;
    const next = current ? { ...current, ...edge, data: { ...current.data, ...edge.data } } : edge;
    if (!current || withoutRoute(next) !== withoutRoute(current)) edges.set(id, next);
  });
  edges.forEach((_, id) => !wantedEdges.has(id) && before.edges.has(id) && edges.delete(id));

  const wantedHotspots = new Map((target.hotspots ?? []).map((hotspot) => [hotspot.id, hotspot]));
  wantedHotspots.forEach((hotspot, id) => !hotspots.has(id) && !before.hotspots.has(id) && hotspots.set(id, hotspot));
  hotspots.forEach((_, id) => !wantedHotspots.has(id) && before.hotspots.has(id) && hotspots.delete(id));

  // A new container fits what's put in it (containers only grow when fitted: from their default size, a new domain
  // with one service in it was a big, mostly empty box)
  for (const id of added) {
    const node = nodes.get(id);
    if (node && isGroupType(node.type) && [...nodes.values()].some((child) => child.parentId === id))
      nodes.set(id, { ...node, width: NEW_CONTAINER.width, height: NEW_CONTAINER.height });
  }
  [...added, ...changed].forEach((id) => nodes.get(id)?.parentId && fitContainersAround(doc, id, sizes));
  return { added, changed, removed };
}
