import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';
import { getVersionForCollectionItem, satisfies } from './collections/util';
import { getMessages } from './messages';
import type { CollectionMessageTypes } from '@types';

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
    return (getAllVersions || !query.data?.pathToFile?.includes('versioned')) && query.data.hidden !== true;
  });

  const { commands, events, queries } = await getMessages();
  const allMessages = [...commands, ...events, ...queries];

  cachedChannels[cacheKey] = channels.map((channel) => {
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
        publicPath: path.join('/generated', channel.collection, channel.id.replace('/index.mdx', '')),
        type: 'event',
      },
    };
  });

  // order them by the name of the channel
  cachedChannels[cacheKey].sort((a, b) => {
    return (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id);
  });

  return cachedChannels[cacheKey];
};
