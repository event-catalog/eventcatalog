import { getVersionForCollectionItem, getVersions } from '@utils/collections/util';
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';
// import { getEvents } from './events';
// import { getCommands } from './commands';

// import type { Service as ServiceInterface } from '../types/index'

export type Service = CollectionEntry<'services'>;

export const getVersion = (collection: CollectionEntry<'events' | 'commands'>[], id: string, version?: string) => {
  const data = collection;
  if (version) {
    return data.find((event) => event.data.version === version && event.data.id === id);
  }

  const filteredEvents = data.filter((event) => event.data.id === id);

  // Order by version
  const sorted = filteredEvents.sort((a, b) => {
    return a.data.version.localeCompare(b.data.version);
  });

  // latest version
  return sorted[sorted.length - 1];
};

interface Props {
  getAllVersions?: boolean;
}

export const getServices = async ({ getAllVersions = true }: Props = {}): Promise<Service[]> => {
  // Get services that are not versioned
  const services = await getCollection('services', (service) => {
    return (getAllVersions || !service.slug.includes('versioned')) && service.data.hidden !== true;
  });
  const events = await getCollection('events');
  const commands = await getCollection('commands');

  const allMessages = [...events, ...commands];

  // @ts-ignore // TODO: Fix this type
  return services.map((service) => {
    const { latestVersion, versions } = getVersionForCollectionItem(service, services);

    // const receives = service.data.receives || [];
    const sendsMessages = service.data.sends || [];
    const receivesMessages = service.data.receives || [];

    const sends = sendsMessages
      .map((message) => {
        const event = getVersion(allMessages, message.id, message.version);
        // const event = allMessages.find((_message) => _message.data.id === message.id && _message.data.version === message.version);
        return event;
      })
      .filter((e) => e !== undefined);

    const receives = receivesMessages
      .map((message) => {
        const event = getVersion(allMessages, message.id, message.version);
        // const event = allMessages.find((_message) => _message.data.id === message.id && _message.data.version === message.version);
        return event;
      })
      .filter((e) => e !== undefined);

    return {
      ...service,
      data: {
        ...service.data,
        receives,
        sends,
        versions,
        latestVersion,
      },
      nodes: {
        receives,
        sends,
      },
      catalog: {
        path: path.join(service.collection, service.id.replace('/index.mdx', '')),
        filePath: path.join(process.cwd(), 'src', 'catalog-files', service.collection, service.id.replace('/index.mdx', '')),
        publicPath: path.join('/generated', service.collection, service.id.replace('/index.mdx', '')),
        type: 'service',
      },
    };
  });
};
