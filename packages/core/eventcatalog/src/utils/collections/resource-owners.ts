import { getCollection, type CollectionEntry, type CollectionKey } from 'astro:content';
import { getAdrs, getAdrsForResource } from './adrs';
import { getChannelConnections, getChannels } from './channels';
import { getCommands } from './commands';
import { getDomains } from './domains';
import { getEvents } from './events';
import { getFlows, getFlowStepResources, getFlowsWithServiceStep } from './flows';
import { getMessageConnections } from './message-connections';
import { getQueries } from './queries';
import { hasResources, type RelatedResources, type ResourceOwner, type ResourceOwnerCollection } from './resources';
import { getServices } from './services';
import { getSystems } from './systems';

// Loads the owners of Resources pages (domains, systems, services, flows, channels and messages)
// with the resources that point at them attached. Shared by the Resources pages, the sidebar's
// Resources links and the old /architecture redirects, so all three agree on which owners have
// a Resources page.

export const RESOURCE_OWNER_COLLECTIONS: ResourceOwnerCollection[] = [
  'domains',
  'systems',
  'services',
  'flows',
  'channels',
  'events',
  'commands',
  'queries',
];

export const loadResourceOwners = async (type: ResourceOwnerCollection): Promise<ResourceOwner[]> => {
  switch (type) {
    case 'systems':
      return getSystems();
    case 'services':
      return getServices();
    case 'flows':
      return getFlows();
    case 'channels':
      return getChannels();
    case 'events':
      return getEvents();
    case 'commands':
      return getCommands();
    case 'queries':
      return getQueries();
    case 'domains':
      return getDomains({ includeServicesInSubdomains: false });
  }
};

const once = <T>(load: () => Promise<T>) => {
  let loaded: Promise<T> | undefined;
  return () => (loaded ??= load());
};

const isCurrentVersion = (entry: { data: { hidden?: boolean }; filePath?: string }) =>
  entry.data.hidden !== true && !entry.filePath?.includes('versioned');

// Owners come from their own collection's loader, so an owner of a type is that collection's entry.
const asEntry = <C extends CollectionKey>(owner: ResourceOwner) => owner as unknown as CollectionEntry<C>;

/**
 * What the related-resource lookups read. Each part loads the first time it is needed and is
 * then shared, so working out every owner of a type, or every type, reads the catalog once.
 */
export const createResourcesCatalog = () => {
  const catalog = {
    adrs: once(() => getAdrs({ getAllVersions: false })),
    services: once(() => getServices()),
    allFlows: once(() => getFlows()),
    currentFlows: once(() => getFlows({ getAllVersions: false })),
    rawChannels: once(() => getCollection('channels')),
    rawMessages: once(async () => [
      ...(await getCollection('events')),
      ...(await getCollection('commands')),
      ...(await getCollection('queries')),
    ]),
    messages: once(async () => [...(await getEvents()), ...(await getCommands()), ...(await getQueries())]),
    // Raw entries keep the channel and trigger pointers on sends/receives that hydration drops.
    // Like the sidebar, channels use the current services and agents and triggers use every version.
    currentEndpoints: once(async () =>
      [...(await getCollection('services')), ...(await getCollection('agents'))].filter(isCurrentVersion)
    ),
    receivers: once(async () => [
      ...(await getCollection('services')),
      ...(await getCollection('agents')),
      ...(await getCollection('domains')),
    ]),
  };
  return catalog;
};

export type ResourcesCatalog = ReturnType<typeof createResourcesCatalog>;

type Relate = (owner: ResourceOwner) => RelatedResources;

// Loads what a type's lookups need, then returns a function that works out one owner's related resources.
const relatedResourcesFor = async (type: ResourceOwnerCollection, catalog: ResourcesCatalog): Promise<Relate> => {
  const adrs = await catalog.adrs();
  const adrsFor = (owner: ResourceOwner) => getAdrsForResource(asEntry<ResourceOwnerCollection>(owner), adrs);

  switch (type) {
    case 'services': {
      const [flows, services] = await Promise.all([catalog.currentFlows(), catalog.services()]);
      return (owner) => ({
        adrs: adrsFor(owner),
        stepFlows: getFlowsWithServiceStep(asEntry<'services'>(owner), flows, services),
      });
    }
    case 'flows': {
      const [services, flows] = await Promise.all([catalog.services(), catalog.allFlows()]);
      return (owner) => ({
        adrs: adrsFor(owner),
        stepResources: getFlowStepResources(asEntry<'flows'>(owner), { services, flows }),
      });
    }
    case 'channels': {
      const [endpoints, channels, messages] = await Promise.all([
        catalog.currentEndpoints(),
        catalog.rawChannels(),
        catalog.rawMessages(),
      ]);
      return (owner) => {
        const {
          producers,
          consumers,
          messages: channelMessages,
        } = getChannelConnections(asEntry<'channels'>(owner), { endpoints, channels, messages });
        return { adrs: adrsFor(owner), channelProducers: producers, channelConsumers: consumers, channelMessages };
      };
    }
    case 'events':
    case 'commands':
    case 'queries': {
      const [receivers, messages, channels, flows] = await Promise.all([
        catalog.receivers(),
        catalog.messages(),
        catalog.rawChannels(),
        catalog.currentFlows(),
      ]);
      return (owner) => {
        const connections = getMessageConnections(asEntry<'events' | 'commands' | 'queries'>(owner), {
          receivers,
          messages,
          channels,
          flows,
        });
        return {
          adrs: adrsFor(owner),
          messageChannels: connections.channels,
          messageFlows: connections.flows,
          messageTriggers: connections.triggers,
          messageTriggeredBy: connections.triggeredBy,
        };
      };
    }
    default:
      return (owner) => ({ adrs: adrsFor(owner) });
  }
};

/** Every owner of the type with a Resources page, with its related resources attached. */
export const getOwnersWithResources = async (type: ResourceOwnerCollection, catalog = createResourcesCatalog()) => {
  const [owners, relate] = await Promise.all([loadResourceOwners(type), relatedResourcesFor(type, catalog)]);
  return owners.map((owner) => ({ ...owner, ...relate(owner) })).filter((owner) => hasResources(owner, type));
};

/** One owner with its related resources, or null when it does not exist or has no Resources page. Only that owner's lookups run. */
export const findOwnerWithResources = async (
  type: ResourceOwnerCollection,
  id: string,
  version: string,
  catalog = createResourcesCatalog()
): Promise<ResourceOwner | null> => {
  const owner = (await loadResourceOwners(type)).find(
    (candidate) => candidate.data.id === id && candidate.data.version === version
  );
  if (!owner) return null;
  const withRelated = { ...owner, ...(await relatedResourcesFor(type, catalog))(owner) };
  return hasResources(withRelated, type) ? withRelated : null;
};

/** `collection:id:version` of every owner with a Resources page, for links to those pages. */
export const getResourcesPageKeys = async (catalog = createResourcesCatalog()) => {
  const keys = new Set<string>();
  // One type at a time; the shared catalog means each part is still read only once.
  for (const type of RESOURCE_OWNER_COLLECTIONS) {
    for (const owner of await getOwnersWithResources(type, catalog)) {
      keys.add(`${type}:${owner.data.id}:${owner.data.version}`);
    }
  }
  return keys;
};
