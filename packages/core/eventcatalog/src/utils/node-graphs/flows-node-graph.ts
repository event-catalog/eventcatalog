import { getCollection, type CollectionEntry } from 'astro:content';
import {
  buildContextMenuForResource,
  buildContextMenuForService,
  buildContextMenuForSystem,
} from '@utils/node-graphs/utils/utils';
import { layoutNodeGraph } from '@utils/node-graphs/layout-node-graph';
import { MarkerType } from '@xyflow/react';
import type { Node as NodeType } from '@xyflow/react';
import { createVersionedMap, findInMap } from '@utils/collections/util';
import { createLaneIndex, type LaneIndex } from '@utils/node-graphs/flow-lanes';

interface Props {
  id: string;
  version: string;
  mode?: 'simple' | 'full';
  layout?: boolean;
}

interface Maps {
  messageMap: Map<string, any[]>;
  agentMap: Map<string, any[]>;
  serviceMap: Map<string, any[]>;
  flowMap: Map<string, any[]>;
  containerMap: Map<string, any[]>;
  dataProductMap: Map<string, any[]>;
  systemMap: Map<string, any[]>;
  channelMap: Map<string, any[]>;
  laneIndex: LaneIndex;
}

const getServiceNode = (step: any, serviceMap: Map<string, any[]>) => {
  const service = findInMap(serviceMap, step.service.id, step.service.version);
  return {
    ...step,
    type: service ? service.collection : 'step',
    service,
  };
};

const getAgentNode = (step: any, agentMap: Map<string, any[]>) => {
  const agent = findInMap(agentMap, step.agent.id, step.agent.version);
  return {
    ...step,
    type: agent ? agent.collection : 'step',
    agent,
  };
};

const getFlowNode = (step: any, flowMap: Map<string, any[]>) => {
  const flow = findInMap(flowMap, step.flow.id, step.flow.version);
  return {
    ...step,
    type: flow ? flow.collection : 'step',
    flow,
  };
};

const getContainerNode = (step: any, containerMap: Map<string, any[]>) => {
  const pointer = step.container;
  const container = findInMap(containerMap, pointer.id, pointer.version);
  return {
    ...step,
    type: container ? 'data' : 'step',
    container,
  };
};

const getDataProductNode = (step: any, dataProductMap: Map<string, any[]>) => {
  const pointer = step.dataProduct;
  const dataProduct = findInMap(dataProductMap, pointer.id, pointer.version);
  return {
    ...step,
    type: dataProduct ? 'data-products' : 'step',
    dataProduct,
  };
};

const getSystemNode = (step: any, systemMap: Map<string, any[]>) => {
  const pointer = step.systems || step.system;
  const system = findInMap(systemMap, pointer.id, pointer.version);
  return {
    ...step,
    type: system ? 'systems' : 'step',
    system,
  };
};

const getChannelNode = (step: any, channelMap: Map<string, any[]>) => {
  const channel = findInMap(channelMap, step.channel.id, step.channel.version);
  return {
    ...step,
    type: channel ? 'channels' : 'step',
    channel,
  };
};

const getMessageNode = (step: any, messageMap: Map<string, any[]>) => {
  const message = findInMap(messageMap, step.message.id, step.message.version);
  return {
    ...step,
    type: message ? message.collection : 'step',
    message,
  };
};

// The whole graph is sent to the browser, so a step's resource is in its node's
// data once (e.g. `data.service`), without what's only needed to build the
// catalog (its markdown body, file path, ...), and the step is just the step
const RESOURCE_KEYS = ['message', 'agent', 'service', 'flow', 'container', 'dataProduct', 'system', 'channel'];
const resourceForNode = (entry: any) => {
  // Only what the nodes read: its id, collection and frontmatter (nested, as
  // e.g. the sub-flow node reads `flow.data`, and spread on top)
  const { id, collection, data } = entry;
  return { id, collection, data, ...data };
};
const stepForNode = (step: any) => {
  const own = { ...step, ...step.data };
  RESOURCE_KEYS.forEach((key) => delete own[key]);
  return { ...own, title: titleOf(step) };
};

// A step without a title is named after what it points at (or its id). A
// custom step is labelled with its own title first, as its node is.
const titleOf = (step: any): string => {
  if (step.custom?.title) return step.custom.title;
  if (step.title) return step.title;
  const resource = RESOURCE_KEYS.map((key) => step[key]).find((entry) => entry?.data);
  return resource?.data.name || resource?.data.id || step.actor?.name || step.externalSystem?.name || String(step.id);
};

// Mistakes in a flow (a typo in a next step, a resource that was renamed)
// would otherwise just drop an arrow or draw a plain box, so they're logged,
// once each (a flow is drawn on several pages). Once per process on purpose:
// in `astro dev` a problem that's fixed and then made again isn't logged again
// until the server restarts, which is fine for a warning.
const warned = new Set<string>();
const warnOnce = (flow: any, problem: string) => {
  const message = `[flows] Flow "${flow.data.id}" (${flow.data.version}): ${problem}`;
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(message);
};

