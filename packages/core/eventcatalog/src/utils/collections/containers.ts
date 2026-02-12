import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { createVersionedMap, satisfies } from './util';

const CACHE_ENABLED = process.env.DISABLE_EVENTCATALOG_CACHE !== 'true';
export type Entity = CollectionEntry<'containers'>;

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
  const [allContainers, allServices, allDataProducts] = await Promise.all([
    getCollection('containers'),
    getCollection('services'),
    getCollection('data-products'),
  ]);

  // 2. Build optimized maps
  const containerMap = createVersionedMap(allContainers);

  // 3. Filter containers
  const targetContainers = allContainers.filter((container) => {
    if (container.data.hidden === true) return false;
    if (!getAllVersions && container.filePath?.includes('versioned')) return false;
    return true;
  });

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

      // Find Data Products that write to this container (have it in outputs)
      const dataProductsThatWriteToContainer = allDataProducts.filter((dataProduct) => {
        return dataProduct.data?.outputs?.some((item) => {
          if (item.id !== container.data.id) return false;
          if (item.version === 'latest' || item.version === undefined) return container.data.version === latestVersion;
          return satisfies(container.data.version, item.version);
        });
      });

      // Find Data Products that read from this container (have it in inputs)
      const dataProductsThatReadFromContainer = allDataProducts.filter((dataProduct) => {
        return dataProduct.data?.inputs?.some((item) => {
          if (item.id !== container.data.id) return false;
          if (item.version === 'latest' || item.version === undefined) return container.data.version === latestVersion;
          return satisfies(container.data.version, item.version);
        });
      });

      // Combine references
      const servicesThatReferenceContainer = [...new Set([...servicesThatWriteToContainer, ...servicesThatReadFromContainer])];

      return {
        ...container,
        data: {
          ...container.data,
          versions,
          latestVersion,
          services: servicesThatReferenceContainer,
          servicesThatWriteToContainer,
          servicesThatReadFromContainer,
          dataProductsThatWriteToContainer,
          dataProductsThatReadFromContainer,
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
