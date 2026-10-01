import { getCollection } from 'astro:content';
import {
  createDagreGraph,
  calculatedNodes,
  generateIdForNode,
  getEdgeLabelForServiceAsTarget,
  generatedIdForEdge,
  createEdge,
  layoutDagreGraph,
  versionMatches,
} from '@utils/node-graphs/utils/utils';
import { getNodesAndEdges as getServicesNodeAndEdges } from './services-node-graph';
import { getNodesAndEdges as getAgentsNodeAndEdges } from './agents-node-graph';
import { getNodesAndEdges as getDataProductsNodeAndEdges } from './data-products-node-graph';
import merge from 'lodash.merge';
import { createVersionedMap, findInMap } from '@utils/collections/util';
import { getProducersOfMessage } from '@utils/collections/services';
import { getProducersOfMessage as getAgentProducersOfMessage } from '@utils/collections/agents';
import { shouldRouteConsumerMessageAfterChannel } from './utils/shared-channel-messages';

type DagreGraph = any;

interface NodesAndEdgesProps {
  id: string;
  version: string;
  defaultFlow?: DagreGraph;
  mode: 'simple' | 'full';
  group?: boolean;
  channelRenderMode?: 'single' | 'flat';
  layout?: boolean;
}

const MESSAGE_NODE_TYPES = new Set(['events', 'commands', 'queries']);

const findNodeForPointer = (nodes: Map<string, any>, pointer: any, type: 'message' | 'channel') =>
  Array.from(nodes.values()).find((node: any) => {
    const data = type === 'message' ? node.data?.message : node.data?.channel;
    const matchesType = type === 'message' ? MESSAGE_NODE_TYPES.has(node.type) : node.type === 'channels';
    return matchesType && data?.id === pointer?.id && versionMatches(pointer?.version, data?.version);
  });

