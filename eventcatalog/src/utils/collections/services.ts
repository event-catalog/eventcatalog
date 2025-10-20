import { getItemsFromCollectionByIdAndSemverOrLatest, getVersionForCollectionItem } from '@utils/collections/util';
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';
import semver from 'semver';
import type { CollectionTypes } from '@types';
const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd();
import utils from '@eventcatalog/sdk';

export type Service = CollectionEntry<'services'>;

interface Props {
  getAllVersions?: boolean;
}

// Cache for build time
let cachedServices: Record<string, Service[]> = {
  allVersions: [],
  currentVersions: [],
};

export const getServices = async ({ getAllVersions = true }: Props = {}): Promise<Service[]> => {
  const cacheKey = getAllVersions ? 'allVersions' : 'currentVersions';

  // Check if we have cached domains for this specific getAllVersions value
  if (cachedServices[cacheKey].length > 0) {
    return cachedServices[cacheKey];
  }

  // Get services that are not versioned
  const services = await getCollection('services', (service) => {
    return (getAllVersions || !service.filePath?.includes('versioned')) && service.data.hidden !== true;
  });

  const events = await getCollection('events');
  const commands = await getCollection('commands');
  const queries = await getCollection('queries');
  const entities = await getCollection('entities');
  const containers = await getCollection('containers');
  const allMessages = [...events, ...commands, ...queries];

  // @ts-ignore // TODO: Fix this type
  cachedServices[cacheKey] = await Promise.all(
    services.map(async (service) => {
      const { latestVersion, versions } = getVersionForCollectionItem(service, services);

      const sendsMessages = service.data.sends || [];
      const receivesMessages = service.data.receives || [];
      const serviceEntities = service.data.entities || [];
      const serviceWritesTo = service.data.writesTo || [];
      const serviceReadsFrom = service.data.readsFrom || [];

      const sends = sendsMessages
        .map((message: any) => getItemsFromCollectionByIdAndSemverOrLatest(allMessages, message.id, message.version))
        .flat()
        .filter((e: any) => e !== undefined);

      const receives = receivesMessages
        .map((message: any) => getItemsFromCollectionByIdAndSemverOrLatest(allMessages, message.id, message.version))
        .flat()
        .filter((e: any) => e !== undefined);

      const mappedEntities = serviceEntities
        .map((entity: any) => getItemsFromCollectionByIdAndSemverOrLatest(entities, entity.id, entity.version))
        .flat()
        .filter((e: any) => e !== undefined);

      const mappedWritesTo = serviceWritesTo
        .map((container: any) => getItemsFromCollectionByIdAndSemverOrLatest(containers, container.id, container.version))
        .flat()
        .filter((e: any) => e !== undefined);

      const mappedReadsFrom = serviceReadsFrom
        .map((container: any) => getItemsFromCollectionByIdAndSemverOrLatest(containers, container.id, container.version))
        .flat()
        .filter((e: any) => e !== undefined);

      const { getResourceFolderName } = utils(process.env.PROJECT_DIR ?? '');
      const folderName = await getResourceFolderName(
        process.env.PROJECT_DIR ?? '',
        service.data.id,
        service.data.version.toString()
      );
      const serviceFolderName = folderName ?? service.id.replace(`-${service.data.version}`, '');

      return {
        ...service,
        data: {
          ...service.data,
          writesTo: mappedWritesTo,
          readsFrom: mappedReadsFrom,
          receives,
          sends,
          versions,
          latestVersion,
          entities: mappedEntities,
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
          // service will be MySerive-0.0.1 remove the version
          publicPath: path.join('/generated', service.collection, serviceFolderName),
          type: 'service',
        },
      };
    })
  );

  // order them by the name of the service
  cachedServices[cacheKey].sort((a, b) => {
    return (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id);
  });

  return cachedServices[cacheKey];
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

export const getSpecificationsForService = (service: CollectionEntry<CollectionTypes>) => {
  const specifications = Array.isArray(service.data.specifications) ? service.data.specifications : [];

  if (service.data.specifications && !Array.isArray(service.data.specifications)) {
    if (service.data.specifications.asyncapiPath) {
      specifications.push({
        type: 'asyncapi',
        path: service.data.specifications.asyncapiPath,
        name: 'AsyncAPI',
      });
    }
    if (service.data.specifications.openapiPath) {
      specifications.push({
        type: 'openapi',
        path: service.data.specifications.openapiPath,
        name: 'OpenAPI',
      });
    }
  }

  return specifications.map((spec) => ({
    ...spec,
    name: spec.name || (spec.type === 'asyncapi' ? 'AsyncAPI' : 'OpenAPI'),
    filename: path.basename(spec.path),
    filenameWithoutExtension: path.basename(spec.path, path.extname(spec.path)),
  }));
};
// Get services for channel
export const getProducersAndConsumersForChannel = async (channel: CollectionEntry<'channels'>) => {
  const messages = channel.data.messages ?? [];
  const services = await getServices({ getAllVersions: false });

  const producers = services.filter((service) => {
    const sends = service.data.sends ?? [];
    return sends.some((send) => {
      // @ts-ignore
      return messages.some((m) => m.id === send.data.id);
    });
  });

  const consumers = services.filter((service) => {
    const receives = service.data.receives ?? [];
    return receives.some((receive) => {
      // @ts-ignore
      return messages.some((m) => m.id === receive.data.id);
    });
  });

  return {
    producers: producers ?? [],
    consumers: consumers ?? [],
  };
};
