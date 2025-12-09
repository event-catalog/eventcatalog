import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';
import { createVersionedMap, satisfies } from './util';
import utils from '@eventcatalog/sdk';

const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd();
const CACHE_ENABLED = process.env.DISABLE_EVENTCATALOG_CACHE !== 'true';
export type Entity = CollectionEntry<'containers'> & {
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
let memoryCache: Record<string, Entity[]> = {};

export const getContainers = async ({ getAllVersions = true }: Props = {}): Promise<Entity[]> => {
  // console.time('✅ New getContainers');
  const cacheKey = getAllVersions ? 'allVersions' : 'currentVersions';

  if (memoryCache[cacheKey] && memoryCache[cacheKey].length > 0 && CACHE_ENABLED) {
    // console.timeEnd('✅ New getContainers');
    return memoryCache[cacheKey];
  }

  // 1. Fetch collections in parallel
  const [allContainers, allServices] = await Promise.all([getCollection('containers'), getCollection('services')]);

  // 2. Build optimized maps
  const containerMap = createVersionedMap(allContainers);

  // 3. Filter containers
  const targetContainers = allContainers.filter((container) => {
    if (container.data.hidden === true) return false;
    if (!getAllVersions && container.filePath?.includes('versioned')) return false;
    return true;
  });

  const { getResourceFolderName } = utils(process.env.PROJECT_DIR ?? '');

  // 4. Enrich containers
  const processedContainers = await Promise.all(
    targetContainers.map(async (container) => {
      // Version info
      const containerVersions = containerMap.get(container.data.id) || [];
      const latestVersion = containerVersions[0]?.data.version || container.data.version;
      const versions = containerVersions.map((c) => c.data.version);

      // Find Services that write to this container
      const servicesThatWriteToContainer = allServices.filter((service) => {
        return service.data?.writesTo?.some((item) => {
          if (item.id !== container.data.id) return false;
          if (item.version === 'latest' || item.version === undefined) return container.data.version === latestVersion;
          return satisfies(container.data.version, item.version);
        });
      });

      // Find Services that read from this container
      const servicesThatReadFromContainer = allServices.filter((service) => {
        return service.data?.readsFrom?.some((item) => {
          if (item.id !== container.data.id) return false;
          if (item.version === 'latest' || item.version === undefined) return container.data.version === latestVersion;
          return satisfies(container.data.version, item.version);
        });
      });

      // Combine references
      const servicesThatReferenceContainer = [...new Set([...servicesThatWriteToContainer, ...servicesThatReadFromContainer])];

      const folderName = await getResourceFolderName(
        process.env.PROJECT_DIR ?? '',
        container.data.id,
        container.data.version.toString()
      );
      const containerFolderName = folderName ?? container.id.replace(`-${container.data.version}`, '');

      return {
        ...container,
        data: {
          ...container.data,
          versions,
          latestVersion,
          services: servicesThatReferenceContainer,
          servicesThatWriteToContainer,
          servicesThatReadFromContainer,
        },
        catalog: {
          path: path.join(container.collection, container.id.replace('/index.mdx', '')),
          absoluteFilePath: path.join(PROJECT_DIR, container.collection, container.id.replace('/index.mdx', '/index.md')),
          astroContentFilePath: path.join(process.cwd(), 'src', 'content', container.collection, container.id),
          filePath: path.join(
            process.cwd(),
            'src',
            'catalog-files',
            container.collection,
            container.id.replace('/index.mdx', '')
          ),
          publicPath: path.join('/generated', container.collection, containerFolderName),
          type: 'container',
        },
      };
    })
  );

  // order them by the name of the container
  processedContainers.sort((a, b) => {
    return (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id);
  });

  memoryCache[cacheKey] = processedContainers;
  // console.timeEnd('✅ New getContainers');

  return processedContainers;
};
