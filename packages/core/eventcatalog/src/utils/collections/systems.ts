import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { createVersionedMap } from './util';

const CACHE_ENABLED = process.env.DISABLE_EVENTCATALOG_CACHE !== 'true';
export type System = CollectionEntry<'systems'>;

interface Props {
  getAllVersions?: boolean;
}

// cache for build time
let memoryCache: Record<string, System[]> = {};

export const getSystems = async ({ getAllVersions = true }: Props = {}): Promise<System[]> => {
  const cacheKey = getAllVersions ? 'allVersions' : 'currentVersions';

  if (memoryCache[cacheKey] && memoryCache[cacheKey].length > 0 && CACHE_ENABLED) {
    return memoryCache[cacheKey];
  }

  const allSystems = await getCollection('systems');

  // Build optimized map of id -> versions (sorted latest first)
  const systemMap = createVersionedMap(allSystems);

  // Filter systems
  const targetSystems = allSystems.filter((system) => {
    if (system.data.hidden === true) return false;
    if (!getAllVersions && system.filePath?.includes('versioned')) return false;
    return true;
  });

  // Enrich systems with version info
  const processedSystems = targetSystems.map((system) => {
    const systemVersions = systemMap.get(system.data.id) || [];
    const latestVersion = systemVersions[0]?.data.version || system.data.version;
    const versions = systemVersions.map((s) => s.data.version);

    return {
      ...system,
      data: {
        ...system.data,
        versions,
        latestVersion,
      },
    };
  });

  // order them by the name of the system
  processedSystems.sort((a, b) => {
    return (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id);
  });

  memoryCache[cacheKey] = processedSystems;

  return processedSystems;
};
