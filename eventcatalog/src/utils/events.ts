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

// cache for build time
let cachedEvents: Record<string, Event[]> = {
  allVersions: [],
  currentVersions: [],
};

export const getEvents = async ({ getAllVersions = true }: Props = {}): Promise<Event[]> => {
  const cacheKey = getAllVersions ? 'allVersions' : 'currentVersions';

  if (cachedEvents[cacheKey].length > 0) {
    return cachedEvents[cacheKey];
  }

  const events = await getCollection('events', (event) => {
    return (getAllVersions || !event.data?.pathToFile?.includes('versioned')) && event.data.hidden !== true;
  });

  const services = await getCollection('services');
  const allChannels = await getCollection('channels');

  cachedEvents[cacheKey] = events.map((event) => {
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
        path: path.join(event.collection, event.id.replace('/index.mdx', '')),
        absoluteFilePath: path.join(PROJECT_DIR, event.collection, event.id.replace('/index.mdx', '/index.md')),
        astroContentFilePath: path.join(process.cwd(), 'src', 'content', event.collection, event.id),
        filePath: path.join(process.cwd(), 'src', 'catalog-files', event.collection, event.id.replace('/index.mdx', '')),
        publicPath: path.join('/generated', event.collection, event.id.replace('/index.mdx', '')),
        type: 'event',
      },
    };
  });

  // order them by the name of the event
  cachedEvents[cacheKey].sort((a, b) => {
    return (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id);
  });

  return cachedEvents[cacheKey];
};
