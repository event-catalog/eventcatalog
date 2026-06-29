import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import dagre from 'dagre';
import {
  createDagreGraph,
  calculatedNodes,
  createEdge,
  generateIdForNode,
  buildContextMenuForSystem,
  DEFAULT_NODE_HEIGHT,
} from '@utils/node-graphs/utils/utils';
import { MarkerType } from '@xyflow/react';
import { createVersionedMap, findInMap } from '@utils/collections/util';

type DagreGraph = any;

interface NodesAndEdgesProps {
  id: string;
  version: string;
  defaultFlow?: DagreGraph;
  mode?: 'simple' | 'full';
  layout?: boolean;
}

// System nodes are wider than the default to fit the system name + summary comfortably.
const SYSTEM_NODE_WIDTH = 270;
// Actor nodes are narrower than systems — a compact pill with an icon + name.
const ACTOR_NODE_WIDTH = 180;

type SystemActor = {
  id: string;
  name?: string;
  label?: string;
  direction?: 'inbound' | 'outbound';
};

interface ContextGraphFromSeedsProps {
  // The systems the breadth-first traversal starts from. The single-system context
  // diagram seeds with one system; the domain-level diagram seeds with every system
  // in the domain.
  seedSystems: CollectionEntry<'systems'>[];
  systemMap: Map<string, CollectionEntry<'systems'>[]>;
  serviceMap: Map<string, CollectionEntry<'services'>[]>;
  defaultFlow?: DagreGraph;
  mode?: 'simple' | 'full';
  layout?: boolean;
}

/**
 * Shared builder for the System Diagram.
 *
 * Starting from the given seed systems, we walk each system's `relationships` outward
 * (breadth-first) to the systems it relates to, then their relationships, and so on —
 * building the reachable neighbourhood. Each system becomes a node; each relationship
 * that has a `label` becomes a labelled edge (relationships without a label are
 * intentionally not drawn). Actors are rendered inline and deduped across all systems.
 */
