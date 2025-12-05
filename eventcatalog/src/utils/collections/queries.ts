import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';
import utils from '@eventcatalog/sdk';
import { createVersionedMap, satisfies } from './util';

const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd();
const CACHE_ENABLED = process.env.DISABLE_EVENTCATALOG_CACHE !== 'true';

type Query = CollectionEntry<'queries'> & {
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
  const [allQueries, allServices, allChannels] = await Promise.all([
    getCollection('queries'),
    getCollection('services'),
    getCollection('channels'),
  ]);

  // 2. Build optimized maps
  const queryMap = createVersionedMap(allQueries);

  // 3. Filter queries
  const targetQueries = allQueries.filter((query) => {
    if (query.data.hidden === true) return false;
    if (!getAllVersions && query.filePath?.includes('versioned')) return false;
    return true;
  });

  const { getResourceFolderName } = utils(process.env.PROJECT_DIR ?? '');

  // 4. Enrich queries
  const processedQueries = await Promise.all(
    targetQueries.map(async (query) => {
      // Version info
      const queryVersions = queryMap.get(query.data.id) || [];
      const latestVersion = queryVersions[0]?.data.version || query.data.version;
      const versions = queryVersions.map((e) => e.data.version);

      // Find Producers (Services that send this query)
      const producers = allServices
        .filter((service) =>
          service.data.sends?.some((item) => {
            if (item.id !== query.data.id) return false;
            if (item.version === 'latest' || item.version === undefined) return query.data.version === latestVersion;
            return satisfies(query.data.version, item.version);
          })
        )
        .map((service) => {
          if (!hydrateServices) return { id: service.data.id, version: service.data.version };
          return service;
        });

      // Find Consumers (Services that receive this query)
      const consumers = allServices
        .filter((service) =>
          service.data.receives?.some((item) => {
            if (item.id !== query.data.id) return false;
            if (item.version === 'latest' || item.version === undefined) return query.data.version === latestVersion;
            return satisfies(query.data.version, item.version);
          })
        )
        .map((service) => {
          if (!hydrateServices) return { id: service.data.id, version: service.data.version };
          return service;
        });

      // Find Channels
      const messageChannels = query.data.channels || [];
      const channelsForQuery = allChannels.filter((c) => messageChannels.some((channel) => c.data.id === channel.id));

      const folderName = await getResourceFolderName(process.env.PROJECT_DIR ?? '', query.data.id, query.data.version.toString());
      const queryFolderName = folderName ?? query.id.replace(`-${query.data.version}`, '');

      return {
        ...query,
        data: {
          ...query.data,
          messageChannels: channelsForQuery,
          producers: producers as any, // Cast for hydration flexibility
          consumers: consumers as any,
          versions,
          latestVersion,
        },
        catalog: {
          path: path.join(query.collection, query.id.replace('/index.mdx', '')),
          absoluteFilePath: path.join(PROJECT_DIR, query.collection, query.id.replace('/index.mdx', '/index.md')),
          astroContentFilePath: path.join(process.cwd(), 'src', 'content', query.collection, query.id),
          filePath: path.join(process.cwd(), 'src', 'catalog-files', query.collection, query.id.replace('/index.mdx', '')),
          publicPath: path.join('/generated', query.collection, queryFolderName),
          type: 'event', // Kept as 'event' to match original file, though likely should be 'query'
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
