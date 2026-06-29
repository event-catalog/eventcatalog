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

  const [allSystems, allServices, allFlows, allEntities, allContainers] = await Promise.all([
    getCollection('systems'),
    getCollection('services'),
    getCollection('flows'),
    getCollection('entities'),
    getCollection('containers'),
  ]);

  // Build optimized map of id -> versions (sorted latest first)
  const systemMap = createVersionedMap(allSystems);
  const serviceMap = createVersionedMap(allServices);
  const flowMap = createVersionedMap(allFlows);
  const entityMap = createVersionedMap(allEntities);
  const containerMap = createVersionedMap(allContainers);

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

    // Resolve container (data store) pointers to their full collection entries
    const containers = (system.data.containers || [])
      .map((container: { id: string; version?: string }) => findInMap(containerMap, container.id, container.version))
      .filter((c): c is NonNullable<typeof c> => !!c);

    // Resolve system-to-system relationship pointers (used by the System Diagram).
    // Each relationship resolves to its target system while keeping the edge `label`.
    // Dangling targets are dropped; relationships keep their label even if absent (the
    // diagram decides whether to draw an edge based on the presence of a label).
    const relationships = (system.data.relationships || [])
      .map((relationship: { id: string; version?: string; label?: string }) => {
        const target = findInMap(systemMap, relationship.id, relationship.version);
        if (!target) return null;
        return {
          id: target.data.id,
          version: target.data.version,
          label: relationship.label,
          data: target.data,
        };
      })
      .filter((r): r is NonNullable<typeof r> => !!r);

    return {
      ...system,
      data: {
        ...system.data,
        versions,
        latestVersion,
        services: services as any,
        flows: flows as any,
        entities: entities as any,
        containers: containers as any,
        relationships: relationships as any,
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
