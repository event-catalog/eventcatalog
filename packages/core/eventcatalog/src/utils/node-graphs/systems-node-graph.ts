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
}

export const getNodesAndEdges = async ({
  id,
  version,
  mode = 'simple',
  group = false,
  wrapInSystemGroup = false,
  channelRenderMode = 'flat',
  layout = true,
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

  // Wrap everything inside a single parent "system group" boundary node, so all
  // the services / data stores / messages visibly belong to one system
  const graph = {
    nodes: wrapInSystemGroup && nodes.size > 0 ? wrapNodesInSystemGroup([...nodes.values()], system) : [...nodes.values()],
    edges: [...edges.values()],
  };

  return layout ? layoutNodeGraph(graph) : graph;
};

/**
 * Wraps a system's nodes in one parent `system-group` node (sized to fit them
 * when the graph is laid out), so they visibly belong to the system.
 */
const wrapNodesInSystemGroup = (systemNodes: any[], system: any) => {
  const groupId = `system-group-${system.data.id}-${system.data.version}`;

  const groupNode = {
    id: groupId,
    type: 'system-group',
    position: { x: 0, y: 0 },
    draggable: false,
    selectable: false,
    data: {
      system: { name: system.data.name, version: system.data.version },
      // The system is the resource being viewed on its own diagram
      isFocused: true,
    },
  };

  // Parent must come before its children in the array for React Flow
  return [groupNode, ...systemNodes.map((node) => ({ ...node, parentId: groupId, extent: 'parent' }))];
};
