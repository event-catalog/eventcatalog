import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';
import utils from '@eventcatalog/sdk';
import { createVersionedMap, satisfies, findInMap } from './util';
import type { CollectionMessageTypes } from '@types';

const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd();

export type Entity = Omit<CollectionEntry<'entities'>, 'data'> & {
  data: Omit<CollectionEntry<'entities'>['data'], 'sends' | 'receives'> & {
    versions?: string[];
    latestVersion?: string;
    services?: CollectionEntry<'services'>[];
    domains?: CollectionEntry<'domains'>[];
    sends?: CollectionEntry<CollectionMessageTypes>[];
    receives?: CollectionEntry<CollectionMessageTypes>[];
    sendsRaw?: Array<{ id: string; version?: string }>;
    receivesRaw?: Array<{ id: string; version?: string }>;
  };
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

export const getEntities = async ({ getAllVersions = true }: Props = {}): Promise<Entity[]> => {
  const cacheKey = getAllVersions ? 'allVersions' : 'currentVersions';

  if (memoryCache[cacheKey] && memoryCache[cacheKey].length > 0) {
    return memoryCache[cacheKey];
  }

  // 1. Fetch collections in parallel
  const [allEntities, allServices, allDomains, allEvents, allCommands, allQueries] = await Promise.all([
    getCollection('entities'),
    getCollection('services'),
    getCollection('domains'),
    getCollection('events'),
    getCollection('commands'),
    getCollection('queries'),
  ]);

  const allMessages = [...allEvents, ...allCommands, ...allQueries];
  const messageMap = createVersionedMap(allMessages);

  // 2. Build optimized maps
  const entityMap = createVersionedMap(allEntities);

  // 3. Filter entities
  const targetEntities = allEntities.filter((entity) => {
    if (entity.data.hidden === true) return false;
    if (!getAllVersions && entity.filePath?.includes('versioned')) return false;
    return true;
  });

  const { getResourceFolderName } = utils(process.env.PROJECT_DIR ?? '');

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

      // Hydrate sends (messages this entity produces)
      const sends = (entity.data.sends || [])
        .map((m) => findInMap(messageMap, m.id, m.version))
        .filter((e): e is CollectionEntry<CollectionMessageTypes> => !!e);

      // Hydrate receives (messages this entity consumes)
      const receives = (entity.data.receives || [])
        .map((m) => findInMap(messageMap, m.id, m.version))
        .filter((e): e is CollectionEntry<CollectionMessageTypes> => !!e);

      // Store raw pointers for graph building (same pattern as services)
      const sendsRaw = entity.data.sends || [];
      const receivesRaw = entity.data.receives || [];

      const folderName = await getResourceFolderName(
        process.env.PROJECT_DIR ?? '',
        entity.data.id,
        entity.data.version.toString()
      );
      const entityFolderName = folderName ?? entity.id.replace(`-${entity.data.version}`, '');

      return {
        ...entity,
        data: {
          ...entity.data,
          versions,
          latestVersion,
          services: servicesThatReferenceEntity,
          domains: domainsThatReferenceEntity,
          sends,
          receives,
          sendsRaw,
          receivesRaw,
        },
        catalog: {
          path: path.join(entity.collection, entity.id.replace('/index.mdx', '')),
          filePath: path.join(process.cwd(), 'src', 'catalog-files', entity.collection, entity.id.replace('/index.mdx', '')),
          publicPath: path.join('/generated', entity.collection, entityFolderName),
          type: 'entity',
        },
      };
    })
  );

  // order them by the name of the entity
  processedEntities.sort((a, b) => {
    return (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id);
  });

  memoryCache[cacheKey] = processedEntities;

  return processedEntities;
};