const buildContextGraphFromSeeds = ({
  seedSystems,
  systemMap,
  serviceMap,
  defaultFlow,
  mode = 'simple',
  layout = true,
}: ContextGraphFromSeedsProps) => {
  const flow = defaultFlow || createDagreGraph({ ranksep: 280, nodesep: 80, edgesep: 50 });
  const nodes = new Map<string, any>();
  const edges = new Map<string, any>();

  // Total messages a system handles = the sum of sends + receives across all of
  // its services. Used for the "Messages" stat on the system node.
  const countMessagesForSystem = (system: CollectionEntry<'systems'>) => {
    return (system.data.services || []).reduce((total, ref) => {
      const service = findInMap(serviceMap, ref.id, ref.version);
      if (!service) return total;
      return total + (service.data.sends || []).length + (service.data.receives || []).length;
    }, 0);
  };

  // Actor node ids, tracked so they can be sized differently during layout.
  const actorNodeIds = new Set<string>();
  // System node ids, tracked so we can detect reciprocal system-to-system
  // relationships and collapse them into a single double-headed edge.
  const systemNodeIds = new Set<string>();

  // Add (or reuse) an actor node. Actors are inline and deduped by `actor:{id}`,
  // so the same actor referenced from multiple systems appears once.
  const addActorNode = (actor: SystemActor) => {
    const nodeId = `actor-${actor.id}`;
    if (nodes.has(nodeId)) return nodeId;

    actorNodeIds.add(nodeId);
    nodes.set(nodeId, {
      id: nodeId,
      type: 'context-actor',
      sourcePosition: 'right',
      targetPosition: 'left',
      data: {
        mode,
        name: actor.name || actor.id,
      },
      position: { x: 0, y: 0 },
    });

    return nodeId;
  };

  const addSystemNode = (system: CollectionEntry<'systems'>) => {
    const nodeId = generateIdForNode(system);
    systemNodeIds.add(nodeId);
    if (nodes.has(nodeId)) return nodeId;

    nodes.set(nodeId, {
      id: nodeId,
      type: 'systems',
      sourcePosition: 'right',
      targetPosition: 'left',
      data: {
        mode,
        system: { ...system.data },
        // Counts of what the system groups, shown as a stats row on the node.
        // The raw frontmatter arrays are pointer lists, so their length is the count.
        servicesCount: (system.data.services || []).length,
        entitiesCount: (system.data.entities || []).length,
        containersCount: (system.data.containers || []).length,
        messagesCount: countMessagesForSystem(system),
        contextMenu: buildContextMenuForSystem({ id: system.data.id, version: system.data.version }),
      },
      position: { x: 0, y: 0 },
    });

    return nodeId;
  };

  // Breadth-first traversal over the relationship graph, following each system's
  // `relationships` to other systems. We visit each system once.
  const visited = new Set<string>();
  const queue: CollectionEntry<'systems'>[] = [...seedSystems];

  while (queue.length > 0) {
    const system = queue.shift() as CollectionEntry<'systems'>;
    const sourceNodeId = generateIdForNode(system);

    if (visited.has(sourceNodeId)) continue;
    visited.add(sourceNodeId);

    addSystemNode(system);

    const relationships = (system.data.relationships || []) as { id: string; version?: string; label?: string }[];

    for (const relationship of relationships) {
      const target = findInMap(systemMap, relationship.id, relationship.version);
      // Skip dangling targets — degrade gracefully like the other pointer types.
      if (!target) continue;

      const targetNodeId = addSystemNode(target);

      // Only draw an edge when the relationship declares a label. A relationship without a
      // label still pulls the target system into the diagram, but has no edge drawn.
      if (relationship.label) {
        const edgeId = `${sourceNodeId}-${targetNodeId}`;
        edges.set(
          edgeId,
          createEdge({
            id: edgeId,
            source: sourceNodeId,
            target: targetNodeId,
            label: relationship.label,
            type: 'straight',
            markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
          })
        );
      }

      if (!visited.has(targetNodeId)) {
        queue.push(target);
      }
    }

    // Actors that interact with this system. Each becomes an actor node with an
    // edge whose direction depends on `direction` (inbound = actor -> system,
    // outbound = system -> actor). Actors don't pull other systems into the graph.
    const actors = (system.data.actors || []) as SystemActor[];

    for (const actor of actors) {
      const actorNodeId = addActorNode(actor);
      const direction = actor.direction || 'inbound';
      const source = direction === 'inbound' ? actorNodeId : sourceNodeId;
      const target = direction === 'inbound' ? sourceNodeId : actorNodeId;

      const edgeId = `${source}-${target}`;
      if (edges.has(edgeId)) continue;

      edges.set(
        edgeId,
        createEdge({
          id: edgeId,
          source,
          target,
          label: actor.label,
          type: 'straight',
          markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
        })
      );
    }
  }

  // Collapse reciprocal system-to-system relationships. When system A relates to B
  // and B also relates back to A, we'd otherwise draw two parallel edges. Instead we
  // keep a single edge with arrowheads on both ends. Each direction's label is
  // preserved (joined when they differ). Only system↔system edges are merged — actor
  // edges are left untouched.
  const mergedEdgeKeys = new Set<string>();
  for (const edge of Array.from(edges.values())) {
    if (mergedEdgeKeys.has(edge.id)) continue;
    if (!systemNodeIds.has(edge.source) || !systemNodeIds.has(edge.target)) continue;

    const reverseId = `${edge.target}-${edge.source}`;
    const reverse = edges.get(reverseId);
    if (!reverse || reverseId === edge.id) continue;

    // Merge the two labels, keeping a single value when they match.
    const labels = [edge.label, reverse.label].filter(Boolean);
    const mergedLabel = labels.length > 1 && labels[0] !== labels[1] ? labels.join(' / ') : labels[0];

    edges.set(edge.id, {
      ...edge,
      label: mergedLabel,
      markerStart: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
    });
    edges.delete(reverseId);
    mergedEdgeKeys.add(edge.id);
    mergedEdgeKeys.add(reverseId);
  }

  // Lay the graph out
  nodes.forEach((node) =>
    flow.setNode(node.id, {
      width: actorNodeIds.has(node.id) ? ACTOR_NODE_WIDTH : SYSTEM_NODE_WIDTH,
      height: DEFAULT_NODE_HEIGHT,
    })
  );
  edges.forEach((edge) => flow.setEdge(edge.source, edge.target));

  if (layout) {
    dagre.layout(flow);
  }

  return {
    nodes: calculatedNodes(flow, Array.from(nodes.values())),
    edges: [...edges.values()],
  };
};

