import type { ResolvedEdge, ResolvedGraph } from '@eventcatalog/sdk';
import type { DiffEdge, EdgeEnd } from './types';
import { indexEntities } from './utils/entities';
import type { EntityIndex } from './utils/entities';

export type EdgeDiff = {
  added: DiffEdge[];
  removed: DiffEdge[];
};

/**
 * Compares the resolved edges of two graphs, across every direction the SDK
 * resolves (sends, receives, writesTo, readsFrom, contains, references, appliesTo,
 * relatesTo).
 *
 * Edge identity is direction + via + from id + to id. Versions are deliberately
 * left out: they are already resolved, and including them would report a removed
 * and an added edge every time a message is bumped, drowning the real changes.
 * The versions shown on an edge are the ones from the side it came from.
 *
 * Resolution matters, though. When a message is deleted but a service still
 * points at it, the SDK keeps the edge and marks it unresolved. That edge has
 * effectively been removed, and is reported as such. The reverse, a dangling
 * pointer that now resolves because the target was documented, is an added edge.
 */
export const diffEdges = (a: ResolvedGraph, b: ResolvedGraph): EdgeDiff => {
  const before = byIdentity(a);
  const after = byIdentity(b);
  const entitiesA = indexEntities(a);
  const entitiesB = indexEntities(b);
  const added: DiffEdge[] = [];
  const removed: DiffEdge[] = [];

  for (const key of new Set([...before.keys(), ...after.keys()])) {
    const edgeA = before.get(key);
    const edgeB = after.get(key);

    if (!edgeA) added.push(toDiffEdge(entitiesB, edgeB!));
    else if (!edgeB) removed.push(toDiffEdge(entitiesA, edgeA));
    else if (isResolved(edgeA) && !isResolved(edgeB)) removed.push(toDiffEdge(entitiesA, edgeA));
    else if (!isResolved(edgeA) && isResolved(edgeB)) added.push(toDiffEdge(entitiesB, edgeB));
  }

  return { added: sort(added), removed: sort(removed) };
};

const identity = (edge: ResolvedEdge) => `${edge.direction}|${edge.via ?? ''}|${edge.from}|${edge.to}`;

const isResolved = (edge: ResolvedEdge) => edge.status === 'resolved';

const byIdentity = (graph: ResolvedGraph) => {
  const map = new Map<string, ResolvedEdge>();
  for (const edge of graph.edges) {
    // Several versions of the same service can carry the same edge; a resolved one wins.
    const existing = map.get(identity(edge));
    if (!existing || (!isResolved(existing) && isResolved(edge))) map.set(identity(edge), edge);
  }
  return map;
};

const toDiffEdge = (entities: EntityIndex, edge: ResolvedEdge): DiffEdge => ({
  direction: edge.direction,
  from: end(entities, edge.from, edge.fromVersion),
  to: end(entities, edge.to, edge.resolved),
  ...(edge.via !== undefined ? { via: edge.via } : {}),
});

const end = (entities: EntityIndex, id: string, version: string | null): EdgeEnd => {
  const entity = entities.find(id, version);
  return {
    ...(entity ? { type: entity.type } : {}),
    id,
    ...(version !== null ? { version } : {}),
  };
};

const sort = (edges: DiffEdge[]) =>
  [...edges].sort(
    (left, right) =>
      left.direction.localeCompare(right.direction) ||
      left.from.id.localeCompare(right.from.id) ||
      left.to.id.localeCompare(right.to.id) ||
      (left.via ?? '').localeCompare(right.via ?? '')
  );
