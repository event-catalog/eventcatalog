import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';
import { getVersionForCollectionItem, satisfies } from './util';
import utils from '@eventcatalog/sdk';

const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd();

export type Entity = CollectionEntry<'containers'> & {
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

export const getContainers = async ({ getAllVersions = true }: Props = {}): Promise<Entity[]> => {
  const cacheKey = getAllVersions ? 'allVersions' : 'currentVersions';

  if (cachedEntities[cacheKey].length > 0) {
    return cachedEntities[cacheKey];
  }

  const containers = await getCollection('containers', (container) => {
    return (getAllVersions || !container.filePath?.includes('versioned')) && container.data.hidden !== true;
  });

  const services = await getCollection('services');

  cachedEntities[cacheKey] = await Promise.all(
    containers.map(async (container) => {
      const { latestVersion, versions } = getVersionForCollectionItem(container, containers);

      const servicesThatReferenceContainer = services.filter((service) => {
        const references = [...(service.data.writesTo || []), ...(service.data.readsFrom || [])];
        return references.some((item) => {
          if (item.id != container.data.id) return false;
          if (item.version == 'latest' || item.version == undefined) return container.data.version == latestVersion;
          return satisfies(container.data.version, item.version);
        });
      });

      const servicesThatWriteToContainer = services.filter((service) => {
        return service.data?.writesTo?.some((item) => {
          if (item.id != container.data.id) return false;
          if (item.version == 'latest' || item.version == undefined) return container.data.version == latestVersion;
          return satisfies(container.data.version, item.version);
        });
      });

      const servicesThatReadFromContainer = services.filter((service) => {
        return service.data?.readsFrom?.some((item) => {
          if (item.id != container.data.id) return false;
          if (item.version == 'latest' || item.version == undefined) return container.data.version == latestVersion;
          return satisfies(container.data.version, item.version);
        });
      });

      const { getResourceFolderName } = utils(process.env.PROJECT_DIR ?? '');
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

  // order them by the name of the event
  cachedEntities[cacheKey].sort((a, b) => {
    return (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id);
  });

  return cachedEntities[cacheKey];
};