// The keys a step points at a resource with, as authors write them
const POINTER_KEYS: Record<string, string> = {
  message: 'message',
  agent: 'agent',
  service: 'service',
  systems: 'system',
  system: 'system',
  channel: 'channel',
  flow: 'flow',
  container: 'container',
  dataProduct: 'data product',
};
const warnAboutMissingResource = (flow: any, step: any, hydrated: any) => {
  for (const [key, kind] of Object.entries(POINTER_KEYS)) {
    const pointer = step[key];
    const resourceKey = key === 'systems' ? 'system' : key;
    if (!pointer || hydrated[resourceKey]) continue;
    warnOnce(
      flow,
      `step "${step.id}" points at ${kind} "${pointer.id}" (${pointer.version ?? 'latest'}), which is not in the catalog, so it is shown as a plain step.`
    );
  }
};

// Rewrite every id/source/target in a precomputed sub-flow graph with a
// namespace prefix so inlined copies don't collide with the parent. Nested
// `data.expandedNodes` / `data.expandedEdges` payloads are rewritten too so
// the namespace chain stays unique when the same sub-flow is inlined under
// multiple parents.
const prefixGraph = (graph: { nodes: any[]; edges: any[] }, prefix: string) => {
  if (!prefix) return graph;
  const nodes = graph.nodes.map((n) => {
    const next: any = { ...n, id: `${prefix}${n.id}` };
    if (n.data?.expandedNodes || n.data?.expandedEdges) {
      const nested = prefixGraph({ nodes: n.data.expandedNodes ?? [], edges: n.data.expandedEdges ?? [] }, prefix);
      next.data = { ...n.data, expandedNodes: nested.nodes, expandedEdges: nested.edges };
    }
    return next;
  });
  const edges = graph.edges.map((e) => ({
    ...e,
    id: `${prefix}${e.id}`,
    source: `${prefix}${e.source}`,
    target: `${prefix}${e.target}`,
  }));
  return { nodes, edges };
};

