import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';
import { getVersionForCollectionItem, satisfies } from './collections/util';
import utils from '@eventcatalog/sdk';

const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd();

export type Entity = CollectionEntry<'entities'> & {
  catalog: {
    path: string;
    filePath: string;
    type: string;
  };
};

interface Props {
  getAllVersions?: boolean;
}

// cache for build time
let cachedEntities: Record<string, Entity[]> = {
  allVersions: [],
  currentVersions: [],
};

export const getEntities = async ({ getAllVersions = true }: Props = {}): Promise<Entity[]> => {
  const cacheKey = getAllVersions ? 'allVersions' : 'currentVersions';

  if (cachedEntities[cacheKey].length > 0) {
    return cachedEntities[cacheKey];
  }

  const entities = await getCollection('entities', (entity) => {
    return (getAllVersions || !entity.filePath?.includes('versioned')) && entity.data.hidden !== true;
  });

  const services = await getCollection('services');
  const domains = await getCollection('domains');

  cachedEntities[cacheKey] = await Promise.all(
    entities.map(async (entity) => {
      const { latestVersion, versions } = getVersionForCollectionItem(entity, entities);

      const servicesThatReferenceEntity = services.filter((service) =>
        service.data.entities?.some((item) => {
          if (item.id != entity.data.id) return false;
          if (item.version == 'latest' || item.version == undefined) return entity.data.version == latestVersion;
          return satisfies(entity.data.version, item.version);
        })
      );

      const domainsThatReferenceEntity = domains.filter((domain) =>
        domain.data.entities?.some((item) => {
          if (item.id != entity.data.id) return false;
          if (item.version == 'latest' || item.version == undefined) return entity.data.version == latestVersion;
          return satisfies(entity.data.version, item.version);
        })
      );

      const { getResourceFolderName } = utils(process.env.PROJECT_DIR ?? '');
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
        },
        catalog: {
          path: path.join(entity.collection, entity.id.replace('/index.mdx', '')),
          absoluteFilePath: path.join(PROJECT_DIR, entity.collection, entity.id.replace('/index.mdx', '/index.md')),
          astroContentFilePath: path.join(process.cwd(), 'src', 'content', entity.collection, entity.id),
          filePath: path.join(process.cwd(), 'src', 'catalog-files', entity.collection, entity.id.replace('/index.mdx', '')),
          publicPath: path.join('/generated', entity.collection, entityFolderName),
          type: 'entity',
        },
      };
    })
  );

  // order them by the name of the event
  cachedEntities[cacheKey].sort((a, b) => {
    return (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id);
  });

  return cachedEntities[cacheKey];
};
