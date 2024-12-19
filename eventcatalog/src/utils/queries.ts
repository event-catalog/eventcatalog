import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';
import { getVersionForCollectionItem, satisfies } from './collections/util';

const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd();

type Query = CollectionEntry<'queries'> & {
  catalog: {
    path: string;
    filePath: string;
    type: string;
  };
};

interface Props {
  getAllVersions?: boolean;
}

// Cache for build time
let cachedQueries: Record<string, Query[]> = {
  allVersions: [],
  currentVersions: [],
};

export const getQueries = async ({ getAllVersions = true }: Props = {}): Promise<Query[]> => {
  const cacheKey = getAllVersions ? 'allVersions' : 'currentVersions';

  if (cachedQueries[cacheKey].length > 0) {
    return cachedQueries[cacheKey];
  }

  const queries = await getCollection('queries', (query) => {
    return (getAllVersions || !query.data?.pathToFile?.includes('versioned')) && query.data.hidden !== true;
  });

  const services = await getCollection('services');
  const allChannels = await getCollection('channels');

  cachedQueries[cacheKey] = queries.map((query) => {
    const { latestVersion, versions } = getVersionForCollectionItem(query, queries);

    const producers = services.filter((service) =>
      service.data.sends?.some((item) => {
        if (item.id != query.data.id) return false;
        if (item.version == 'latest' || item.version == undefined) return query.data.version == latestVersion;
        return satisfies(query.data.version, item.version);
      })
    );

    const consumers = services.filter((service) =>
      service.data.receives?.some((item) => {
        if (item.id != query.data.id) return false;
        if (item.version == 'latest' || item.version == undefined) return query.data.version == latestVersion;
        return satisfies(query.data.version, item.version);
      })
    );

    const messageChannels = query.data.channels || [];
    const channelsForQuery = allChannels.filter((c) => messageChannels.some((channel) => c.data.id === channel.id));

    return {
      ...query,
      data: {
        ...query.data,
        messageChannels: channelsForQuery,
        producers,
        consumers,
        versions,
        latestVersion,
      },
      catalog: {
        path: path.join(query.collection, query.id.replace('/index.mdx', '')),
        absoluteFilePath: path.join(PROJECT_DIR, query.collection, query.id.replace('/index.mdx', '/index.md')),
        astroContentFilePath: path.join(process.cwd(), 'src', 'content', query.collection, query.id),
        filePath: path.join(process.cwd(), 'src', 'catalog-files', query.collection, query.id.replace('/index.mdx', '')),
        publicPath: path.join('/generated', query.collection, query.id.replace('/index.mdx', '')),
        type: 'event',
      },
    };
  });

  // order them by the name of the query
  cachedQueries[cacheKey].sort((a, b) => {
    return (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id);
  });

  return cachedQueries[cacheKey];
};