// `subFlowCache` keys each flow's graph by `id@version` so an N-times
// referenced sub-flow is built once. `visited` short-circuits cycles.
const buildFlowGraphInternal = (
  flow: any,
  maps: Maps,
  mode: 'simple' | 'full',
  subFlowCache: Map<string, { nodes: any[]; edges: any[] }>,
  visited: Set<string>
) => {
  const nodes: any[] = [];
  const edges: any[] = [];

  const steps = flow?.data?.steps || [];
  const stepNodeId = (stepId: any) => `step-${stepId}`;

  const hydratedSteps = steps.map((step: any) => {
    if (step.agent) return getAgentNode(step, maps.agentMap);
    if (step.service) return getServiceNode(step, maps.serviceMap);
    if (step.systems || step.system) return getSystemNode(step, maps.systemMap);
    if (step.flow) return getFlowNode(step, maps.flowMap);
    if (step.container) return getContainerNode(step, maps.containerMap);
    if (step.dataProduct) return getDataProductNode(step, maps.dataProductMap);
    if (step.channel) return getChannelNode(step, maps.channelMap);
    if (step.message) return getMessageNode(step, maps.messageMap);
    if (step.actor) return { ...step, type: 'actor', actor: step.actor };
    if (step.custom) return { ...step, type: 'custom', custom: step.custom };
    if (step.externalSystem) return { ...step, type: 'externalSystem', externalSystem: step.externalSystem };
    return { ...step, type: 'step' };
  });

  steps.forEach((step: any, index: number) => warnAboutMissingResource(flow, step, hydratedSteps[index]));
  const stepIds = new Set(steps.map((step: any) => String(step.id)));

  hydratedSteps.forEach((step: any) => {
    const node: NodeType = {
      id: stepNodeId(step.id),
      sourcePosition: 'right',
      targetPosition: 'left',
      data: {
        mode,
        step: stepForNode(step),
        showTarget: true,
        showSource: true,
      },
      position: { x: 0, y: 0 },
      type: step.type,
    } as NodeType;

    if (step.agent) {
      node.data.agent = resourceForNode(step.agent);
      node.data.contextMenu = buildContextMenuForResource({
        collection: 'agents',
        id: step.agent.data.id,
        version: step.agent.data.version,
      });
    }
    if (step.service) {
      node.data.service = resourceForNode(step.service);
      node.data.contextMenu = buildContextMenuForService({
        id: step.service.data.id,
        version: step.service.data.version,
        specifications: step.service.data.specifications,
        repository: step.service.data.repository,
      });
    }
    if (step.system?.data) {
      node.data.system = resourceForNode(step.system);
      node.data.contextMenu = buildContextMenuForSystem({
        id: step.system.data.id,
        version: step.system.data.version,
      });
    }
    if (step.flow) {
      node.data.flow = resourceForNode(step.flow);
      node.data.contextMenu = buildContextMenuForResource({
        collection: 'flows',
        id: step.flow.data.id,
        version: step.flow.data.version,
      });

      // Guard cycles; inline the sub-flow's graph so the client can expand on click.
      const subFlowKey = `${step.flow.data.id}@${step.flow.data.version}`;
      if (!visited.has(subFlowKey)) {
        let cached = subFlowCache.get(subFlowKey);
        if (!cached) {
          cached = buildFlowGraphInternal(step.flow, maps, mode, subFlowCache, new Set([...visited, subFlowKey]));
          subFlowCache.set(subFlowKey, cached);
        }
        if (cached.nodes.length > 0) {
          const { nodes: childNodes, edges: childEdges } = prefixGraph(cached, `${node.id}__`);
          node.data.expandedNodes = childNodes;
          node.data.expandedEdges = childEdges;
        }
      }
    }
    if (step.message) {
      node.data.message = resourceForNode(step.message);
      node.data.contextMenu = buildContextMenuForResource({
        collection: step.message.collection,
        id: step.message.data.id,
        version: step.message.data.version,
      });
    }
    if (step.container?.data) {
      node.data.data = { ...step.container.data };
      node.data.container = resourceForNode(step.container);
      node.data.contextMenu = buildContextMenuForResource({
        collection: 'containers',
        id: step.container.data.id,
        version: step.container.data.version,
      });
    }
    if (step.channel?.data) {
      node.data.channel = resourceForNode(step.channel);
      node.data.contextMenu = buildContextMenuForResource({
        collection: 'channels',
        id: step.channel.data.id,
        version: step.channel.data.version,
      });
    }
    if (step.dataProduct?.data) {
      node.data.dataProduct = resourceForNode(step.dataProduct);
      node.data.contextMenu = buildContextMenuForResource({
        collection: 'data-products',
        id: step.dataProduct.data.id,
        version: step.dataProduct.data.version,
      });
    }
    if (step.actor) {
      node.data.actor = { ...step.actor, ...step.actor.data };
      node.data = { ...node.data, ...step.actor };
    }
    if (step.externalSystem) node.data.externalSystem = { ...step.externalSystem, ...step.externalSystem.data };
    if (step.custom) node.data.custom = { ...step.custom, ...step.custom.data };

    // Which domain, system and team the step belongs to, for swimlanes
    const resource = step.agent || step.service || step.container || step.dataProduct;
    const lanes =
      step.actor || step.externalSystem
        ? { external: true }
        : step.system?.data
          ? maps.laneIndex.lanesForSystem(step.system)
          : resource && maps.laneIndex.lanesFor(resource);
    if (lanes) node.data.lanes = lanes;

    nodes.push(node);
  });

  hydratedSteps.forEach((step: any) => {
    let paths = step.next_steps || [];

    if (step.next_step) {
      if (!step.next_step?.id) {
        paths = [{ id: step.next_step }];
      } else {
        paths = [step.next_step];
      }
    }

    paths = paths.map((path: any) => {
      if (typeof path === 'string') {
        return { id: path };
      }
      return path;
    });

    paths.forEach((path: any) => {
      if (!stepIds.has(String(path.id))) {
        warnOnce(flow, `step "${step.id}" leads to step "${path.id}", but the flow has no step with that id.`);
        return;
      }
      edges.push({
        id: `step-${step.id}-step-${path.id}`,
        source: stepNodeId(step.id),
        target: stepNodeId(path.id),
        type: 'flow-edge',
        label: path.label,
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: '#666',
        },
        style: {
          strokeWidth: 2,
          stroke: '#ccc',
        },
      });
    });
  });

  return { nodes, edges };
};

export const getNodesAndEdges = async ({ id, version, mode = 'simple', layout = true }: Props) => {
  const [flows, events, commands, queries, agents, services, containers, dataProducts, domains, systems, channels, teams, users] =
    await Promise.all([
      getCollection('flows'),
      getCollection('events'),
      getCollection('commands'),
      getCollection('queries'),
      getCollection('agents'),
      getCollection('services'),
      getCollection('containers'),
      getCollection('data-products'),
      getCollection('domains'),
      getCollection('systems'),
      getCollection('channels'),
      getCollection('teams'),
      getCollection('users'),
    ]);

  const flow = flows.find((flow) => flow.data.id === id && flow.data.version === version);

  if (!flow) {
    return {
      nodes: [],
      edges: [],
    };
  }

  const messages = [...events, ...commands, ...queries];
  const maps: Maps = {
    messageMap: createVersionedMap(messages),
    agentMap: createVersionedMap(agents),
    serviceMap: createVersionedMap(services),
    flowMap: createVersionedMap(flows),
    containerMap: createVersionedMap(containers),
    dataProductMap: createVersionedMap(dataProducts),
    systemMap: createVersionedMap(systems),
    channelMap: createVersionedMap(channels),
    laneIndex: createLaneIndex({ domains, systems, teams, users }),
  };

  const subFlowCache = new Map<string, { nodes: any[]; edges: any[] }>();
  const { nodes, edges } = buildFlowGraphInternal(
    flow,
    maps,
    mode,
    subFlowCache,
    new Set([`${flow.data.id}@${flow.data.version}`])
  );

  return layout ? await layoutNodeGraph({ nodes, edges }) : { nodes, edges };
};
