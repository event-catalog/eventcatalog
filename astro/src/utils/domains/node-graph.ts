import { getCollection } from 'astro:content';
import dagre from 'dagre';
import { getNodesAndEdges as getServicesNodeAndEdges } from '../services/node-graph';
import merge from 'lodash.merge';
import { getItemsFromCollectionByIdAndSemverOrLatest } from '@utils/collections/util';

type DagreGraph = any;

// Creates a new dagre graph
export const getDagreGraph = () => {
  const graph = new dagre.graphlib.Graph({ compound: true });
  graph.setGraph({ rankdir: 'LR', ranksep: 200, nodesep: 100 });
  graph.setDefaultEdgeLabel(() => ({}));
  return graph;
};

interface Props {
  id: string;
  version: string;
  defaultFlow?: DagreGraph;
  mode?: 'simple' | 'full';
}

export const getNodesAndEdges = async ({ id, version, defaultFlow, mode = 'simple' }: Props) => {
  const flow = defaultFlow || getDagreGraph();
  let nodes = new Map(),
    edges = new Map();

  const domains = await getCollection('domains');

  const domain = domains.find((service) => service.data.id === id && service.data.version === version);

  // Nothing found...
  if (!domain) {
    return {
      nodes: [],
      edges: [],
    };
  }

  const rawServices = domain?.data.services || [];

  const servicesCollection = await getCollection('services');

  const domainServicesWithVersion = rawServices
    .map((service) => getItemsFromCollectionByIdAndSemverOrLatest(servicesCollection, service.id, service.version))
    .flat()
    .map((svc) => ({ id: svc.data.id, version: svc.data.version }));

  // Get all the nodes for everyhing

  for (const service of domainServicesWithVersion) {
    const { nodes: serviceNodes, edges: serviceEdges } = await getServicesNodeAndEdges({
      id: service.id,
      version: service.version,
      defaultFlow: flow,
      mode,
      renderAllEdges: true,
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

  return {
    nodes: [...nodes.values()],
    edges: [...edges.values()],
  };
};
