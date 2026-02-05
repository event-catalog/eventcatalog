import { getCollection, type CollectionEntry } from 'astro:content';

// Separate cache for teams
const getOwnerTeams = (function () {
  let cachedTeams: Map<string, CollectionEntry<'teams'>> | null = null;
  let initializingPromise: Promise<Map<string, CollectionEntry<'teams'>>> | null = null;

  async function init() {
    const teamsMap = new Map<string, CollectionEntry<'teams'>>();
    const teams = await getCollection('teams', (entry) => entry.data.hidden !== true);

    for (const team of teams) {
      teamsMap.set(team.data.id, team);
    }

    cachedTeams = teamsMap;
    initializingPromise = null;
    return cachedTeams;
  }

  return () => cachedTeams || initializingPromise || (initializingPromise = init());
})();

// Separate cache for users
const getOwnerUsers = (function () {
  let cachedUsers: Map<string, CollectionEntry<'users'>> | null = null;
  let initializingPromise: Promise<Map<string, CollectionEntry<'users'>>> | null = null;

  async function init() {
    const usersMap = new Map<string, CollectionEntry<'users'>>();
    const users = await getCollection('users', (entry) => entry.data.hidden !== true);

    for (const user of users) {
      usersMap.set(user.data.id, user);
    }

    cachedUsers = usersMap;
    initializingPromise = null;
    return cachedUsers;
  }

  return () => cachedUsers || initializingPromise || (initializingPromise = init());
})();

export async function getOwner(lookup: { id: string }): Promise<CollectionEntry<'users' | 'teams'> | undefined> {
  const lookupId = typeof lookup === 'string' ? lookup : lookup.id;

  // Parse type|id syntax by splitting on first | only
  const firstPipeIndex = lookupId.indexOf('|');

  if (firstPipeIndex !== -1) {
    const type = lookupId.substring(0, firstPipeIndex);
    const id = lookupId.substring(firstPipeIndex + 1);

    // Direct lookup if type specified
    if (type === 'team') {
      const owner = (await getOwnerTeams()).get(id);
      if (!owner) console.warn(`Team "${id}" not found in teams collection.`);
      return owner;
    } else if (type === 'user') {
      const owner = (await getOwnerUsers()).get(id);
      if (!owner) console.warn(`User "${id}" not found in users collection.`);
      return owner;
    }
    // Unknown type falls through to ambiguous lookup
  }

  // Fallback: no type specified, check both
  const owner = (await getOwnerUsers()).get(lookupId) ?? (await getOwnerTeams()).get(lookupId);

  if (!owner) console.warn(`Entry "${lookupId}" not found in teams or users collections.`);
  return owner;
}
