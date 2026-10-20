import { getCollection } from 'astro:content';
import { getNodesAndEdges as getSystemContextNodesAndEdges } from './system-context-node-graph';
import { getNodesAndEdges as getSystemNodesAndEdges, memberServiceNodeIds, SERVICE_NODE_TYPES } from './systems-node-graph';
import { layoutLevels } from '@utils/node-graphs/layout-node-graph';
import { createVersionedMap, findInMap } from '@utils/collections/util';

interface NodesAndEdgesProps {
  id: string;
  version: string;
  mode?: 'simple' | 'full';
  channelRenderMode?: 'single' | 'flat';
}

const CACHE_ENABLED = process.env.DISABLE_EVENTCATALOG_CACHE !== 'true';

// Built once for each system version and options
const levelsCache = new Map<string, ReturnType<typeof buildLevels>>();

export const getNodesAndEdges = (props: NodesAndEdgesProps) => {
  if (!CACHE_ENABLED) return buildLevels(props);
  const { id, version, mode = 'simple', channelRenderMode } = props;
  const key = [id, version, mode, channelRenderMode].join('/');
  if (!levelsCache.has(key)) levelsCache.set(key, buildLevels(props));
  return levelsCache.get(key)!;
};

const nodeIdOf = (resource: { data: { id: string; version?: string } }) => `${resource.data.id}-${resource.data.version}`;

const isSameResource = (a: { data: { id: string; version?: string } }, b: { data: { id: string; version?: string } }) =>
  a.data.id === b.data.id && a.data.version === b.data.version;

/**
 * Every system that lists a service, keyed by the service's resolved node id
 * (`id-version`). Pointers use the same version matching as the rest of the
 * catalog (`latest`, exact versions, semver ranges), so the key is the
 * concrete service the pointer selects, not the pointer text.
 */
export const collectServiceOwners = (systems: any[], serviceMap: Map<string, any[]>) => {
  const owners = new Map<string, any[]>();
  for (const system of systems) {
    for (const ref of system.data.services || []) {
      const service = findInMap(serviceMap, ref.id, ref.version);
      if (!service) continue;
      const id = nodeIdOf(service);
      const list = owners.get(id) ?? [];
      if (!list.some((owner) => isSameResource(owner, system))) list.push(system);
      owners.set(id, list);
    }
  }
  return owners;
};

/**
 * Which of a service's systems stands for it on this diagram.
 * A direct relationship wins, in the order the focused system declares them
 * (their version pointers resolved the same way as the context diagram).
 * Otherwise the lowest system id, then version, so catalog order doesn't matter.
 * Systems that aren't already on the diagram are not candidates: the service
 * is drawn on its own instead of inventing a system box.
 */
const chooseOwningSystem = (owners: any[], contextSystemIds: Set<string>, focused: any, systemMap: Map<string, any[]>) => {
  const inGraph = owners.filter((system) => !isSameResource(system, focused) && contextSystemIds.has(nodeIdOf(system)));
  if (inGraph.length === 0) return undefined;

  const inGraphIds = new Set(inGraph.map(nodeIdOf));
  for (const relationship of focused.data.relationships || []) {
    const related = findInMap(systemMap, relationship.id, relationship.version);
    if (related && inGraphIds.has(nodeIdOf(related))) return related;
  }

  return [...inGraph].sort((a, b) => {
    const byId = a.data.id.localeCompare(b.data.id);
    return byId !== 0 ? byId : String(a.data.version).localeCompare(String(b.data.version));
  })[0];
};

const detachFromGroup = (node: any) => {
  const { parentId, extent, ...rest } = node;
  return rest;
};

const edgePair = (source: string, target: string) => `${source}->${target}`;

/**
 * Drops edges that repeat a relationship (either direction) and edges that
 * repeat the same source, target and label. Relationship edges themselves stay.
 */
