import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';
import { getVersionForCollectionItem, satisfies } from './collections/util';

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
    return (getAllVersions || !event.filePath?.includes('versioned')) && event.data.hidden !== true;
  });

  const services = await getCollection('services');
  const allChannels = await getCollection('channels');

  return events.map((event) => {
    const { latestVersion, versions } = getVersionForCollectionItem(event, events);

    const producers = services.filter((service) =>
      service.data.sends?.some((item) => {
        if (item.id != event.data.id) return false;
        if (item.version == 'latest' || item.version == undefined) return event.data.version == latestVersion;
        return satisfies(event.data.version, item.version);
      })
    );

    const consumers = services.filter((service) =>
      service.data.receives?.some((item) => {
        if (item.id != event.data.id) return false;
        if (item.version == 'latest' || item.version == undefined) return event.data.version == latestVersion;
        return satisfies(event.data.version, item.version);
      })
    );

    const messageChannels = event.data.channels || [];
    const channelsForEvent = allChannels.filter((c) => messageChannels.some((channel) => c.data.id === channel.id));

    // console.log('event/id', event.filePath)

    return {
      ...event,
      data: {
        ...event.data,
        messageChannels: channelsForEvent,
        producers,
        consumers,
        versions,
        latestVersion,
      },
      catalog: {
        path: path.join(event.id.replace('/index.mdx', '')),
        absoluteFilePath: path.join(PROJECT_DIR, event.id.replace('/index.mdx', '/index.md')),
        // astroContentFilePath: path.join(process.cwd(), 'src', 'content', event.collection, event.id),
        astroContentFilePath: path.join(PROJECT_DIR, event.filePath),
        astroFilePath: event.filePath,
        filePath: path.join(process.cwd(), 'src', 'catalog-files', event.collection, event.id.replace('/index.mdx', '')),
        publicPath: path.join('/generated', event.collection, event.id.replace('/index.mdx', '')),
        type: 'event',
      },
    };
  });
};
