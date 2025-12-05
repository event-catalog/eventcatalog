import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';
import { createVersionedMap, findInMap, satisfies } from './util';
import utils from '@eventcatalog/sdk';

const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd();
const CACHE_ENABLED = process.env.DISABLE_EVENTCATALOG_CACHE !== 'true';

type Event = CollectionEntry<'events'> & {
  catalog: {
    path: string;
    filePath: string;
    type: string;
    publicPath: string;
  };
};

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
  const [allEvents, allServices, allChannels] = await Promise.all([
    getCollection('events'),
    getCollection('services'),
    getCollection('channels'),
  ]);

  // 2. Build optimized maps
  const eventMap = createVersionedMap(allEvents);
  // We don't map services/channels by ID because we need to iterate them to find relationships (reverse lookup)
  // or use them for hydration.
  // Actually, for hydration we CAN use a map if we know the IDs, but here we scan services to find producers/consumers.

  // 3. Filter events
  const targetEvents = allEvents.filter((event) => {
    if (event.data.hidden === true) return false;
    if (!getAllVersions && event.filePath?.includes('versioned')) return false;
    return true;
  });

  const { getResourceFolderName } = utils(process.env.PROJECT_DIR ?? '');

  // 4. Enrich events
  const processedEvents = await Promise.all(
    targetEvents.map(async (event) => {
      // Version info
      const eventVersions = eventMap.get(event.data.id) || [];
      const latestVersion = eventVersions[0]?.data.version || event.data.version;
      const versions = eventVersions.map((e) => e.data.version);

      // Find Producers (Services that send this event)
      const producers = allServices
        .filter((service) =>
          service.data.sends?.some((item) => {
            if (item.id !== event.data.id) return false;
            if (item.version === 'latest' || item.version === undefined) return event.data.version === latestVersion;
            return satisfies(event.data.version, item.version);
          })
        )
        .map((service) => {
          if (!hydrateServices) return { id: service.data.id, version: service.data.version };
          return service;
        });

      // Find Consumers (Services that receive this event)
      const consumers = allServices
        .filter((service) =>
          service.data.receives?.some((item) => {
            if (item.id !== event.data.id) return false;
            if (item.version === 'latest' || item.version === undefined) return event.data.version === latestVersion;
            return satisfies(event.data.version, item.version);
          })
        )
        .map((service) => {
          if (!hydrateServices) return { id: service.data.id, version: service.data.version };
          return service;
        });

      // Find Channels
      const messageChannels = event.data.channels || [];
      // This is O(N*M) where N is event channels and M is all channels.
      // Typically M is small, but we could optimize if needed.
      // Given the logic is simply ID match, we can use a Set or Map if needed, but array filter is likely fine for now unless M is huge.
      const channelsForEvent = allChannels.filter((c) => messageChannels.some((channel) => c.data.id === channel.id));

      const folderName = await getResourceFolderName(process.env.PROJECT_DIR ?? '', event.data.id, event.data.version.toString());
      const eventFolderName = folderName ?? event.id.replace(`-${event.data.version}`, '');

      return {
        ...event,
        data: {
          ...event.data,
          messageChannels: channelsForEvent,
          producers: producers as any, // Cast for hydration flexibility
          consumers: consumers as any,
          versions,
          latestVersion,
        },
        catalog: {
          path: path.join(event.collection, event.id.replace('/index.mdx', '')),
          absoluteFilePath: path.join(PROJECT_DIR, event.collection, event.id.replace('/index.mdx', '/index.md')),
          astroContentFilePath: path.join(process.cwd(), 'src', 'content', event.collection, event.id),
          filePath: path.join(process.cwd(), 'src', 'catalog-files', event.collection, event.id.replace('/index.mdx', '')),
          publicPath: path.join('/generated', event.collection, eventFolderName),
          type: 'event',
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
