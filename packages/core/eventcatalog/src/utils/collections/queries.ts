import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { createVersionedMap } from './util';
import { buildProducerConsumerIndex, lookupProducersAndConsumers } from './messages';

const CACHE_ENABLED = process.env.DISABLE_EVENTCATALOG_CACHE !== 'true';

type Query = CollectionEntry<'queries'>;

interface Props {
  getAllVersions?: boolean;
  hydrateServices?: boolean;
}

// Cache for build time
let memoryCache: Record<string, Query[]> = {};

export const getQueries = async ({ getAllVersions = true, hydrateServices = true }: Props = {}): Promise<Query[]> => {
  // console.time('✅ New getQueries');
  const cacheKey = `${getAllVersions ? 'allVersions' : 'currentVersions'}-${hydrateServices ? 'hydrated' : 'minimal'}`;

  if (memoryCache[cacheKey] && memoryCache[cacheKey].length > 0 && CACHE_ENABLED) {
    // console.timeEnd('✅ New getQueries');
    return memoryCache[cacheKey];
  }

  // 1. Fetch collections in parallel
  const [allQueries, allServices, allChannels, allDataProducts] = await Promise.all([
    getCollection('queries'),
    getCollection('services'),
    getCollection('channels'),
    getCollection('data-products'),
  ]);

  // 2. Build optimized maps
  const queryMap = createVersionedMap(allQueries);
  const pcIndex = buildProducerConsumerIndex(allServices, allDataProducts);

  // Build channel lookup map: channelId → channel entries
  const channelById = new Map<string, typeof allChannels>();
  for (const ch of allChannels) {
    let list = channelById.get(ch.data.id);
    if (!list) {
      list = [];
      channelById.set(ch.data.id, list);
    }
    list.push(ch);
  }

  // 3. Filter queries
  const targetQueries = allQueries.filter((query) => {
    if (query.data.hidden === true) return false;
    if (!getAllVersions && query.filePath?.includes('versioned')) return false;
    return true;
  });

  // 4. Enrich queries
  const processedQueries = await Promise.all(
    targetQueries.map(async (query) => {
      // Version info
      const queryVersions = queryMap.get(query.data.id) || [];
      const latestVersion = queryVersions[0]?.data.version || query.data.version;
      const versions = queryVersions.map((e) => e.data.version);

      // Find producers and consumers via reverse index
      const { producers, consumers } = lookupProducersAndConsumers({
        message: { data: { ...query.data, latestVersion } },
        index: pcIndex,
        hydrate: hydrateServices,
      });

      // Find Channels via map lookup
      const messageChannels = query.data.channels || [];
      const channelsForQuery = messageChannels.flatMap((channel) => channelById.get(channel.id) || []);

      return {
        ...query,
        data: {
          ...query.data,
          messageChannels: channelsForQuery,
          producers: producers as any,
          consumers: consumers as any,
          versions,
          latestVersion,
        },
      };
    })
  );

  // order them by the name of the query
  processedQueries.sort((a, b) => {
    return (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id);
  });

  memoryCache[cacheKey] = processedQueries;
  // console.timeEnd('✅ New getQueries');

  return processedQueries;
};