/**
 * Builds the System Diagram for a single system, seeding the traversal from
 * that system and walking its relationships and actors outward.
 */
export const getNodesAndEdges = async ({ id, version, defaultFlow, mode = 'simple', layout = true }: NodesAndEdgesProps) => {
  const [allSystems, allServices] = await Promise.all([getCollection('systems'), getCollection('services')]);
  const systemMap = createVersionedMap(allSystems);
  const serviceMap = createVersionedMap(allServices);

  const rootSystem = findInMap(systemMap, id, version);

  // Nothing found...
  if (!rootSystem) {
    return { nodes: [], edges: [] };
  }

  return buildContextGraphFromSeeds({ seedSystems: [rootSystem], systemMap, serviceMap, defaultFlow, mode, layout });
};

/**
 * Builds the System Diagram for a whole domain: seeds the traversal with every
 * system the domain declares, then walks their relationships and actors. The result is
 * the domain's systems plus any related systems they point at (or that point at them),
 * with actors rendered inline — giving a single context view across the domain.
 */
export const getNodesAndEdgesForDomainSystems = async ({
  id,
  version,
  defaultFlow,
  mode = 'simple',
  layout = true,
}: NodesAndEdgesProps) => {
  const [allDomains, allSystems, allServices] = await Promise.all([
    getCollection('domains'),
    getCollection('systems'),
    getCollection('services'),
  ]);
  const domainMap = createVersionedMap(allDomains);
  const systemMap = createVersionedMap(allSystems);
  const serviceMap = createVersionedMap(allServices);

  const domain = findInMap(domainMap, id, version);

  // Nothing found, or the domain has no systems to seed from.
  if (!domain) {
    return { nodes: [], edges: [] };
  }

  const seedSystems = (domain.data.systems || [])
    .map((ref: { id: string; version?: string }) => findInMap(systemMap, ref.id, ref.version))
    .filter((system): system is CollectionEntry<'systems'> => !!system);

  if (seedSystems.length === 0) {
    return { nodes: [], edges: [] };
  }

  return buildContextGraphFromSeeds({ seedSystems, systemMap, serviceMap, defaultFlow, mode, layout });
};

interface AllSystemsProps {
  defaultFlow?: DagreGraph;
  mode?: 'simple' | 'full';
  layout?: boolean;
}

/**
 * Builds a global System Context Map for the whole catalog: every system becomes a
 * seed, so the traversal draws all systems, the relationships between them, and the
 * actors around them — a single map of how every system in the catalog relates.
 */
export const getNodesAndEdgesForAllSystems = async ({ defaultFlow, mode = 'simple', layout = true }: AllSystemsProps = {}) => {
  const [allSystems, allServices] = await Promise.all([getCollection('systems'), getCollection('services')]);
  const systemMap = createVersionedMap(allSystems);
  const serviceMap = createVersionedMap(allServices);

  // Seed with the latest version of every system. `systemMap` sorts each entry so
  // index [0] is the latest, which avoids drawing every historical version.
  const seedSystems = Array.from(systemMap.values())
    .map((versions) => versions[0])
    .filter((system): system is CollectionEntry<'systems'> => !!system);

  if (seedSystems.length === 0) {
    return { nodes: [], edges: [] };
  }

  return buildContextGraphFromSeeds({ seedSystems, systemMap, serviceMap, defaultFlow, mode, layout });
};
