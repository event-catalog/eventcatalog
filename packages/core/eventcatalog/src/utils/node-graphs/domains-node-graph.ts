import { getCollection } from 'astro:content';
import dagre from 'dagre';
import {
  createDagreGraph,
  calculatedNodes,
  generateIdForNode,
  getEdgeLabelForServiceAsTarget,
  generatedIdForEdge,
  createEdge,
} from '@utils/node-graphs/utils/utils';
import { getNodesAndEdges as getServicesNodeAndEdges } from './services-node-graph';
import { getNodesAndEdges as getAgentsNodeAndEdges } from './agents-node-graph';
import { getNodesAndEdges as getDataProductsNodeAndEdges } from './data-products-node-graph';
import merge from 'lodash.merge';
import { createVersionedMap, findInMap } from '@utils/collections/util';
import { getProducersOfMessage } from '@utils/collections/services';
import { getProducersOfMessage as getAgentProducersOfMessage } from '@utils/collections/agents';

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

  // Add group node to the graph first before calculating positions
  if (group) {
    // Update the data of the node to add the group name and color
    nodes.forEach((n) => {
      nodes.set(n.id, { ...n, data: { ...n.data, group: { type: 'Domain', value: domain?.data.name, id: domain?.data.id } } });
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
