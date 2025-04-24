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
