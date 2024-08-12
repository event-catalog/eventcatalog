import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';
import { getVersionForCollectionItem } from './collections/util';
import { satisfies } from 'semver';

const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd();

type Event = CollectionEntry<'events'> & {
  catalog: {
    path: string;
    filePath: string;
    type: string;
  };
};

interface Props {
  getAllVersions?: boolean;
}

export const getEvents = async ({ getAllVersions = true }: Props = {}): Promise<Event[]> => {
  const events = await getCollection('events', (event) => {
    return (getAllVersions || !event.slug.includes('versioned')) && event.data.hidden !== true;
  });

  const services = await getCollection('services');

  return events.map((event) => {
    const { latestVersion, versions } = getVersionForCollectionItem(event, events);

    const producers = services.filter((service) => {
      if (!service.data.sends) return false;
      return service.data.sends.find((item) => {
        return item.id === event.data.id && satisfies(event.data.version, item.version);
      });
    });

    const consumers = services.filter((service) => {
      if (!service.data.receives) return false;
      return service.data.receives.find((item) => {
        return item.id === event.data.id && satisfies(event.data.version, item.version);

        // If no version has been found, then get try find the latest one
        // return item.id == event.data.id
      });
    });

    return {
      ...event,
      data: {
        ...event.data,
        producers,
        consumers,
        versions,
        latestVersion,
      },
      catalog: {
        path: path.join(event.collection, event.id.replace('/index.mdx', '')),
        absoluteFilePath: path.join(PROJECT_DIR, event.collection, event.id.replace('/index.mdx', '/index.md')),
        filePath: path.join(process.cwd(), 'src', 'catalog-files', event.collection, event.id.replace('/index.mdx', '')),
        publicPath: path.join('/generated', event.collection, event.id.replace('/index.mdx', '')),
        type: 'event',
      },
    };
  });
};
