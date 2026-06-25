import type { CollectionTypes } from '@types';
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { getAdrs } from './adrs';

export type Team = CollectionEntry<'teams'>;
const CACHE_ENABLED = process.env.DISABLE_EVENTCATALOG_CACHE !== 'true';
// Cache for build time
let memoryCache: Team[] = [];

export const getTeams = async (): Promise<Team[]> => {
  // console.time('✅ New getTeams');
  if (memoryCache.length > 0 && CACHE_ENABLED) {
    // console.timeEnd('✅ New getTeams');
    return memoryCache;
  }

  // 1. Fetch all collections in parallel
  const [allTeams, allAgents, allDomains, allSystems, allServices, allEvents, allCommands, allQueries, allAdrs] =
    await Promise.all([
      getCollection('teams'),
      getCollection('agents'),
      getCollection('domains'),
      getCollection('systems'),
      getCollection('services'),
      getCollection('events'),
      getCollection('commands'),
      getCollection('queries'),
      getAdrs({ getAllVersions: false }),
    ]);

  // 2. Filter teams
  const targetTeams = allTeams.filter((team) => team.data.hidden !== true);

  // 3. Build Owner Index: Map<OwnerID, Item[]>
  // This index groups all items (domains, services, etc.) by their owner IDs.
  // This allows O(1) lookup to find all items owned by a specific team.
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

  addToIndex(allAgents);
  addToIndex(allDomains);
  addToIndex(allSystems);
  addToIndex(allServices);
  addToIndex(allEvents);
  addToIndex(allCommands);
  addToIndex(allQueries);
  addToIndex(allAdrs);

  // 4. Enrich teams using the ownership index
  const processedTeams = targetTeams.map((team) => {
    const teamId = team.data.id;
    const ownedItems = ownershipMap.get(teamId) || [];

    // Categorize items
    const ownedAgents = ownedItems.filter((i) => i.collection === 'agents') as CollectionEntry<'agents'>[];
    const ownedDomains = ownedItems.filter((i) => i.collection === 'domains') as CollectionEntry<'domains'>[];
    const ownedSystems = ownedItems.filter((i) => i.collection === 'systems') as CollectionEntry<'systems'>[];
    const ownedServices = ownedItems.filter((i) => i.collection === 'services') as CollectionEntry<'services'>[];
    const ownedEvents = ownedItems.filter((i) => i.collection === 'events') as CollectionEntry<'events'>[];
    const ownedCommands = ownedItems.filter((i) => i.collection === 'commands') as CollectionEntry<'commands'>[];
    const ownedQueries = ownedItems.filter((i) => i.collection === 'queries') as CollectionEntry<'queries'>[];
    const ownedAdrs = ownedItems.filter((i) => i.collection === 'adrs') as CollectionEntry<'adrs'>[];

    return {
      ...team,
      data: {
        ...team.data,
        ownedAgents,
        ownedDomains,
        ownedSystems,
        ownedServices,
        ownedCommands,
        ownedQueries,
        ownedEvents,
        ownedAdrs,
      },
    };
  });

  // order them by the name of the team
  processedTeams.sort((a, b) => {
    return (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id);
  });

  memoryCache = processedTeams;
  // console.timeEnd('✅ New getTeams');

  return processedTeams;
};