export const dedupeEdges = (edges: any[], relationshipPairs: Set<string>) => {
  const seen = new Set<string>();
  return edges.filter((edge) => {
    const isRelationship = String(edge.id).startsWith('context-');
    const pair = edgePair(edge.source, edge.target);
    if (!isRelationship && relationshipPairs.has(pair)) return false;
    if (isRelationship) return true;
    const key = `${pair}->${edge.label ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Services that belong to another system already on the diagram are removed
 * and their edges point at that system. Services in no system, or whose system
 * isn't on the diagram, are kept but not inside this system's group. A service
 * this system lists stays in the group even when another system lists it too.
 */
export const rehomeServicesInOtherSystems = ({
  nodes,
  edges,
  groupId,
  focusedSystem,
  allSystems,
  allServices,
  contextSystemIds,
  relationshipPairs,
}: {
  nodes: any[];
  edges: any[];
  groupId: string;
  focusedSystem: any;
  allSystems: any[];
  allServices: any[];
  contextSystemIds: Set<string>;
  relationshipPairs: Set<string>;
}) => {
  const serviceMap = createVersionedMap(allServices);
  const systemMap = createVersionedMap(allSystems);
  const owners = collectServiceOwners(allSystems, serviceMap);
  const members = memberServiceNodeIds(focusedSystem, serviceMap);
  const replacedBy = new Map<string, string>();

  const nextNodes = nodes
    .map((node) => {
      if (node.id === groupId || !SERVICE_NODE_TYPES.has(node.type)) return node;
      const nodeOwners = owners.get(node.id) ?? [];
      // Listed here, or resolved as a member: it belongs inside this group
      if (members.has(node.id) || nodeOwners.some((system) => isSameResource(system, focusedSystem))) {
        return node.parentId === groupId ? node : { ...node, parentId: groupId, extent: 'parent' };
      }
      const owner = chooseOwningSystem(nodeOwners, contextSystemIds, focusedSystem, systemMap);
      if (owner) {
        replacedBy.set(node.id, nodeIdOf(owner));
        return null;
      }
      return detachFromGroup(node);
    })
    .filter((node): node is any => !!node);

  const seen = new Set<string>();
  const nextEdges = edges.flatMap((edge) => {
    const source = replacedBy.get(edge.source) ?? edge.source;
    const target = replacedBy.get(edge.target) ?? edge.target;
    if (source === target) return [];
    const pair = edgePair(source, target);
    if (relationshipPairs.has(pair)) return [];
    const key = `${pair}->${edge.label ?? ''}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ ...edge, source, target }];
  });

  return { nodes: nextNodes, edges: nextEdges, replacedBy };
};

/**
 * A system's resource diagram shown inside its context diagram: the system's node
 * is replaced by the expanded system group (services, data stores, messages...),
 * and the system's relationships and actors connect to the group instead.
 * Returns level 1 too (`overview`, the context diagram) and the graph without
 * its messages and channels (`hiddenMessages`).
 */
const buildLevels = async ({ id, version, mode = 'simple', channelRenderMode }: NodesAndEdgesProps) => {
  const [context, system, allSystems, allServices] = await Promise.all([
    getSystemContextNodesAndEdges({ id, version, mode, layout: false }),
    getSystemNodesAndEdges({
      id,
      version,
      mode,
      channelRenderMode,
      wrapInSystemGroup: true,
      confineToMembers: true,
      layout: false,
    }),
    getCollection('systems'),
    getCollection('services'),
  ]);

  const group = system.nodes.find((node: any) => node.type === 'system-group');
  const rootSystemNode = context.nodes.find((node: any) => node.data?.isFocused);
  if (!group || !rootSystemNode) return layoutLevels(system, context);

  const focusedSystem = allSystems.find((systemEntry) => systemEntry.data.id === id && systemEntry.data.version === version);

  const toGroup = (nodeId: string) => (nodeId === rootSystemNode.id ? group.id : nodeId);
  const contextEdges = context.edges.map((edge: any) => ({
    ...edge,
    id: `context-${edge.id}`,
    source: toGroup(edge.source),
    target: toGroup(edge.target),
  }));
  const relationshipPairs = new Set<string>();
  for (const edge of contextEdges) {
    relationshipPairs.add(edgePair(edge.source, edge.target));
    relationshipPairs.add(edgePair(edge.target, edge.source));
  }

  const contextSystemIds = new Set(
    context.nodes.filter((node: any) => node.type === 'systems' && node.id !== rootSystemNode.id).map((node: any) => node.id)
  );

  const rehomed = focusedSystem
    ? rehomeServicesInOtherSystems({
        nodes: system.nodes,
        edges: system.edges,
        groupId: group.id,
        focusedSystem,
        allSystems,
        allServices,
        contextSystemIds,
        relationshipPairs,
      })
    : { nodes: system.nodes, edges: system.edges };

  const systemNodeIds = new Set(rehomed.nodes.map((node: any) => node.id));
  const contextNodes = context.nodes.filter((node: any) => node.id !== rootSystemNode.id && !systemNodeIds.has(node.id));

  // Lay the context and the expanded system out together. Redirects happen
  // before this, so level 2 (messages hidden) bridges onto the system boxes.
  const detailed = {
    // Parent must come before its children in the array for React Flow
    nodes: [group, ...contextNodes, ...rehomed.nodes.filter((node: any) => node.id !== group.id)],
    edges: [...rehomed.edges, ...contextEdges],
  };
  const laidOut = await layoutLevels(detailed, context);
  // Hiding messages can bridge two systems that a relationship already joins
  return {
    ...laidOut,
    edges: dedupeEdges(laidOut.edges, relationshipPairs),
    hiddenMessages: {
      ...laidOut.hiddenMessages,
      edges: dedupeEdges(laidOut.hiddenMessages.edges, relationshipPairs),
    },
  };
};
