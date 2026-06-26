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

/**
 * Builds the System Context Diagram for a given system.
 *
 * Starting from the given system, we walk its `relationships` outward (breadth-first) to
 * the systems it relates to, then their relationships, and so on — building the reachable
 * neighbourhood. Each system becomes a node; each relationship that has a `label` becomes a
 * labelled edge (relationships without a label are intentionally not drawn).
 */
export const getNodesAndEdges = async ({ id, version, defaultFlow, mode = 'simple', layout = true }: NodesAndEdgesProps) => {
  const flow = defaultFlow || createDagreGraph({ ranksep: 280, nodesep: 80, edgesep: 50 });
  const nodes = new Map<string, any>();
  const edges = new Map<string, any>();

  const [allSystems, allServices] = await Promise.all([getCollection('systems'), getCollection('services')]);
  const systemMap = createVersionedMap(allSystems);
  const serviceMap = createVersionedMap(allServices);

  const rootSystem = findInMap(systemMap, id, version);

  // Nothing found...
  if (!rootSystem) {
    return { nodes: [], edges: [] };
  }

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
  const queue: CollectionEntry<'systems'>[] = [rootSystem];

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
