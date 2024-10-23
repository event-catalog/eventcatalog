import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';
import { getVersionForCollectionItem, satisfies } from './collections/util';

const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd();

type Query = CollectionEntry<'queries'> & {
  catalog: {
    path: string;
    filePath: string;
    type: string;
  };
};

interface Props {
  getAllVersions?: boolean;
}

export const getQueries = async ({ getAllVersions = true }: Props = {}): Promise<Query[]> => {
  const queries = await getCollection('queries', (query) => {
    return (getAllVersions || !query.slug.includes('versioned')) && query.data.hidden !== true;
  });

  const services = await getCollection('services');

  return queries.map((query) => {
    const { latestVersion, versions } = getVersionForCollectionItem(query, queries);

    const producers = services.filter((service) =>
      service.data.sends?.some((item) => {
        if (item.id != query.data.id) return false;
        if (item.version == 'latest' || item.version == undefined) return query.data.version == latestVersion;
        return satisfies(query.data.version, item.version);
      })
    );

    const consumers = services.filter((service) =>
      service.data.receives?.some((item) => {
        if (item.id != query.data.id) return false;
        if (item.version == 'latest' || item.version == undefined) return query.data.version == latestVersion;
        return satisfies(query.data.version, item.version);
      })
    );

    return {
      ...query,
      data: {
        ...query.data,
        producers,
        consumers,
        versions,
        latestVersion,
      },
      catalog: {
        path: path.join(query.collection, query.id.replace('/index.mdx', '')),
        absoluteFilePath: path.join(PROJECT_DIR, query.collection, query.id.replace('/index.mdx', '/index.md')),
        astroContentFilePath: path.join(process.cwd(), 'src', 'content', query.collection, query.id),
        filePath: path.join(process.cwd(), 'src', 'catalog-files', query.collection, query.id.replace('/index.mdx', '')),
        publicPath: path.join('/generated', query.collection, query.id.replace('/index.mdx', '')),
        type: 'event',
      },
    };
  });
};