const routeDistinctConsumerMessagesAfterSharedChannels = (nodes: Map<string, any>, edges: Map<string, any>, flow: DagreGraph) => {
  const serviceNodes = Array.from(nodes.values()).filter((node: any) => node.type === 'services');
  const producerMessageIdsByChannel = new Map<string, Set<string>>();
  const consumerBindingsByChannel = new Map<string, Array<{ serviceNode: any; messageNode: any; channelNode: any }>>();

  for (const serviceNode of serviceNodes) {
    for (const send of serviceNode.data?.service?.sends ?? []) {
      const messageNode = findNodeForPointer(nodes, send, 'message');
      if (!messageNode) continue;
      for (const channelPointer of send.to ?? []) {
        const channelNode = findNodeForPointer(nodes, channelPointer, 'channel');
        if (!channelNode) continue;
        const messageIds = producerMessageIdsByChannel.get(channelNode.id) ?? new Set<string>();
        messageIds.add(messageNode.id);
        producerMessageIdsByChannel.set(channelNode.id, messageIds);
      }
    }

    for (const receive of serviceNode.data?.service?.receives ?? []) {
      const messageNode = findNodeForPointer(nodes, receive, 'message');
      if (!messageNode) continue;
      for (const channelPointer of receive.from ?? []) {
        const channelNode = findNodeForPointer(nodes, channelPointer, 'channel');
        if (!channelNode) continue;
        const bindings = consumerBindingsByChannel.get(channelNode.id) ?? [];
        bindings.push({ serviceNode, messageNode, channelNode });
        consumerBindingsByChannel.set(channelNode.id, bindings);
      }
    }
  }

  const removeEdges = (predicate: (edge: any) => boolean) => {
    const removed = Array.from(edges.entries()).filter(([, edge]) => predicate(edge));
    for (const [edgeId, edge] of removed) {
      edges.delete(edgeId);
      const stillUsed = Array.from(edges.values()).some(
        (remaining: any) => remaining.source === edge.source && remaining.target === edge.target
      );
      if (!stillUsed) flow.removeEdge(edge.source, edge.target);
    }
  };

  const addEdge = (edge: any) => {
    if (edges.has(edge.id)) return;
    edges.set(edge.id, edge);
    flow.setEdge(edge.source, edge.target);
  };

  for (const [channelNodeId, bindings] of consumerBindingsByChannel) {
    const producerMessageIds = producerMessageIdsByChannel.get(channelNodeId) ?? new Set<string>();

    for (const { serviceNode, messageNode, channelNode } of bindings) {
      if (!shouldRouteConsumerMessageAfterChannel(producerMessageIds, messageNode.id)) continue;

      removeEdges((edge) => edge.source === messageNode.id && edge.target === channelNode.id);
      removeEdges((edge) => edge.source === channelNode.id && edge.target === serviceNode.id);

      addEdge(
        createEdge({
          id: `channel-bridge-${channelNode.id}-${messageNode.id}`,
          source: channelNode.id,
          target: messageNode.id,
          label: 'routes to',
          data: { type: 'channel-to-consumer-message' },
        })
      );

      addEdge(
        createEdge({
          id: `channel-bridge-${messageNode.id}-${serviceNode.id}`,
          source: messageNode.id,
          target: serviceNode.id,
          label: messageNode.type === 'events' ? 'subscribed by' : 'accepts',
          data: { type: 'consumer-message-to-service', message: { ...messageNode.data?.message } },
        })
      );
    }
  }
};

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
  const [domains, services, agents, dataProducts] = await Promise.all([
    getCollection('domains'),
    getCollection('services'),
    getCollection('agents'),
    getCollection('data-products'),
  ]);

  const domain = domains.find((service) => service.data.id === id && service.data.version === version);

  // Nothing found...
  if (!domain) {
    return {
      nodes: [],
      edges: [],
    };
  }

  // 2. Build optimized maps
  const serviceMap = createVersionedMap(services);
  const agentMap = createVersionedMap(agents);
  const domainMap = createVersionedMap(domains);
  const dataProductMap = createVersionedMap(dataProducts);

  const rawServices = domain?.data.services || [];
  const rawAgents = domain?.data.agents || [];
  const rawSubDomains = domain?.data.domains || [];
  const rawDataProducts = (domain?.data as any)['data-products'] || [];

  // Optimized hydration
  const domainServicesWithVersion = rawServices
    .map((service) => findInMap(serviceMap, service.id, service.version))
    .filter((s): s is any => !!s)
    .map((svc) => ({ id: svc.data.id, version: svc.data.version }));

  const domainAgentsWithVersion = rawAgents
    .map((agent) => findInMap(agentMap, agent.id, agent.version))
    .filter((a): a is any => !!a)
    .map((agent) => ({ id: agent.data.id, version: agent.data.version }));

  const domainSubDomainsWithVersion = rawSubDomains
    .map((subDomain) => findInMap(domainMap, subDomain.id, subDomain.version))
    .filter((d): d is any => !!d)
    .map((svc) => ({ id: svc.data.id, version: svc.data.version }));

  const domainDataProductsWithVersion = rawDataProducts
    .map((dataProduct: any) => findInMap(dataProductMap, dataProduct.id, dataProduct.version))
    .filter((dp: any): dp is any => !!dp)
    .map((dp: any) => ({ id: dp.data.id, version: dp.data.version }));

  // Get all the nodes for everything

  for (const service of domainServicesWithVersion) {
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
       * A message could be sent by one service and received by another service on the same domain.
       * So, we need deep merge the message to keep the `showSource` and `showTarget` as true.
       *
       * Let's see an example:
       *  Take an `OrderPlaced` event sent by the `OrderService` `{ showSource: true }` and
       *  received by `PaymentService` `{ showTarget: true }`.
       */
      nodes.set(n.id, nodes.has(n.id) ? merge(nodes.get(n.id), n) : n);
    });
    // @ts-ignore
    serviceEdges.forEach((e) => edges.set(e.id, e));
  }

  for (const agent of domainAgentsWithVersion) {
    const { nodes: agentNodes, edges: agentEdges } = await getAgentsNodeAndEdges({
      id: agent.id,
      version: agent.version,
      defaultFlow: flow,
      mode,
      renderAllEdges: true,
      channelRenderMode,
      layout: false,
    });
    agentNodes.forEach((n) => {
      nodes.set(n.id, nodes.has(n.id) ? merge(nodes.get(n.id), n) : n);
    });
    // @ts-ignore
    agentEdges.forEach((e) => edges.set(e.id, e));
  }

  for (const dataProduct of domainDataProductsWithVersion) {
    const { nodes: dataProductNodes, edges: dataProductEdges } = await getDataProductsNodeAndEdges({
      id: dataProduct.id,
      version: dataProduct.version,
      defaultFlow: flow,
      mode,
      layout: false,
    });
    dataProductNodes.forEach((n: any) => {
      nodes.set(n.id, nodes.has(n.id) ? merge(nodes.get(n.id), n) : n);
    });
    // @ts-ignore
    dataProductEdges.forEach((e) => edges.set(e.id, e));
  }

  for (const subDomain of domainSubDomainsWithVersion) {
    const { nodes: subDomainNodes, edges: subDomainEdges } = await getNodesAndEdges({
      id: subDomain.id,
      version: subDomain.version,
      defaultFlow: flow,
      mode,
      group: true,
      channelRenderMode,
      layout: false,
    });
    subDomainNodes.forEach((n) => {
      nodes.set(n.id, nodes.has(n.id) ? merge(nodes.get(n.id), n) : n);
    });

    subDomainEdges.forEach((e) => edges.set(e.id, e));
  }

  routeDistinctConsumerMessagesAfterSharedChannels(nodes, edges, flow);

  // Add group node to the graph first before calculating positions
  if (group) {
    // Update the data of the node to add the group name and color
    nodes.forEach((n) => {
      nodes.set(n.id, { ...n, data: { ...n.data, group: { type: 'Domain', value: domain?.data.name, id: domain?.data.id } } });
    });
  }

  if (layout) {
    layoutDagreGraph(flow);
  }

  return {
    nodes: calculatedNodes(flow, Array.from(nodes.values())),
    edges: [...edges.values()],
  };
};
