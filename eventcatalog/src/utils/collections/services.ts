import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';
import semver from 'semver';
import type { CollectionMessageTypes, CollectionTypes } from '@types';
const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd();
import utils, { type Domain } from '@eventcatalog/sdk';
import { getDomains, getDomainsForService } from './domains';
import { createVersionedMap, findInMap } from '@utils/collections/util';

export type Service = CollectionEntry<'services'>;

const CACHE_ENABLED = process.env.DISABLE_EVENTCATALOG_CACHE !== 'true';
interface Props {
  getAllVersions?: boolean;
  returnBody?: boolean;
}

// Simple in-memory cache
let memoryCache: Record<string, Service[]> = {};

export const getServices = async ({ getAllVersions = true, returnBody = false }: Props = {}): Promise<Service[]> => {
  // console.time('✅ New getServices');
  const cacheKey = `${getAllVersions ? 'allVersions' : 'currentVersions'}-${returnBody ? 'withBody' : 'noBody'}`;

  // Check if we have cached services
  if (memoryCache[cacheKey] && memoryCache[cacheKey].length > 0 && CACHE_ENABLED) {
    // console.timeEnd('✅ New getServices');
    return memoryCache[cacheKey];
  }

  // 1. Fetch all collections in parallel
  const [allServices, allEvents, allCommands, allQueries, allEntities, allContainers, allFlows] = await Promise.all([
    getCollection('services'),
    getCollection('events'),
    getCollection('commands'),
    getCollection('queries'),
    getCollection('entities'),
    getCollection('containers'),
    getCollection('flows'),
  ]);

  const allMessages = [...allEvents, ...allCommands, ...allQueries];

  // 2. Build optimized maps
  const serviceMap = createVersionedMap(allServices);
  const messageMap = createVersionedMap(allMessages);
  const entityMap = createVersionedMap(allEntities);
  const containerMap = createVersionedMap(allContainers);
  const flowMap = createVersionedMap(allFlows);

  // 3. Filter services
  const targetServices = allServices.filter((service) => {
    if (service.data.hidden === true) return false;
    if (!getAllVersions && service.filePath?.includes('versioned')) return false;
    return true;
  });

  const { getResourceFolderName } = utils(process.env.PROJECT_DIR ?? '');

  // 4. Enrich services using Map lookups (O(1))
  const processedServices = await Promise.all(
    targetServices.map(async (service) => {
      // Version info
      const serviceVersions = serviceMap.get(service.data.id) || [];
      const latestVersion = serviceVersions[0]?.data.version || service.data.version;
      const versions = serviceVersions.map((s) => s.data.version);

      const sends = (service.data.sends || [])
        .map((m) => findInMap(messageMap, m.id, m.version))
        .filter((e): e is CollectionEntry<CollectionMessageTypes> => !!e);

      const receives = (service.data.receives || [])
        .map((m) => findInMap(messageMap, m.id, m.version))
        .filter((e): e is CollectionEntry<CollectionMessageTypes> => !!e);

      const mappedEntities = (service.data.entities || [])
        .map((e) => findInMap(entityMap, e.id, e.version))
        .filter((e): e is CollectionEntry<'entities'> => !!e);

      const mappedWritesTo = (service.data.writesTo || [])
        .map((c) => findInMap(containerMap, c.id, c.version))
        .filter((e): e is CollectionEntry<'containers'> => !!e);

      const mappedReadsFrom = (service.data.readsFrom || [])
        .map((c) => findInMap(containerMap, c.id, c.version))
        .filter((e): e is CollectionEntry<'containers'> => !!e);

      const mappedFlows = (service.data.flows || [])
        .map((f) => findInMap(flowMap, f.id, f.version))
        .filter((f): f is CollectionEntry<'flows'> => !!f);

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
          writesTo: mappedWritesTo as any,
          readsFrom: mappedReadsFrom as any,
          flows: mappedFlows as any,
          receives: receives as any,
          sends: sends as any,
          versions,
          latestVersion,
          entities: mappedEntities as any,
        },
        // TODO: verify if it could be deleted.
        nodes: {
          receives: receives as any,
          sends: sends as any,
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
        body: returnBody ? service.body : undefined,
      };
    })
  );

  // order them by the name of the service
  processedServices.sort((a, b) => {
    return (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id);
  });

  memoryCache[cacheKey] = processedServices;
  // console.timeEnd('✅ New getServices');

  return processedServices;
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
export const getServicesNotInAnyDomain = async (): Promise<Service[]> => {
  const services = await getServices({ getAllVersions: false });

  // We need an async-aware filter: run all lookups, then filter by the results
  const domainCountsForServices = await Promise.all(
    services.map(async (service) => {
      const domainsForService = await getDomainsForService(service);
      return domainsForService.length;
    })
  );

  return services.filter((_, index) => domainCountsForServices[index] === 0);
};
