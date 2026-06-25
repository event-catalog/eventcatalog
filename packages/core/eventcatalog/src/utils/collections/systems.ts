import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { createVersionedMap, findInMap } from './util';

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

  const [allSystems, allServices, allFlows, allEntities] = await Promise.all([
    getCollection('systems'),
    getCollection('services'),
    getCollection('flows'),
    getCollection('entities'),
  ]);

  // Build optimized map of id -> versions (sorted latest first)
  const systemMap = createVersionedMap(allSystems);
  const serviceMap = createVersionedMap(allServices);
  const flowMap = createVersionedMap(allFlows);
  const entityMap = createVersionedMap(allEntities);

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

    // Resolve service pointers to their full collection entries
    const services = (system.data.services || [])
      .map((service: { id: string; version?: string }) => findInMap(serviceMap, service.id, service.version))
      .filter((s): s is NonNullable<typeof s> => !!s);

    // Resolve flow pointers to their full collection entries
    const flows = (system.data.flows || [])
      .map((flow: { id: string; version?: string }) => findInMap(flowMap, flow.id, flow.version))
      .filter((f): f is NonNullable<typeof f> => !!f);

    // Resolve entity pointers to their full collection entries
    const entities = (system.data.entities || [])
      .map((entity: { id: string; version?: string }) => findInMap(entityMap, entity.id, entity.version))
      .filter((e): e is NonNullable<typeof e> => !!e);

    return {
      ...system,
      data: {
        ...system.data,
        versions,
        latestVersion,
        services: services as any,
        flows: flows as any,
        entities: entities as any,
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
