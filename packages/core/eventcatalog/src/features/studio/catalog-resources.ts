import { getDomains } from '@utils/collections/domains';
import { getSystems } from '@utils/collections/systems';
import { getServices } from '@utils/collections/services';
import { getEvents } from '@utils/collections/events';
import { getCommands } from '@utils/collections/commands';
import { getQueries } from '@utils/collections/queries';
import { getChannels } from '@utils/collections/channels';
import { getContainers } from '@utils/collections/containers';
import { buildUrl } from '@utils/url-builder';

/** A catalog resource that can be dropped onto the canvas (latest version only) */
export type CatalogResource = {
  /** `${collection}:${id}`, stored on the canvas node so relationships can be found */
  key: string;
  collection: string;
  id: string;
  version: string;
  name: string;
  summary?: string;
  url: string;
  node: { type: string; data: Record<string, unknown> };
};

/** A relationship between two catalog resources, by key */
export type CatalogRelation = { source: string; target: string; label?: string };

const keyOf = (collection: string, id: string) => `${collection}:${id}`;

/** The collection helpers hydrate references (e.g. a domain's services) into entries; their types describe references */
type HydratedEntry = { data: { id: string } };
const isHydratedEntry = (value: unknown): value is HydratedEntry => {
  if (typeof value !== 'object' || value === null || !('data' in value)) return false;
  const { data } = value;
  return typeof data === 'object' && data !== null && 'id' in data && typeof data.id === 'string';
};
const entries = (value: unknown): HydratedEntry[] => (Array.isArray(value) ? value.filter(isHydratedEntry) : []);
const idsOf = (value: unknown) => entries(value).map((entry) => entry.data.id);

const toResource = (
  collection: string,
  entry: { data: { id: string; version: string; name?: string; summary?: string } },
  node: CatalogResource['node']
): CatalogResource => ({
  key: keyOf(collection, entry.data.id),
  collection,
  id: entry.data.id,
  version: entry.data.version,
  name: entry.data.name ?? entry.data.id,
  summary: entry.data.summary,
  url: buildUrl(`/docs/${collection}/${entry.data.id}/${entry.data.version}`),
  node,
});

// Visualiser node data needs plain fields (not collection entries)
const basics = ({ data }: { data: { id: string; version: string; name?: string; summary?: string } }) => ({
  id: data.id,
  version: data.version,
  name: data.name ?? data.id,
  summary: data.summary ?? '',
});

export const getCatalogResources = async (): Promise<{ resources: CatalogResource[]; relations: CatalogRelation[] }> => {
  const [domains, systems, services, events, commands, queries, channels, containers] = await Promise.all([
    getDomains({ getAllVersions: false }),
    getSystems({ getAllVersions: false }),
    getServices({ getAllVersions: false }),
    getEvents({ getAllVersions: false, hydrateServices: false }),
    getCommands({ getAllVersions: false, hydrateServices: false }),
    getQueries({ getAllVersions: false, hydrateServices: false }),
    getChannels({ getAllVersions: false }),
    getContainers({ getAllVersions: false }),
  ]);

  const messages = [
    ...events.map((entry) => ({ entry, collection: 'events', type: 'event' })),
    ...commands.map((entry) => ({ entry, collection: 'commands', type: 'command' })),
    ...queries.map((entry) => ({ entry, collection: 'queries', type: 'query' })),
  ];
  const messageCollection = new Map(messages.map(({ entry, collection }) => [entry.data.id, collection]));

  const resources: CatalogResource[] = [
    ...domains.map((domain) =>
      toResource('domains', domain, {
        type: 'context-domain',
        data: {
          mode: 'full',
          navigable: false,
          domain: basics(domain),
          systemsCount: idsOf(domain.data.systems).length,
          servicesCount: idsOf(domain.data.services).length,
          entitiesCount: idsOf(domain.data.entities).length,
        },
      })
    ),
    ...systems.map((system) =>
      toResource('systems', system, {
        type: 'system',
        data: {
          mode: 'full',
          navigable: false,
          system: { ...basics(system), scope: system.data.scope },
          servicesCount: idsOf(system.data.services).length,
          containersCount: idsOf(system.data.containers).length,
        },
      })
    ),
    ...services.map((service) =>
      toResource('services', service, { type: 'service', data: { mode: 'full', service: basics(service) } })
    ),
    ...messages.map(({ entry, collection, type }) =>
      toResource(collection, entry, { type, data: { mode: 'full', message: basics(entry) } })
    ),
    ...channels.map((channel) =>
      toResource('channels', channel, {
        type: 'channel',
        data: { mode: 'full', channel: { ...basics(channel), protocols: channel.data.protocols ?? [] } },
      })
    ),
    ...containers.map((container) =>
      toResource('containers', container, {
        type: 'data',
        data: { mode: 'full', data: { ...basics(container), container_type: container.data.container_type } },
      })
    ),
  ];

  const relations: CatalogRelation[] = [];
  const relate = (source: string, target: string, label?: string) => relations.push({ source, target, label });

  for (const domain of domains) {
    for (const id of idsOf(domain.data.systems)) relate(keyOf('domains', domain.data.id), keyOf('systems', id), 'contains');
    for (const id of idsOf(domain.data.services)) relate(keyOf('domains', domain.data.id), keyOf('services', id), 'contains');
  }
  for (const system of systems) {
    for (const id of idsOf(system.data.services)) relate(keyOf('systems', system.data.id), keyOf('services', id), 'contains');
  }
  for (const service of services) {
    const serviceKey = keyOf('services', service.data.id);
    for (const id of idsOf(service.data.sends)) {
      const collection = messageCollection.get(id);
      if (collection) relate(serviceKey, keyOf(collection, id));
    }
    for (const id of idsOf(service.data.receives)) {
      const collection = messageCollection.get(id);
      if (collection) relate(keyOf(collection, id), serviceKey);
    }
    for (const id of idsOf(service.data.writesTo)) relate(serviceKey, keyOf('containers', id));
    for (const id of idsOf(service.data.readsFrom)) relate(keyOf('containers', id), serviceKey);
  }

  return { resources, relations };
};
