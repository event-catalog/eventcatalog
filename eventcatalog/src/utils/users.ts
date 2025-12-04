import type { CollectionTypes } from '@types';
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';

export type User = CollectionEntry<'users'>;

// Simple in-memory cache
let memoryCache: User[] = [];

export const getUsers = async (): Promise<User[]> => {
  // console.time('✅ New getUsers');

  if (memoryCache.length > 0) {
    // console.timeEnd('✅ New getUsers');
    return memoryCache;
  }

  // 1. Fetch all collections in parallel
  const [allUsers, allDomains, allServices, allEvents, allCommands, allQueries, allTeams] = await Promise.all([
    getCollection('users'),
    getCollection('domains'),
    getCollection('services'),
    getCollection('events'),
    getCollection('commands'),
    getCollection('queries'),
    getCollection('teams'),
  ]);

  // 2. Filter users
  const targetUsers = allUsers.filter((user) => user.data.hidden !== true);
  const visibleTeams = allTeams.filter((team) => team.data.hidden !== true);

  // 3. Process users (Optimization: Iterate once over relationships if possible,
  // but since we need to check ownership for EACH user against ALL items,
  // we can't easily invert the map without building an "owner" index first.
  // Given users/teams count is usually lower than events/services, iterating users and filtering items is acceptable,
  // OR we can index items by ownerID for O(1) lookup. Let's try indexing items by ownerID.)

  // Build Owner Index: Map<OwnerID, Item[]>
  const ownershipMap = new Map<string, CollectionEntry<CollectionTypes>[]>();

  const addToIndex = (items: CollectionEntry<CollectionTypes>[]) => {
    for (const item of items) {
      if (item.data.owners) {
        for (const owner of item.data.owners) {
          if (!ownershipMap.has(owner.id)) {
            ownershipMap.set(owner.id, []);
          }
          ownershipMap.get(owner.id)!.push(item);
        }
      }
    }
  };

  addToIndex(allDomains);
  addToIndex(allServices);
  addToIndex(allEvents);
  addToIndex(allCommands);
  addToIndex(allQueries);

  // Team Membership Index: Map<UserID, Team[]>
  const teamMembershipMap = new Map<string, typeof visibleTeams>();
  for (const team of visibleTeams) {
    if (team.data.members) {
      for (const member of team.data.members) {
        if (!teamMembershipMap.has(member.id)) {
          teamMembershipMap.set(member.id, []);
        }
        teamMembershipMap.get(member.id)!.push(team);
      }
    }
  }

  const mappedUsers = targetUsers.map((user) => {
    const userId = user.data.id;
    const associatedTeams = teamMembershipMap.get(userId) || [];
    const associatedTeamIds = associatedTeams.map((t) => t.data.id);

    // Collect all owned items directly owned by user OR by their teams
    const directOwnedItems = ownershipMap.get(userId) || [];
    const teamOwnedItems = associatedTeamIds.flatMap((teamId) => ownershipMap.get(teamId) || []);

    // Combine and deduplicate items (by ID+Version or just reference equality since they come from same source arrays)
    const allOwnedItems = Array.from(new Set([...directOwnedItems, ...teamOwnedItems]));

    // Categorize items
    const ownedDomains = allOwnedItems.filter((i) => i.collection === 'domains') as CollectionEntry<'domains'>[];
    const ownedServices = allOwnedItems.filter((i) => i.collection === 'services') as CollectionEntry<'services'>[];
    const ownedEvents = allOwnedItems.filter((i) => i.collection === 'events') as CollectionEntry<'events'>[];
    const ownedCommands = allOwnedItems.filter((i) => i.collection === 'commands') as CollectionEntry<'commands'>[];
    const ownedQueries = allOwnedItems.filter((i) => i.collection === 'queries') as CollectionEntry<'queries'>[];

    return {
      ...user,
      data: {
        ...user.data,
        ownedDomains,
        ownedServices,
        ownedEvents,
        ownedCommands,
        ownedQueries,
        associatedTeams,
      },
      catalog: {
        path: path.join(user.collection, user.id.replace('/index.mdx', '')),
        filePath: path.join(process.cwd(), 'src', 'catalog-files', user.collection, user.id.replace('/index.mdx', '')),
        type: 'user',
      },
    };
  });

  // order them by the name of the user
  mappedUsers.sort((a, b) => {
    return (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id);
  });

  memoryCache = mappedUsers;
  // console.timeEnd('✅ New getUsers');

  return mappedUsers;
};
