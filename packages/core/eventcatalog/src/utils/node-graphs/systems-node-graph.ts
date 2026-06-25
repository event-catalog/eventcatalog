import { getCollection } from 'astro:content';
import dagre from 'dagre';
import { createDagreGraph, calculatedNodes } from '@utils/node-graphs/utils/utils';
import { getNodesAndEdges as getServicesNodeAndEdges } from './services-node-graph';
import merge from 'lodash.merge';
import { createVersionedMap, findInMap } from '@utils/collections/util';

type DagreGraph = any;

interface NodesAndEdgesProps {
  id: string;
  version: string;
  defaultFlow?: DagreGraph;
  mode?: 'simple' | 'full';
  group?: boolean;
  channelRenderMode?: 'single' | 'flat';
  layout?: boolean;
}

export const getNodesAndEdges = async ({
  id,
  version,
  defaultFlow,
  mode = 'simple',
  group = false,
  channelRenderMode = 'flat',
  layout = true,
}: NodesAndEdgesProps) => {
  const flow = defaultFlow || createDagreGraph({ ranksep: 360, nodesep: 50, edgesep: 50 });
  let nodes = new Map(),
    edges = new Map();

  // 1. Parallel Fetching
  const [systems, services] = await Promise.all([getCollection('systems'), getCollection('services')]);

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

  const rawServices = system?.data.services || [];

  // Optimized hydration
  const systemServicesWithVersion = rawServices
    .map((service) => findInMap(serviceMap, service.id, service.version))
    .filter((s): s is any => !!s)
    .map((svc) => ({ id: svc.data.id, version: svc.data.version }));

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

  // Add group node to the graph (used when a system is rendered inside another view)
  if (group) {
    nodes.forEach((n) => {
      nodes.set(n.id, { ...n, data: { ...n.data, group: { type: 'System', value: system?.data.name, id: system?.data.id } } });
    });
  }

  if (layout) {
    dagre.layout(flow);
  }

  return {
    nodes: calculatedNodes(flow, Array.from(nodes.values())),
    edges: [...edges.values()],
  };
};
