/**
 * Builds the data for the catalog-wide force-directed graph (/visualiser/graph).
 *
 * Unlike the ReactFlow node-graphs (which render one resource and its
 * neighbourhood), this flattens the whole catalog into simple `{ nodes, links }`
 * for a D3 force simulation. Only the latest version of each resource is
 * included, and links are resolved by resource id so pinned-version references
 * still connect to the latest node.
 */
import { getDomains } from '@utils/collections/domains';
import { getServices } from '@utils/collections/services';
import { getAgents } from '@utils/collections/agents';
import { getEvents } from '@utils/collections/events';
import { getCommands } from '@utils/collections/commands';
import { getQueries } from '@utils/collections/queries';
import { getFlows } from '@utils/collections/flows';
import { getEntities } from '@utils/collections/entities';
import { getContainers } from '@utils/collections/containers';
import { getDataProducts } from '@utils/collections/data-products';
import { getSystems } from '@utils/collections/systems';
import { getTeams } from '@utils/collections/teams';
import { buildUrl } from '@utils/url-builder';

export interface CatalogGraphNode {
  id: string;
  label: string;
  collection: string;
  version?: string;
  url?: string;
}

export interface CatalogGraphLink {
  source: string;
  target: string;
  label: string;
}

type AnyEntry = {
  collection?: string;
  data: { id: string; name?: string; version?: string; latestVersion?: string; visualiser?: boolean };
};

const nodeKey = (collection: string, id: string) => `${collection}/${id}`;

// Relationship values come in three shapes depending on hydration: a raw string
// id, a pointer/reference ({ id }) or a full collection entry ({ data: { id } }).
const refId = (ref: unknown): string | undefined => {
  if (!ref) return undefined;
  if (typeof ref === 'string') return ref;
  if (Array.isArray(ref)) return refId(ref[0]);
  const value = ref as { data?: { id?: string }; id?: string };
  return value.data?.id ?? value.id;
};

const messageLabels: Record<string, { sends: string; receives: string }> = {
  events: { sends: 'publishes', receives: 'subscribed by' },
  commands: { sends: 'invokes', receives: 'accepts' },
  queries: { sends: 'requests', receives: 'accepts' },
};

