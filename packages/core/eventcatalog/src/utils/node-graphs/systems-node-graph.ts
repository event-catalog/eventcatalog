import { getCollection } from 'astro:content';
import dagre from 'dagre';
import { createDagreGraph, calculatedNodes, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '@utils/node-graphs/utils/utils';
import { getNodesAndEdges as getServicesNodeAndEdges } from './services-node-graph';
import { getNodesAndEdges as getContainerNodeAndEdges } from './container-node-graph';
import merge from 'lodash.merge';
import { createVersionedMap, findInMap } from '@utils/collections/util';

type DagreGraph = any;

interface NodesAndEdgesProps {
  id: string;
  version: string;
  defaultFlow?: DagreGraph;
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
  defaultFlow,
  mode = 'simple',
  group = false,
  wrapInSystemGroup = false,
  channelRenderMode = 'flat',
  layout = true,
}: NodesAndEdgesProps) => {
  const flow = defaultFlow || createDagreGraph({ ranksep: 360, nodesep: 50, edgesep: 50 });
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
      defaultFlow: flow,
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
      defaultFlow: flow,
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

  // Add group node to the graph (used when a system is rendered inside another view)
  if (group) {
    nodes.forEach((n) => {
      nodes.set(n.id, { ...n, data: { ...n.data, group: { type: 'System', value: system?.data.name, id: system?.data.id } } });
    });
  }

  if (layout) {
    dagre.layout(flow);
  }

  let laidOutNodes = calculatedNodes(flow, Array.from(nodes.values()));

  // Wrap everything inside a single parent "system group" boundary node, so all
  // the services / data stores / messages visibly belong to one system. We only
  // do this when this graph owns its own layout (`layout` true) — when it's
  // being merged into a larger graph (e.g. a domain view) the host owns grouping.
  if (wrapInSystemGroup && layout && laidOutNodes.length > 0) {
    laidOutNodes = wrapNodesInSystemGroup(laidOutNodes, flow, system);
  }

  return {
    nodes: laidOutNodes,
    edges: [...edges.values()],
  };
};

// Padding around the children inside the group box, and headroom for the header banner.
const GROUP_PADDING_X = 100;
const GROUP_PADDING_Y = 100;
const GROUP_HEADER_HEIGHT = 64;

/**
 * Wraps a set of already-laid-out nodes in one parent `system-group` node.
 *
 * The rest of the app uses dagre's node position directly as the ReactFlow
 * position, so we stay in that same coordinate space. Child nodes under a
 * `parentId` are positioned relative to the parent, so we:
 *   1. compute the bounding box of all nodes (using dagre position + size),
 *   2. create a parent group node at the box origin (minus padding/header),
 *   3. re-home every node as a child, offset by the group origin.
 */
const wrapNodesInSystemGroup = (laidOutNodes: any[], flow: DagreGraph, system: any) => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of laidOutNodes) {
    const dims = flow.node(node.id) || {};
    const width = dims.width ?? DEFAULT_NODE_WIDTH;
    const height = dims.height ?? DEFAULT_NODE_HEIGHT;

    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + width);
    maxY = Math.max(maxY, node.position.y + height);
  }

  // Origin of the group box (room for padding + the header banner at the top).
  const groupX = minX - GROUP_PADDING_X;
  const groupY = minY - GROUP_PADDING_Y - GROUP_HEADER_HEIGHT;
  const groupWidth = maxX - minX + GROUP_PADDING_X * 2;
  const groupHeight = maxY - minY + GROUP_PADDING_Y * 2 + GROUP_HEADER_HEIGHT;

  const groupId = `system-group-${system.data.id}-${system.data.version}`;

  const groupNode = {
    id: groupId,
    type: 'system-group',
    position: { x: groupX, y: groupY },
    draggable: false,
    selectable: false,
    style: { width: groupWidth, height: groupHeight },
    data: {
      system: { name: system.data.name, version: system.data.version },
    },
  };

  // Re-home each node as a child, with its position relative to the group origin.
  const childNodes = laidOutNodes.map((node) => ({
    ...node,
    parentId: groupId,
    extent: 'parent',
    position: {
      x: node.position.x - groupX,
      y: node.position.y - groupY,
    },
  }));

  // Parent must come before its children in the array for ReactFlow.
  return [groupNode, ...childNodes];
};
