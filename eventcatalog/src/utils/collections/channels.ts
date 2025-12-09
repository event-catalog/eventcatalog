import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';
import { getItemsFromCollectionByIdAndSemverOrLatest, createVersionedMap, satisfies } from './util';
import type { CollectionMessageTypes } from '@types';
import utils from '@eventcatalog/sdk';

const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd();
const CACHE_ENABLED = process.env.DISABLE_EVENTCATALOG_CACHE !== 'true';

type Channel = CollectionEntry<'channels'> & {
  catalog: {
    path: string;
    filePath: string;
    type: string;
    publicPath: string;
  };
};

interface Props {
  getAllVersions?: boolean;
}

// cache for build time
let memoryCache: Record<string, Channel[]> = {};

export const getChannels = async ({ getAllVersions = true }: Props = {}): Promise<Channel[]> => {
  // console.time('✅ New getChannels');
  const cacheKey = getAllVersions ? 'allVersions' : 'currentVersions';

  if (memoryCache[cacheKey] && memoryCache[cacheKey].length > 0 && CACHE_ENABLED) {
    // console.timeEnd('✅ New getChannels');
    return memoryCache[cacheKey];
  }

  // 1. Fetch collections in parallel
  const [allChannels, allEvents, allCommands, allQueries] = await Promise.all([
    getCollection('channels'),
    getCollection('events'),
    getCollection('commands'),
    getCollection('queries'),
  ]);

  const allMessages = [...allEvents, ...allCommands, ...allQueries];

  // 2. Build optimized maps
  const channelMap = createVersionedMap(allChannels);

  // 3. Build Message Index by Channel ID (Reverse Index)
  // Map<ChannelID, Array<{ message: Message, requiredVersion: string | undefined }>>
  const messagesByChannelId = new Map<
    string,
    Array<{ message: CollectionEntry<CollectionMessageTypes>; requiredVersion?: string }>
  >();

  for (const message of allMessages) {
    if (message.data.channels) {
      for (const channelRef of message.data.channels) {
        if (!messagesByChannelId.has(channelRef.id)) {
          messagesByChannelId.set(channelRef.id, []);
        }
        messagesByChannelId.get(channelRef.id)!.push({
          message,
          requiredVersion: channelRef.version,
        });
      }
    }
  }

  // 4. Filter channels
  const targetChannels = allChannels.filter((channel) => {
    if (channel.data.hidden === true) return false;
    if (!getAllVersions && channel.filePath?.includes('versioned')) return false;
    return true;
  });

  const { getResourceFolderName } = utils(process.env.PROJECT_DIR ?? '');

  // 5. Enrich channels
  const processedChannels = await Promise.all(
    targetChannels.map(async (channel) => {
      // Version info
      const channelVersions = channelMap.get(channel.data.id) || [];
      const latestVersion = channelVersions[0]?.data.version || channel.data.version;
      const versions = channelVersions.map((c) => c.data.version);

      // Find messages for this channel version
      const candidateMessages = messagesByChannelId.get(channel.data.id) || [];

      const messagesForChannel = candidateMessages
        .filter(({ requiredVersion }) => {
          if (requiredVersion === 'latest' || requiredVersion === undefined) {
            return channel.data.version === latestVersion;
          }
          return satisfies(channel.data.version, requiredVersion);
        })
        .map(({ message }) => message);

      const messages = messagesForChannel.map((message) => {
        return {
          id: message.data.id,
          name: message.data.name,
          version: message.data.version,
          collection: message.collection,
        };
      });

      const folderName = await getResourceFolderName(
        process.env.PROJECT_DIR ?? '',
        channel.data.id,
        channel.data.version.toString()
      );
      const channelFolderName = folderName ?? channel.id.replace(`-${channel.data.version}`, '');

      return {
        ...channel,
        data: {
          ...channel.data,
          versions,
          latestVersion,
          messages,
        },
        catalog: {
          path: path.join(channel.collection, channel.id.replace('/index.mdx', '')),
          absoluteFilePath: path.join(PROJECT_DIR, channel.collection, channel.id.replace('/index.mdx', '/index.md')),
          astroContentFilePath: path.join(process.cwd(), 'src', 'content', channel.collection, channel.id),
          filePath: path.join(process.cwd(), 'src', 'catalog-files', channel.collection, channel.id.replace('/index.mdx', '')),
          publicPath: path.join('/generated', channel.collection, channelFolderName),
          type: 'event',
        },
      };
    })
  );

  // order them by the name of the channel
  processedChannels.sort((a, b) => {
    return (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id);
  });

  memoryCache[cacheKey] = processedChannels;
  // console.timeEnd('✅ New getChannels');

  return processedChannels;
};

// Could be recursive, we need to keep going until we find a loop or until we reach the target channel
export const isChannelsConnected = (
  sourceChannel: CollectionEntry<'channels'>,
  targetChannel: CollectionEntry<'channels'>,
  channels: CollectionEntry<'channels'>[],
  visited: Set<string> = new Set()
) => {
  // Create a unique key for this channel (id + version to handle multiple versions)
  const channelKey = `${sourceChannel.data.id}:${sourceChannel.data.version}`;

  // Base case: we've reached the target channel
  if (sourceChannel.data.id === targetChannel.data.id) {
    return true;
  }

  // Prevent infinite loops by tracking visited channels
  if (visited.has(channelKey)) {
    return false;
  }

  // Mark this channel as visited
  visited.add(channelKey);

  const routes = sourceChannel.data.routes ?? [];
  for (const route of routes) {
    const routeChannel = getItemsFromCollectionByIdAndSemverOrLatest(
      channels,
      route.id,
      route.version
    )[0] as CollectionEntry<'channels'>;

    if (routeChannel) {
      // Pass the visited set to the recursive call
      if (isChannelsConnected(routeChannel, targetChannel, channels, visited)) {
        return true;
      }
    }
  }
  return false;
};

// Go from the source to the target channel and return the channel chain
export const getChannelChain = (
  sourceChannel: CollectionEntry<'channels'>,
  targetChannel: CollectionEntry<'channels'>,
  channels: CollectionEntry<'channels'>[]
): CollectionEntry<'channels'>[] => {
  // Base case: we've reached the target channel
  if (sourceChannel.data.id === targetChannel.data.id && sourceChannel.data.version === targetChannel.data.version) {
    return [sourceChannel];
  }

  const routes = sourceChannel.data.routes ?? [];

  if (routes.length > 0 && isChannelsConnected(sourceChannel, targetChannel, channels)) {
    // Need to check every route and see if any of them are connected to the target channel
    for (const route of routes) {
      const routeChannel = getItemsFromCollectionByIdAndSemverOrLatest(
        channels,
        route.id,
        route.version
      )[0] as CollectionEntry<'channels'>;
      if (routeChannel) {
        if (isChannelsConnected(routeChannel, targetChannel, channels)) {
          return [sourceChannel, ...getChannelChain(routeChannel, targetChannel, channels)];
        }
      }
    }
  }
  return [];
};
