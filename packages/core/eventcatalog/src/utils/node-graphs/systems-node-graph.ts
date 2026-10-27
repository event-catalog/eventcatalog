import { getCollection } from 'astro:content';
import { layoutNodeGraph } from '@utils/node-graphs/layout-node-graph';
import { getNodesAndEdges as getServicesNodeAndEdges } from './services-node-graph';
import { getNodesAndEdges as getContainerNodeAndEdges } from './container-node-graph';
import merge from 'lodash.merge';
import { createVersionedMap, findInMap } from '@utils/collections/util';

interface NodesAndEdgesProps {
  id: string;
  version: string;
  mode?: 'simple' | 'full';
  group?: boolean;
  // When true, wraps the whole system graph in a single parent boundary node
  // labelled with the system name. Used by the standalone System Diagram.
  wrapInSystemGroup?: boolean;
  channelRenderMode?: 'single' | 'flat';
  layout?: boolean;
  // Only parent this system's own services. Services pulled in because they
  // send or receive the same messages stay in the graph, but outside the group.
  // The domain diagram leaves this off: it uses the parent to tell which
  // system's graph a service came from.
  confineToMembers?: boolean;
}

export const getNodesAndEdges = async ({
  id,
  version,
  mode = 'simple',
  group = false,
  wrapInSystemGroup = false,
  channelRenderMode = 'flat',
  layout = true,
  confineToMembers = false,
}: NodesAndEdgesProps) => {
  let nodes = new Map(),
    edges = new Map();

  // 1. Parallel Fetching
  const [systems, services, containers] = await Promise.all([
    getCollection('systems'),
    getCollection('services'),
    getCollection('containers'),
  ]);

  const system = systems.find((s) => s.data.id === id && s.data.version === version);

  // Nothing found...
  if (!system) {
    return {
      nodes: [],
      edges: [],
    };
  }

  // 2. Build optimized maps
  const serviceMap = createVersionedMap(services);
  const containerMap = createVersionedMap(containers);

  const rawServices = system?.data.services || [];

  // Optimized hydration
  const systemServicesWithVersion = rawServices
    .map((service) => findInMap(serviceMap, service.id, service.version))
    .filter((s): s is any => !!s)
    .map((svc) => ({ id: svc.data.id, version: svc.data.version }));

  // Hydrate the data stores (containers) mapped directly to the system
  const systemContainersWithVersion = (system?.data.containers || [])
    .map((container) => findInMap(containerMap, container.id, container.version))
    .filter((c): c is any => !!c)
    .map((container) => ({ id: container.data.id, version: container.data.version }));

  // Grab the node-graph for each service in the system and merge them into one graph
  for (const service of systemServicesWithVersion) {
    const { nodes: serviceNodes, edges: serviceEdges } = await getServicesNodeAndEdges({
      id: service.id,
      version: service.version,
      mode,
      renderAllEdges: true,
      channelRenderMode,
      layout: false,
    });

    serviceNodes.forEach((n) => {
      /**
       * A message could be sent by one service and received by another service in the same system.
       * So, we need to deep merge the message to keep the `showSource` and `showTarget` as true.
       */
      nodes.set(n.id, nodes.has(n.id) ? merge(nodes.get(n.id), n) : n);
    });
    // @ts-ignore
    serviceEdges.forEach((e) => edges.set(e.id, e));
  }

  // Grab the node-graph for each data store (container) in the system and merge them into one graph.
  // This renders the data store along with the services that read from / write to it, the same way
  // services are merged above.
  for (const container of systemContainersWithVersion) {
    const { nodes: containerNodes, edges: containerEdges } = await getContainerNodeAndEdges({
      id: container.id,
      version: container.version,
      mode,
      channelRenderMode,
      layout: false,
    });

    containerNodes.forEach((n) => {
      nodes.set(n.id, nodes.has(n.id) ? merge(nodes.get(n.id), n) : n);
    });
    // @ts-ignore
    containerEdges.forEach((e) => edges.set(e.id, e));
  }

  // The graphs merged above each mark their own service / data store as the one
  // being viewed, but here the system is (see the system group below)
  nodes.forEach((n) => {
    if (n.data?.isFocused) nodes.set(n.id, { ...n, data: { ...n.data, isFocused: false } });
  });

  // Add group node to the graph (used when a system is rendered inside another view)
  if (group) {
    nodes.forEach((n) => {
      nodes.set(n.id, { ...n, data: { ...n.data, group: { type: 'System', value: system?.data.name, id: system?.data.id } } });
    });
  }

  // Wrap the graph in one parent "system group" boundary node. Messages,
  // channels and data stores stay in it. With confineToMembers, only this
  // system's own services are children; other services (and their agent tools)
  // are left outside.
  const graphNodes = [...nodes.values()];
  const graphEdges = [...edges.values()];
  const graph = {
    nodes:
      wrapInSystemGroup && nodes.size > 0
        ? wrapNodesInSystemGroup(
            graphNodes,
            graphEdges,
            system,
            confineToMembers ? memberServiceNodeIds(system, serviceMap) : undefined
          )
        : graphNodes,
    edges: graphEdges,
  };

  return layout ? layoutNodeGraph(graph) : graph;
};

/** Service and agent nodes. Anything else in the graph (messages, channels, data stores) stays with the system. */
export const SERVICE_NODE_TYPES = new Set(['services', 'agents']);

/** Node ids of the services a system lists, with `latest` and semver ranges resolved to a real version. */
export const memberServiceNodeIds = (
  system: { data: { services?: { id: string; version?: string }[] } },
  serviceMap: Map<string, { data: { id: string; version?: string } }[]>
) => {
  const ids = new Set<string>();
  for (const ref of system.data.services || []) {
    const service = findInMap(serviceMap, ref.id, ref.version);
    if (service) ids.add(`${service.data.id}-${service.data.version}`);
  }
  return ids;
};

const withoutGroupParent = (node: any) => {
  const { parentId, extent, ...rest } = node;
  return rest;
};

/**
 * Wraps a system's nodes in one parent `system-group` node (sized to fit them
 * when the graph is laid out), so they visibly belong to the system.
 * When `memberIds` is set, service and agent nodes that aren't members are
 * left outside the group, and so are the tools of agents left outside.
 */
const wrapNodesInSystemGroup = (systemNodes: any[], systemEdges: any[], system: any, memberIds?: Set<string>) => {
  const groupId = `system-group-${system.data.id}-${system.data.version}`;

  const outside = new Set<string>(
    memberIds
      ? systemNodes.filter((node) => SERVICE_NODE_TYPES.has(node.type) && !memberIds.has(node.id)).map((node) => node.id)
      : []
  );
  // An agent's tools sit wherever the agent does
  const toolIds = new Set(systemNodes.filter((node) => node.type === 'agentTool').map((node) => node.id));
  for (const edge of systemEdges) {
    if (outside.has(edge.source) && toolIds.has(edge.target)) outside.add(edge.target);
  }

  const groupNode = {
    id: groupId,
    type: 'system-group',
    position: { x: 0, y: 0 },
    draggable: false,
    selectable: false,
    data: {
      system: { id: system.data.id, name: system.data.name, version: system.data.version },
      // The system is the resource being viewed on its own diagram
      isFocused: true,
    },
  };

  // Parent must come before its children in the array for React Flow
  return [
    groupNode,
    ...systemNodes.map((node) =>
      outside.has(node.id) ? withoutGroupParent(node) : { ...node, parentId: groupId, extent: 'parent' }
    ),
  ];
};
