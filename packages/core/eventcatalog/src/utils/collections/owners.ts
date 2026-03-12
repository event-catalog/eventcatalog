import { getCollection, type CollectionEntry } from 'astro:content';

const getOwners = (function () {
  type Owners = CollectionEntry<'users' | 'teams'>;
  let cachedOwners: Map<string, Owners> | null = null;
  let initializingPromise: Promise<Map<string, Owners>> | null = null;

  /**
   * Initializes and caches the owners by fetching from the 'users' and 'teams' collections.
   */
  async function init() {
    const ownersMap = new Map<string, CollectionEntry<'users' | 'teams'>>();

    const owners = await Promise.all([
      getCollection('users', (entry) => entry.data.hidden !== true),
      getCollection('teams', (entry) => entry.data.hidden !== true),
    ]);

    for (const owner of owners.flat()) {
      ownersMap.set(owner.data.id, owner);
    }

    cachedOwners = ownersMap;
    initializingPromise = null;

    return cachedOwners;
  }

  return () =>
    cachedOwners || // Return cached owners if already initialized
    initializingPromise || // Return the promise if initialization is in progress
    (initializingPromise = init()); // Initialize if neither cache nor promise exists
})();

export async function getOwner(lookup: { id: string }): Promise<CollectionEntry<'users' | 'teams'> | undefined> {
  const lookupId = typeof lookup === 'string' ? lookup : lookup.id;

  const owner = (await getOwners()).get(lookupId);

  if (!owner) console.warn(`Entry ${lookupId} not found in "teams"/"users" collections.`);

  return owner;
}

export interface OwnerDetail {
  id: string;
  name: string;
  type: 'users' | 'teams' | 'unknown';
  role: string | undefined;
}

/**
 * Resolves a list of raw owner references to detailed owner objects including type and role.
 * Falls back to a minimal object with the raw ID if the owner cannot be found.
 */
export async function getOwnerDetails(rawOwners: (string | { id: string })[]): Promise<OwnerDetail[]> {
  return Promise.all(
    rawOwners.map(async (owner) => {
      const ownerId = typeof owner === 'string' ? owner : owner.id;
      const resolved = await getOwner({ id: ownerId });
      if (!resolved) return { id: ownerId, name: ownerId, type: 'unknown' as const, role: undefined };
      return {
        id: resolved.data.id,
        name: resolved.data.name,
        type: resolved.collection as 'users' | 'teams',
        role: resolved.collection === 'users' ? (resolved.data as any).role : (resolved.data as any).summary,
      };
    })
  );
}

/**
 * Resolves a list of raw owner references (string IDs or {id} objects) to their display names.
 * Falls back to the raw ID if the owner cannot be found.
 */
export async function getOwnerNames(rawOwners: (string | { id: string })[]): Promise<string[]> {
  const details = await getOwnerDetails(rawOwners);
  return details.map((d) => d.name);
}
