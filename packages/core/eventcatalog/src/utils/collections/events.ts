import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { createVersionedMap } from './util';
import { buildProducerConsumerIndex, lookupProducersAndConsumers } from './messages';

const CACHE_ENABLED = process.env.DISABLE_EVENTCATALOG_CACHE !== 'true';

type Event = CollectionEntry<'events'>;

interface Props {
  getAllVersions?: boolean;
  hydrateServices?: boolean;
}

// Simple in-memory cache
let memoryCache: Record<string, Event[]> = {};

export const getEvents = async ({ getAllVersions = true, hydrateServices = true }: Props = {}): Promise<Event[]> => {
  // console.time('✅ New getEvents');
  const cacheKey = `${getAllVersions ? 'allVersions' : 'currentVersions'}-${hydrateServices ? 'hydrated' : 'minimal'}`;

  // Check cache
  if (memoryCache[cacheKey] && memoryCache[cacheKey].length > 0 && CACHE_ENABLED) {
    // console.timeEnd('✅ New getEvents');
    return memoryCache[cacheKey];
  }

  // 1. Fetch collections in parallel
  const [allEvents, allServices, allChannels, allDataProducts] = await Promise.all([
    getCollection('events'),
    getCollection('services'),
    getCollection('channels'),
    getCollection('data-products'),
  ]);

  // 2. Build optimized maps
  const eventMap = createVersionedMap(allEvents);
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

  // 3. Filter events
  const targetEvents = allEvents.filter((event) => {
    if (event.data.hidden === true) return false;
    if (!getAllVersions && event.filePath?.includes('versioned')) return false;
    return true;
  });

  // 4. Enrich events
  const processedEvents = await Promise.all(
    targetEvents.map(async (event) => {
      // Version info
      const eventVersions = eventMap.get(event.data.id) || [];
      const latestVersion = eventVersions[0]?.data.version || event.data.version;
      const versions = eventVersions.map((e) => e.data.version);

      // Find producers and consumers via reverse index
      const { producers, consumers } = lookupProducersAndConsumers({
        message: { data: { ...event.data, latestVersion } },
        index: pcIndex,
        hydrate: hydrateServices,
      });

      // Find Channels via map lookup
      const messageChannels = event.data.channels || [];
      const channelsForEvent = messageChannels.flatMap((channel) => channelById.get(channel.id) || []);

      return {
        ...event,
        data: {
          ...event.data,
          messageChannels: channelsForEvent,
          producers: producers as any,
          consumers: consumers as any,
          versions,
          latestVersion,
        },
      };
    })
  );

  // order them by the name of the event
  processedEvents.sort((a, b) => {
    return (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id);
  });

  memoryCache[cacheKey] = processedEvents;
  // console.timeEnd('✅ New getEvents');

  return processedEvents;
};
