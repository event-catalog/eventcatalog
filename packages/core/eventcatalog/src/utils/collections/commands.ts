import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { createVersionedMap } from './util';
import { buildProducerConsumerIndex, lookupProducersAndConsumers } from './messages';

const CACHE_ENABLED = process.env.DISABLE_EVENTCATALOG_CACHE !== 'true';

type Command = CollectionEntry<'commands'>;

interface Props {
  getAllVersions?: boolean;
  hydrateServices?: boolean;
}

// Simple in-memory cache
let memoryCache: Record<string, Command[]> = {};

export const getCommands = async ({ getAllVersions = true, hydrateServices = true }: Props = {}): Promise<Command[]> => {
  // console.time('✅ New getCommands');
  const cacheKey = `${getAllVersions ? 'allVersions' : 'currentVersions'}-${hydrateServices ? 'hydrated' : 'minimal'}`;

  // Check cache
  if (memoryCache[cacheKey] && memoryCache[cacheKey].length > 0) {
    // console.timeEnd('✅ New getCommands');
    return memoryCache[cacheKey];
  }

  // 1. Fetch collections in parallel
  const [allCommands, allServices, allChannels, allDataProducts] = await Promise.all([
    getCollection('commands'),
    getCollection('services'),
    getCollection('channels'),
    getCollection('data-products'),
  ]);

  // 2. Build optimized maps
  const commandMap = createVersionedMap(allCommands);
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

  // 3. Filter commands
  const targetCommands = allCommands.filter((command) => {
    if (command.data.hidden === true) return false;
    if (!getAllVersions && command.filePath?.includes('versioned')) return false;
    return true;
  });

  // 4. Enrich commands
  const processedCommands = await Promise.all(
    targetCommands.map(async (command) => {
      // Version info
      const commandVersions = commandMap.get(command.data.id) || [];
      const latestVersion = commandVersions[0]?.data.version || command.data.version;
      const versions = commandVersions.map((e) => e.data.version);

      // Find producers and consumers via reverse index
      const { producers, consumers } = lookupProducersAndConsumers({
        message: { data: { ...command.data, latestVersion } },
        index: pcIndex,
        hydrate: hydrateServices,
      });

      // Find Channels via map lookup
      const messageChannels = command.data.channels || [];
      const channelsForCommand = messageChannels.flatMap((channel) => channelById.get(channel.id) || []);

      return {
        ...command,
        data: {
          ...command.data,
          messageChannels: channelsForCommand,
          producers: producers as any,
          consumers: consumers as any,
          versions,
          latestVersion,
        },
      };
    })
  );

  // order them by the name of the command
  processedCommands.sort((a, b) => {
    return (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id);
  });

  memoryCache[cacheKey] = processedCommands;
  // console.timeEnd('✅ New getCommands');

  return processedCommands;
};
