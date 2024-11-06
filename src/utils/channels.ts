import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';
import { getVersionForCollectionItem } from './collections/util';

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

export const getChannels = async ({ getAllVersions = true }: Props = {}): Promise<Channel[]> => {
  const channels = await getCollection('channels', (query) => {
    return (getAllVersions || !query.slug.includes('versioned')) && query.data.hidden !== true;
  });

  return channels.map((channel) => {
    const { latestVersion, versions } = getVersionForCollectionItem(channel, channels);

    return {
      ...channel,
      data: {
        ...channel.data,
        versions,
        latestVersion,
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
};
