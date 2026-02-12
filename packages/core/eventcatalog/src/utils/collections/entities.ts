import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { createVersionedMap, satisfies } from './util';

export type Entity = CollectionEntry<'entities'>;

interface Props {
  getAllVersions?: boolean;
}

// cache for build time
let memoryCache: Record<string, Entity[]> = {};

export const getEntities = async ({ getAllVersions = true }: Props = {}): Promise<Entity[]> => {
  // console.time('✅ New getEntities');
  const cacheKey = getAllVersions ? 'allVersions' : 'currentVersions';

  if (memoryCache[cacheKey] && memoryCache[cacheKey].length > 0) {
    // console.timeEnd('✅ New getEntities');
    return memoryCache[cacheKey];
  }

  // 1. Fetch collections in parallel
  const [allEntities, allServices, allDomains] = await Promise.all([
    getCollection('entities'),
    getCollection('services'),
    getCollection('domains'),
  ]);

  // 2. Build optimized maps
  const entityMap = createVersionedMap(allEntities);

  // 3. Filter entities
  const targetEntities = allEntities.filter((entity) => {
    if (entity.data.hidden === true) return false;
    if (!getAllVersions && entity.filePath?.includes('versioned')) return false;
    return true;
  });

  // 4. Enrich entities
  const processedEntities = await Promise.all(
    targetEntities.map(async (entity) => {
      // Version info
      const entityVersions = entityMap.get(entity.data.id) || [];
      const latestVersion = entityVersions[0]?.data.version || entity.data.version;
      const versions = entityVersions.map((e) => e.data.version);

      // Find Services that reference this entity
      const servicesThatReferenceEntity = allServices.filter((service) =>
        service.data.entities?.some((item) => {
          if (item.id !== entity.data.id) return false;
          if (item.version === 'latest' || item.version === undefined) return entity.data.version === latestVersion;
          return satisfies(entity.data.version, item.version);
        })
      );

      // Find Domains that reference this entity
      const domainsThatReferenceEntity = allDomains.filter((domain) =>
        domain.data.entities?.some((item) => {
          if (item.id !== entity.data.id) return false;
          if (item.version === 'latest' || item.version === undefined) return entity.data.version === latestVersion;
          return satisfies(entity.data.version, item.version);
        })
      );

      return {
        ...entity,
        data: {
          ...entity.data,
          versions,
          latestVersion,
          services: servicesThatReferenceEntity,
          domains: domainsThatReferenceEntity,
        },
      };
    })
  );

  // order them by the name of the entity
  processedEntities.sort((a, b) => {
    return (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id);
  });

  memoryCache[cacheKey] = processedEntities;
  // console.timeEnd('✅ New getEntities');

  return processedEntities;
};