export const getCatalogForceGraph = async (): Promise<{ nodes: CatalogGraphNode[]; links: CatalogGraphLink[] }> => {
  const [domains, services, agents, events, commands, queries, flows, entities, containers, dataProducts, systems] =
    await Promise.all([
      // Strict containment: a parent domain should not also claim its subdomains' services
      getDomains({ includeServicesInSubdomains: false }),
      getServices(),
      getAgents(),
      getEvents(),
      getCommands(),
      getQueries(),
      getFlows(),
      getEntities(),
      getContainers(),
      getDataProducts(),
      getSystems(),
    ]);
  const teams = await getTeams();

  // Latest version of each resource only, honouring the resource-level
  // `visualiser: false` opt-out (matching the other visualiser views)
  const latestOnly = <T extends AnyEntry>(items: T[]): T[] =>
    items.filter(
      (item) => item.data.visualiser !== false && (!item.data.latestVersion || item.data.version === item.data.latestVersion)
    );

  const collections: Record<string, AnyEntry[]> = {
    domains: latestOnly(domains as AnyEntry[]),
    services: latestOnly(services as AnyEntry[]),
    agents: latestOnly(agents as AnyEntry[]),
    events: latestOnly(events as AnyEntry[]),
    commands: latestOnly(commands as AnyEntry[]),
    queries: latestOnly(queries as AnyEntry[]),
    flows: latestOnly(flows as AnyEntry[]),
    entities: latestOnly(entities as AnyEntry[]),
    containers: latestOnly(containers as AnyEntry[]),
    'data-products': latestOnly(dataProducts as AnyEntry[]),
    systems: latestOnly(systems as AnyEntry[]),
    teams: teams as AnyEntry[],
  };

  const nodes = new Map<string, CatalogGraphNode>();
  const links = new Map<string, CatalogGraphLink>();

  for (const [collection, items] of Object.entries(collections)) {
    for (const item of items) {
      const { id, name, version } = item.data;
      const url =
        collection === 'teams'
          ? buildUrl(`/docs/${collection}/${id}`)
          : buildUrl(`/docs/${collection}/${id}/${version ?? 'latest'}`);
      nodes.set(nodeKey(collection, id), { id: nodeKey(collection, id), label: name || id, collection, version, url });
    }
  }

  const addLink = (source: string | undefined, target: string | undefined, label: string) => {
    if (!source || !target || source === target) return;
    if (!nodes.has(source) || !nodes.has(target)) return;
    // One rendered link per direction, but distinct relationships between the
    // same pair (e.g. two entity properties with different relationTypes) keep
    // all their labels rather than the last one silently winning
    const key = `${source}->${target}`;
    const existing = links.get(key);
    if (existing) {
      if (!existing.label.split(' / ').includes(label)) existing.label = `${existing.label} / ${label}`;
      return;
    }
    links.set(key, { source, target, label });
  };

  // Individual users are deliberately not rendered — only team ownership is,
  // so owner pointers at users resolve to nothing here.
  const teamIds = new Set(collections.teams.map((team) => team.data.id));
  const ownerKey = (ref: unknown) => {
    const id = refId(ref);
    return id && teamIds.has(id) ? nodeKey('teams', id) : undefined;
  };

  // Data product inputs/outputs are polymorphic — resolve the collection by id.
  // Precedence mirrors the data product node-graph, which merges message, service
  // and container maps in that order with later maps overriding: containers win
  // over services, which win over messages.
  const polymorphicKey = (ref: unknown) => {
    const id = refId(ref);
    if (!id) return undefined;
    for (const collection of ['containers', 'services', 'events', 'commands', 'queries']) {
      const key = nodeKey(collection, id);
      if (nodes.has(key)) return key;
    }
    return undefined;
  };

  const addMessageLinks = (sourceKey: string, data: any) => {
    for (const message of data.sends ?? []) {
      const collection = (message as AnyEntry).collection ?? 'events';
      addLink(sourceKey, nodeKey(collection, refId(message)!), messageLabels[collection]?.sends ?? 'sends');
    }
    for (const message of data.receives ?? []) {
      const collection = (message as AnyEntry).collection ?? 'events';
      addLink(nodeKey(collection, refId(message)!), sourceKey, messageLabels[collection]?.receives ?? 'received by');
    }
  };

  for (const domain of collections.domains) {
    const key = nodeKey('domains', domain.data.id);
    const data = domain.data as any;
    for (const service of data.services ?? []) addLink(key, nodeKey('services', refId(service)!), 'contains');
    for (const agent of data.agents ?? []) addLink(key, nodeKey('agents', refId(agent)!), 'contains');
    for (const subdomain of data.domains ?? []) addLink(key, nodeKey('domains', refId(subdomain)!), 'contains');
    for (const system of data.systems ?? []) addLink(key, nodeKey('systems', refId(system)!), 'contains');
    for (const flow of data.flows ?? []) addLink(key, nodeKey('flows', refId(flow)!), 'contains');
    for (const dataProduct of data['data-products'] ?? [])
      addLink(key, nodeKey('data-products', refId(dataProduct)!), 'contains');
    for (const entity of data.entities ?? []) addLink(key, nodeKey('entities', refId(entity)!), 'owns');
    addMessageLinks(key, data);
  }

  for (const serviceLike of [...collections.services, ...collections.agents]) {
    const key = nodeKey(serviceLike.collection!, serviceLike.data.id);
    const data = serviceLike.data as any;
    addMessageLinks(key, data);
    for (const container of data.writesTo ?? []) addLink(key, nodeKey('containers', refId(container)!), 'writes to');
    for (const container of data.readsFrom ?? []) addLink(nodeKey('containers', refId(container)!), key, 'read by');
    for (const entity of data.entities ?? []) addLink(key, nodeKey('entities', refId(entity)!), 'owns');
    for (const flow of data.flows ?? []) addLink(key, nodeKey('flows', refId(flow)!), 'part of');
  }

  for (const system of collections.systems) {
    const key = nodeKey('systems', system.data.id);
    const data = system.data as any;
    for (const service of data.services ?? []) addLink(key, nodeKey('services', refId(service)!), 'contains');
    for (const container of data.containers ?? []) addLink(key, nodeKey('containers', refId(container)!), 'contains');
    for (const entity of data.entities ?? []) addLink(key, nodeKey('entities', refId(entity)!), 'contains');
    for (const flow of data.flows ?? []) addLink(key, nodeKey('flows', refId(flow)!), 'contains');
    for (const relationship of data.relationships ?? []) {
      addLink(key, nodeKey('systems', refId(relationship)!), relationship.label || 'connects to');
    }
  }

  for (const flow of collections.flows) {
    const key = nodeKey('flows', flow.data.id);
    for (const step of (flow.data as any).steps ?? []) {
      addLink(key, nodeKey('services', refId(step.service)!), 'references');
      addLink(key, nodeKey('agents', refId(step.agent)!), 'references');
      addLink(key, nodeKey('flows', refId(step.flow)!), 'has sub-flow');
      addLink(key, nodeKey('containers', refId(step.container)!), 'references');
      addLink(key, nodeKey('data-products', refId(step.dataProduct)!), 'references');
      const messageId = refId(step.message);
      if (messageId) {
        for (const collection of ['events', 'commands', 'queries']) {
          if (nodes.has(nodeKey(collection, messageId))) {
            addLink(key, nodeKey(collection, messageId), 'references');
            break;
          }
        }
      }
    }
  }

  for (const entity of collections.entities) {
    const key = nodeKey('entities', entity.data.id);
    for (const property of (entity.data as any).properties ?? []) {
      // Same inference as the entity map: an explicit `references`, or an array
      // property whose item type names another entity (an implicit hasMany)
      const referencedId =
        property?.references ??
        (property?.type === 'array' && nodes.has(nodeKey('entities', property?.items?.type)) ? property.items.type : undefined);
      if (!referencedId) continue;
      const label = property.relationType || (property.type === 'array' ? 'hasMany' : 'references');
      addLink(key, nodeKey('entities', referencedId), label);
    }
  }

  for (const dataProduct of collections['data-products']) {
    const key = nodeKey('data-products', dataProduct.data.id);
    const data = dataProduct.data as any;
    for (const input of data.inputs ?? []) addLink(polymorphicKey(input), key, 'input');
    for (const output of data.outputs ?? []) addLink(key, polymorphicKey(output), 'output');
  }

  for (const [collection, items] of Object.entries(collections)) {
    if (collection === 'teams') continue;
    for (const item of items) {
      for (const owner of (item.data as any).owners ?? []) {
        addLink(nodeKey(collection, item.data.id), ownerKey(owner), 'owned by');
      }
    }
  }

  return { nodes: [...nodes.values()], links: [...links.values()] };
};
