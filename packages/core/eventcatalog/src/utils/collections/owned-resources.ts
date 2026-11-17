import type { CollectionEntry } from 'astro:content';

// What a team or user owns, as shown on their Owned Resources page, their sidebar and the
// counts on their overview page. Reads the owned* fields that getTeams and getUsers attach.

export type OwnedResourceCollection = 'domains' | 'systems' | 'agents' | 'services' | 'events' | 'commands' | 'queries' | 'adrs';

type ResourceOwnerEntry = { data: Record<string, unknown> };

/** The owned resources, in the order the pages list them, and the field each is read from. */
const OWNED_GROUPS: Array<{ collection: OwnedResourceCollection; key: string }> = [
  { collection: 'domains', key: 'ownedDomains' },
  { collection: 'systems', key: 'ownedSystems' },
  { collection: 'agents', key: 'ownedAgents' },
  { collection: 'services', key: 'ownedServices' },
  { collection: 'events', key: 'ownedEvents' },
  { collection: 'commands', key: 'ownedCommands' },
  { collection: 'queries', key: 'ownedQueries' },
  { collection: 'adrs', key: 'ownedAdrs' },
];

const isCurrentVersion = (entry: { filePath?: string }) => !entry.filePath?.includes('versioned');

/**
 * The current version of every resource a team or user (from getTeams / getUsers) owns, grouped
 * by collection. Older versions are left out, so each resource is listed once.
 */
export const getOwnedResources = (owner: ResourceOwnerEntry) =>
  OWNED_GROUPS.map(({ collection, key }) => ({
    collection,
    items: ((owner.data[key] as CollectionEntry<OwnedResourceCollection>[] | undefined) ?? []).filter(isCurrentVersion),
  }));

export const ownsResources = (owner: ResourceOwnerEntry) => getOwnedResources(owner).some(({ items }) => items.length > 0);
