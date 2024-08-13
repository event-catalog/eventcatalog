// import { getColor } from '@utils/colors';
import { getCollection, type CollectionEntry } from 'astro:content';
import dagre from 'dagre';
import { getNodesAndEdges as getServicesNodeAndEdges } from '../services/node-graph';
import { validRange, satisfies } from 'semver';
import merge from 'lodash.merge';

type DagreGraph = any;

// Creates a new dagre graph
export const getDagreGraph = () => {
  const graph = new dagre.graphlib.Graph({ compound: true });
  graph.setGraph({ rankdir: 'LR', ranksep: 200, nodesep: 200 });
  graph.setDefaultEdgeLabel(() => ({}));
  return graph;
};

interface Props {
  id: string;
  version: string;
  defaultFlow?: DagreGraph;
  mode?: 'simple' | 'full';
}

/**
 * Get the services from the collection with the same id that satisfies the
 * semver range (if version is defind) or the latest version (if version is not defined).
 */
const getVersion = (collection: CollectionEntry<'services'>[], id: string, version?: string): CollectionEntry<'services'>[] => {
  const semverRange = validRange(version);

  const filteredCollection = collection.filter((c) => c.data.id == id);

  if (semverRange) {
    return filteredCollection.filter((c) => satisfies(c.data.version, semverRange));
  }

  // Order by version
  const sorted = filteredCollection.sort((a, b) => {
    return a.data.version.localeCompare(b.data.version);
  });

  // latest version
  return sorted.length > 0 ? [sorted[sorted.length - 1]] : [];
};

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
    .map((service) => getVersion(servicesCollection, service.id, service.version))
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
