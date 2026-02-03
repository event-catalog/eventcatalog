import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';
import { createVersionedMap } from './util';
import { hydrateProducersAndConsumers } from './messages';
import utils from '@eventcatalog/sdk';

const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd();
const CACHE_ENABLED = process.env.DISABLE_EVENTCATALOG_CACHE !== 'true';

type Command = CollectionEntry<'commands'> & {
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
  const [allCommands, allServices, allChannels, allDataProducts, allEntities] = await Promise.all([
    getCollection('commands'),
    getCollection('services'),
    getCollection('channels'),
    getCollection('data-products'),
    getCollection('entities'),
  ]);

  // 2. Build optimized maps
  const commandMap = createVersionedMap(allCommands);

  // 3. Filter commands
  const targetCommands = allCommands.filter((command) => {
    if (command.data.hidden === true) return false;
    if (!getAllVersions && command.filePath?.includes('versioned')) return false;
    return true;
  });

  const { getResourceFolderName } = utils(process.env.PROJECT_DIR ?? '');

  // 4. Enrich commands
  const processedCommands = await Promise.all(
    targetCommands.map(async (command) => {
      // Version info
      const commandVersions = commandMap.get(command.data.id) || [];
      const latestVersion = commandVersions[0]?.data.version || command.data.version;
      const versions = commandVersions.map((e) => e.data.version);

      // Find producers and consumers (services + data products + entities)
      const { producers, consumers } = hydrateProducersAndConsumers({
        message: { data: { ...command.data, latestVersion } },
        services: allServices,
        dataProducts: allDataProducts,
        entities: allEntities,
        hydrate: hydrateServices,
      });

      // Find Channels
      const messageChannels = command.data.channels || [];
      const channelsForCommand = allChannels.filter((c) => messageChannels.some((channel) => c.data.id === channel.id));

      const folderName = await getResourceFolderName(
        process.env.PROJECT_DIR ?? '',
        command.data.id,
        command.data.version.toString()
      );
      const commandFolderName = folderName ?? command.id.replace(`-${command.data.version}`, '');

      return {
        ...command,
        data: {
          ...command.data,
          messageChannels: channelsForCommand,
          producers: producers as any, // Cast for hydration flexibility
          consumers: consumers as any,
          versions,
          latestVersion,
        },
        catalog: {
          path: path.join(command.collection, command.id.replace('/index.mdx', '')),
          filePath: path.join(process.cwd(), 'src', 'catalog-files', command.collection, command.id.replace('/index.mdx', '')),
          publicPath: path.join('/generated', command.collection, commandFolderName),
          type: 'command',
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
