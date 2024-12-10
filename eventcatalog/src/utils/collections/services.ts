import { getItemsFromCollectionByIdAndSemverOrLatest, getVersionForCollectionItem } from '@utils/collections/util';
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';
import semver from 'semver';

const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd();

export type Service = CollectionEntry<'services'>;

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
  const queries = await getCollection('queries');

  const allMessages = [...events, ...commands, ...queries];

  // @ts-ignore // TODO: Fix this type
  return services.map((service) => {
    const { latestVersion, versions } = getVersionForCollectionItem(service, services);

    const sendsMessages = service.data.sends || [];
    const receivesMessages = service.data.receives || [];

    const sends = sendsMessages
      .map((message: any) => getItemsFromCollectionByIdAndSemverOrLatest(allMessages, message.id, message.version))
      .flat()
      .filter((e: any) => e !== undefined);

    const receives = receivesMessages
      .map((message: any) => getItemsFromCollectionByIdAndSemverOrLatest(allMessages, message.id, message.version))
      .flat()
      .filter((e: any) => e !== undefined);

    return {
      ...service,
      data: {
        ...service.data,
        receives,
        sends,
        versions,
        latestVersion,
      },
      // TODO: verify if it could be deleted.
      nodes: {
        receives,
        sends,
      },
      catalog: {
        // TODO: avoid use string replace at path due to win32
        path: path.join(service.collection, service.id.replace('/index.mdx', '')),
        absoluteFilePath: path.join(PROJECT_DIR, service.collection, service.id.replace('/index.mdx', '/index.md')),
        astroContentFilePath: path.join(process.cwd(), 'src', 'content', service.collection, service.id),
        filePath: path.join(process.cwd(), 'src', 'catalog-files', service.collection, service.id.replace('/index.mdx', '')),
        publicPath: path.join('/generated', service.collection, service.id.replace('/index.mdx', '')),
        type: 'service',
      },
    };
  });
};

export const getProducersOfMessage = (services: Service[], message: CollectionEntry<'events' | 'commands' | 'queries'>) => {
  return services.filter((service) => {
    return service.data.sends?.some((send) => {
      const idMatch = send.id === message.data.id;

      // If no version specified in send, treat as 'latest'
      if (!send.version) return idMatch;

      // If version is 'latest', match any version
      if (send.version === 'latest') return idMatch;

      // Use semver to compare versions
      return idMatch && semver.satisfies(message.data.version, send.version);
    });
  });
};

export const getConsumersOfMessage = (services: Service[], message: CollectionEntry<'events' | 'commands' | 'queries'>) => {
  return services.filter((service) => {
    return service.data.receives?.some((receive) => {
      const idMatch = receive.id === message.data.id;

      // If no version specified in send, treat as 'latest'
      if (!receive.version) return idMatch;

      // If version is 'latest', match any version
      if (receive.version === 'latest') return idMatch;

      // Use semver to compare versions
      return idMatch && semver.satisfies(message.data.version, receive.version);
    });
  });
};
