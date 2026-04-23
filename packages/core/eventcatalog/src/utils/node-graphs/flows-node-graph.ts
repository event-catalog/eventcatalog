import { getCollection, type CollectionEntry } from 'astro:content';
import dagre from 'dagre';
import {
  createDagreGraph,
  calculatedNodes,
  DEFAULT_NODE_WIDTH,
  DEFAULT_NODE_HEIGHT,
  buildContextMenuForResource,
  buildContextMenuForService,
} from '@utils/node-graphs/utils/utils';
import { MarkerType } from '@xyflow/react';
import type { Node as NodeType } from '@xyflow/react';
import { createVersionedMap, findInMap } from '@utils/collections/util';

type DagreGraph = any;

interface Props {
  id: string;
  version: string;
  defaultFlow?: DagreGraph;
  mode?: 'simple' | 'full';
  renderAllEdges?: boolean;
}

interface Maps {
  messageMap: Map<string, any[]>;
  serviceMap: Map<string, any[]>;
  flowMap: Map<string, any[]>;
}

const getServiceNode = (step: any, serviceMap: Map<string, any[]>) => {
  const service = findInMap(serviceMap, step.service.id, step.service.version);
  return {
    ...step,
    type: service ? service.collection : 'step',
    service,
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

const getMessageNode = (step: any, messageMap: Map<string, any[]>) => {
  const message = findInMap(messageMap, step.message.id, step.message.version);
  return {
    ...step,
    type: message ? message.collection : 'step',
    message,
  };
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
    if (step.service) return getServiceNode(step, maps.serviceMap);
    if (step.flow) return getFlowNode(step, maps.flowMap);
    if (step.message) return getMessageNode(step, maps.messageMap);
    if (step.actor) return { ...step, type: 'actor', actor: step.actor };
    if (step.custom) return { ...step, type: 'custom', custom: step.custom };
    if (step.externalSystem) return { ...step, type: 'externalSystem', externalSystem: step.externalSystem };
    return { ...step, type: 'step' };
  });

  hydratedSteps.forEach((step: any, index: number) => {
    const node: NodeType = {
      id: stepNodeId(step.id),
      sourcePosition: 'right',
      targetPosition: 'left',
      data: {
        mode,
        step: { ...step, ...step.data },
        showTarget: true,
        showSource: true,
      },
      position: { x: 250, y: index * 150 },
      type: step.type,
    } as NodeType;

    if (step.service) {
      node.data.service = { ...step.service, ...step.service.data };
      node.data.contextMenu = buildContextMenuForService({
        id: step.service.data.id,
        version: step.service.data.version,
        specifications: step.service.data.specifications,
        repository: step.service.data.repository,
      });
    }
    if (step.flow) {
      node.data.flow = { ...step.flow, ...step.flow.data };
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
      node.data.message = { ...step.message, ...step.message.data };
      node.data.contextMenu = buildContextMenuForResource({
        collection: step.message.collection,
        id: step.message.data.id,
        version: step.message.data.version,
      });
    }
    if (step.actor) {
      node.data.actor = { ...step.actor, ...step.actor.data };
      node.data = { ...node.data, ...step.actor };
    }
    if (step.externalSystem) node.data.externalSystem = { ...step.externalSystem, ...step.externalSystem.data };
    if (step.custom) node.data.custom = { ...step.custom, ...step.custom.data };
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

export const getNodesAndEdges = async ({ id, defaultFlow, version, mode = 'simple', renderAllEdges = false }: Props) => {
  const graph = defaultFlow || createDagreGraph({ ranksep: 360, nodesep: 200 });

  const [flows, events, commands, queries, services] = await Promise.all([
    getCollection('flows'),
    getCollection('events'),
    getCollection('commands'),
    getCollection('queries'),
    getCollection('services'),
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
    serviceMap: createVersionedMap(services),
    flowMap: createVersionedMap(flows),
  };

  const subFlowCache = new Map<string, { nodes: any[]; edges: any[] }>();
  const { nodes, edges } = buildFlowGraphInternal(
    flow,
    maps,
    mode,
    subFlowCache,
    new Set([`${flow.data.id}@${flow.data.version}`])
  );

  nodes.forEach((node: any) => {
    graph.setNode(node.id, { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT });
  });

  edges.forEach((edge: any) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  return {
    nodes: calculatedNodes(graph, nodes),
    edges: edges,
  };
};
