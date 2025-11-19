import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';
import { getItemsFromCollectionByIdAndSemverOrLatest, getVersionForCollectionItem, satisfies } from './collections/util';
import { getMessages } from './messages';
import type { CollectionMessageTypes } from '@types';
import utils from '@eventcatalog/sdk';

const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd();

type Channel = CollectionEntry<'channels'> & {
  catalog: {
    path: string;
    filePath: string;
    type: string;
  };
};

interface Props {
  getAllVersions?: boolean;
}

// cache for build time
let cachedChannels: Record<string, Channel[]> = {
  allVersions: [],
  currentVersions: [],
};

export const getChannels = async ({ getAllVersions = true }: Props = {}): Promise<Channel[]> => {
  const cacheKey = getAllVersions ? 'allVersions' : 'currentVersions';

  if (cachedChannels[cacheKey].length > 0) {
    return cachedChannels[cacheKey];
  }

  const channels = await getCollection('channels', (query) => {
    return (getAllVersions || !query.filePath?.includes('versioned')) && query.data.hidden !== true;
  });

  const { commands, events, queries } = await getMessages();
  const allMessages = [...commands, ...events, ...queries];

  cachedChannels[cacheKey] = await Promise.all(
    channels.map(async (channel) => {
      const { latestVersion, versions } = getVersionForCollectionItem(channel, channels);

      const messagesForChannel = allMessages.filter((message) => {
        return message.data.channels?.some((messageChannel) => {
          if (messageChannel.id != channel.data.id) return false;
          if (messageChannel.version == 'latest' || messageChannel.version == undefined)
            return channel.data.version == latestVersion;
          return satisfies(channel.data.version, messageChannel.version);
        });
      });

      const messages = messagesForChannel.map((message: CollectionEntry<CollectionMessageTypes>) => {
        return { id: message.data.id, name: message.data.name, version: message.data.version, collection: message.collection };
      });

      const { getResourceFolderName } = utils(process.env.PROJECT_DIR ?? '');
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
  cachedChannels[cacheKey].sort((a, b) => {
    return (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id);
  });

  return cachedChannels[cacheKey];
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
