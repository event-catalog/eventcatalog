import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';
import type { CollectionMessageTypes } from '@types';
import type { Service } from './types';
import utils from '@eventcatalog/sdk';
import { createVersionedMap, findInMap } from '@utils/collections/util';

const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd();
const CACHE_ENABLED = process.env.DISABLE_EVENTCATALOG_CACHE !== 'true';

export type Domain = CollectionEntry<'domains'>;
export type UbiquitousLanguage = CollectionEntry<'ubiquitousLanguages'>;

interface Props {
  getAllVersions?: boolean;
  includeServicesInSubdomains?: boolean;
  enrichServices?: boolean;
}

// Simple in-memory cache variable
let memoryCache: Record<string, Domain[]> = {};

// Helper to hydrate services
const hydrateServices = (
  servicesList: any[],
  serviceMap: Map<string, any[]>,
  messageMap: Map<string, any[]>,
  containerMap: Map<string, any[]>
) => {
  return servicesList
    .map((service: { id: string; version: string | undefined }) => findInMap(serviceMap, service.id, service.version))
    .filter((s) => !!s)
    .map((service) => {
      // Hydrate service messages and containers
      const sends = (service.data.sends || [])
        .map((msg: any) => findInMap(messageMap, msg.id, msg.version))
        .filter((m: any) => !!m);

      const receives = (service.data.receives || [])
        .map((msg: any) => findInMap(messageMap, msg.id, msg.version))
        .filter((m: any) => !!m);

      const readsFrom = (service.data.readsFrom || [])
        .map((c: any) => findInMap(containerMap, c.id, c.version))
        .filter((c: any) => !!c);

      const writesTo = (service.data.writesTo || [])
        .map((c: any) => findInMap(containerMap, c.id, c.version))
        .filter((c: any) => !!c);

      return {
        ...service,
        data: {
          ...service.data,
          sends: sends as any,
          receives: receives as any,
          readsFrom: readsFrom as any,
          writesTo: writesTo as any,
        },
      };
    });
};

// --- MAIN FUNCTION ---

export const getDomains = async ({
  getAllVersions = true,
  includeServicesInSubdomains = true,
  enrichServices = false,
}: Props = {}): Promise<Domain[]> => {
  // console.time('✅ New getDomains');

  const cacheKey = `${getAllVersions ? 'allVersions' : 'currentVersions'}-${includeServicesInSubdomains ? 'true' : 'false'}-${enrichServices ? 'enriched' : 'simple'}`;

  // Check cache
  if (memoryCache[cacheKey] && memoryCache[cacheKey].length > 0 && CACHE_ENABLED) {
    // console.timeEnd('✅ New getDomains');
    return memoryCache[cacheKey];
  }

  // 1. Fetch collections
  const collectionsToFetch: any[] = [
    getCollection('domains'),
    getCollection('services'),
    getCollection('entities'),
    getCollection('flows'),
  ];

  if (enrichServices) {
    collectionsToFetch.push(
      getCollection('events'),
      getCollection('commands'),
      getCollection('queries'),
      getCollection('containers')
    );
  }

  const results = await Promise.all(collectionsToFetch);
  const [allDomains, allServices, allEntities, allFlows] = results;

  let messageMap = new Map();
  let containerMap = new Map();

  if (enrichServices) {
    const [, , , , allEvents, allCommands, allQueries, allContainers] = results;
    const allMessages = [...allEvents, ...allCommands, ...allQueries];
    messageMap = createVersionedMap(allMessages);
    containerMap = createVersionedMap(allContainers);
  }

  // 2. Build optimized maps
  const domainMap = createVersionedMap(allDomains);
  const serviceMap = createVersionedMap(allServices);
  const entityMap = createVersionedMap(allEntities);
  const flowMap = createVersionedMap(allFlows);

  // 3. Filter the domains we actually want to process/return
  const targetDomains = allDomains.filter((domain: Domain) => {
    // Filter out hidden
    if (domain.data.hidden === true) return false;
    // Handle version filtering
    if (!getAllVersions && domain.filePath?.includes('versioned')) return false;
    return true;
  });

  const { getResourceFolderName } = utils(process.env.PROJECT_DIR ?? '');

  // 4. Process domains using Map lookups (O(1))
  const processedDomains = await Promise.all(
    targetDomains.map(async (domain: Domain) => {
      // Get version info from the map
      const domainVersions = domainMap.get(domain.data.id) || [];
      const latestVersion = domainVersions[0]?.data.version || domain.data.version;
      const versions = domainVersions.map((d) => d.data.version);

      // Resolve Subdomains
      const subDomainsInDomain = domain.data.domains || [];
      const subDomains = subDomainsInDomain
        .map((sd: { id: string; version: string | undefined }) => findInMap(domainMap, sd.id, sd.version))
        .filter((sd): sd is Domain => !!sd && sd.data.id !== domain.data.id) // Filter nulls and self-refs
        .map((subDomain: any) => {
          // Hydrate services for the subdomain
          let hydratedServices = subDomain.data.services || [];
          if (enrichServices) {
            hydratedServices = hydrateServices(subDomain.data.services || [], serviceMap, messageMap, containerMap);
          } else {
            // Just resolve the service objects without enrichment
            hydratedServices = (subDomain.data.services || [])
              .map((service: { id: string; version: string | undefined }) => findInMap(serviceMap, service.id, service.version))
              .filter((s: any) => !!s);
          }

          return {
            ...subDomain,
            data: {
              ...subDomain.data,
              services: hydratedServices as any,
            },
          };
        });

      // Resolve Entities
      const entitiesInDomain = domain.data.entities || [];
      const entities = entitiesInDomain
        .map((entity: { id: string; version: string | undefined }) => findInMap(entityMap, entity.id, entity.version))
        .filter((e): e is CollectionEntry<'entities'> => !!e);

      // Resolve Flows
      const flowsInDomain = domain.data.flows || [];
      const flows = flowsInDomain
        .map((flow: { id: string; version: string | undefined }) => findInMap(flowMap, flow.id, flow.version))
        .filter((f): f is CollectionEntry<'flows'> => !!f);

      // Resolve Services for Main Domain
      const servicesInDomain = domain.data.services || [];

      // Hydrate main domain services
      let hydratedMainServices = [];
      if (enrichServices) {
        hydratedMainServices = hydrateServices(servicesInDomain, serviceMap, messageMap, containerMap);
      } else {
        hydratedMainServices = servicesInDomain
          .map((service: { id: string; version: string | undefined }) => findInMap(serviceMap, service.id, service.version))
          .filter((s) => !!s);
      }

      // Get already-hydrated subdomain services
      const hydratedSubdomainServices = subDomains.flatMap((subDomain: any) => subDomain.data.services || []);

      const services = includeServicesInSubdomains
        ? [...(hydratedMainServices as any), ...(hydratedSubdomainServices as any)]
        : (hydratedMainServices as any);

      // Calculate folder paths
      const folderName = await getResourceFolderName(
        process.env.PROJECT_DIR ?? '',
        domain.data.id,
        domain.data.version?.toString()
      );
      const domainFolderName = folderName ?? domain.id.replace(`-${domain.data.version}`, '');

      return {
        ...domain,
        data: {
          ...domain.data,
          services: services as any, // Cast to avoid deep type issues with enriched data
          domains: subDomains as any,
          entities: entities as any,
          flows: flows as any,
          latestVersion,
          versions,
        },
        catalog: {
          path: path.join(domain.collection, domain.id.replace('/index.mdx', '')),
          absoluteFilePath: path.join(PROJECT_DIR, domain.collection, domain.id.replace('/index.mdx', '/index.md')),
          astroContentFilePath: path.join(process.cwd(), 'src', 'content', domain.collection, domain.id),
          filePath: path.join(process.cwd(), 'src', 'catalog-files', domain.collection, domain.id.replace('/index.mdx', '')),
          publicPath: path.join('/generated', domain.collection, domainFolderName),
          type: 'service',
        },
      };
    })
  );

  // Sort by name
  processedDomains.sort((a, b) => {
    return (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id);
  });

  // Cache result
  memoryCache[cacheKey] = processedDomains;

  // console.timeEnd('✅ New getDomains');

  return processedDomains;
};

export const getMessagesForDomain = async (
  domain: Domain
): Promise<{ sends: CollectionEntry<CollectionMessageTypes>[]; receives: CollectionEntry<CollectionMessageTypes>[] }> => {
  // We already have the services from the domain
  const services = domain.data.services as unknown as CollectionEntry<'services'>[];

  const [events, commands, queries] = await Promise.all([
    getCollection('events'),
    getCollection('commands'),
    getCollection('queries'),
  ]);

  const allMessages = [...events, ...commands, ...queries];
  const messageMap = createVersionedMap(allMessages);

  const sends = services.flatMap((service) => service.data.sends || []);
  const receives = services.flatMap((service) => service.data.receives || []);

  const sendsMessages = sends
    .map((send) => findInMap(messageMap, send.id, send.version))
    .filter((msg): msg is CollectionEntry<CollectionMessageTypes> => !!msg);

  const receivesMessages = receives
    .map((receive) => findInMap(messageMap, receive.id, receive.version))
    .filter((msg): msg is CollectionEntry<CollectionMessageTypes> => !!msg);

  return {
    sends: sendsMessages,
    receives: receivesMessages,
  };
};

export const getUbiquitousLanguage = async (domain: Domain): Promise<UbiquitousLanguage[]> => {
  const ubiquitousLanguages = await getCollection('ubiquitousLanguages', (ubiquitousLanguage: UbiquitousLanguage) => {
    const domainFolder = path.dirname(domain.filePath || '');
    const ubiquitousLanguageFolder = path.dirname(ubiquitousLanguage.filePath || '');
    return domainFolder === ubiquitousLanguageFolder;
  });

  return ubiquitousLanguages;
};

export const getUbiquitousLanguageWithSubdomains = async (
  domain: Domain
): Promise<{
  domain: UbiquitousLanguage | null;
  subdomains: Array<{ subdomain: Domain; ubiquitousLanguage: UbiquitousLanguage | null }>;
  duplicateTerms: Set<string>;
}> => {
  // Get domain's own ubiquitous language
  const domainUbiquitousLanguage = await getUbiquitousLanguage(domain);
  const domainUL = domainUbiquitousLanguage[0] || null;

  // Get all subdomains
  const subdomains = (domain.data.domains as unknown as Domain[]) || [];

  // Get ubiquitous language for each subdomain
  const subdomainULs = await Promise.all(
    subdomains.map(async (subdomain) => {
      const subdomainUL = await getUbiquitousLanguage(subdomain);
      return {
        subdomain,
        ubiquitousLanguage: subdomainUL[0] || null,
      };
    })
  );

  // Find duplicate terms across domain and subdomains
  const duplicateTerms = new Set<string>();
  const termCounts = new Map<string, number>();

  // Count terms from domain
  if (domainUL?.data?.dictionary) {
    domainUL.data.dictionary.forEach((term) => {
      const termName = term.name.toLowerCase();
      termCounts.set(termName, (termCounts.get(termName) || 0) + 1);
    });
  }

  // Count terms from subdomains
  subdomainULs.forEach(({ ubiquitousLanguage }) => {
    if (ubiquitousLanguage?.data?.dictionary) {
      ubiquitousLanguage.data.dictionary.forEach((term) => {
        const termName = term.name.toLowerCase();
        termCounts.set(termName, (termCounts.get(termName) || 0) + 1);
      });
    }
  });

  // Identify duplicates
  termCounts.forEach((count, termName) => {
    if (count > 1) {
      duplicateTerms.add(termName);
    }
  });

  return {
    domain: domainUL,
    subdomains: subdomainULs,
    duplicateTerms,
  };
};

export const getParentDomains = async (domain: Domain): Promise<Domain[]> => {
  const domains = await getDomains({ getAllVersions: false });
  return domains.filter((d) => {
    const subDomains = (d.data.domains as unknown as Domain[]) || [];
    return subDomains.some((d) => d.data.id === domain.data.id);
  });
};

// Only return domains that are not found any any subdomain configuration
export const getRootDomains = async (): Promise<Domain[]> => {
  const domains = await getDomains({ getAllVersions: false });
  const allSubDomains = domains.flatMap((d) => d.data.domains as unknown as Domain[]);
  return domains.filter((d) => !allSubDomains.some((sd) => sd.data.id === d.data.id));
};

export const getDomainsForService = async (service: Service): Promise<Domain[]> => {
  const domains = await getDomains({ getAllVersions: false });
  return domains.filter((d) => {
    const services = d.data.services as unknown as Service[];
    return services.some((s) => s.data.id === service.data.id);
  });
};

export const domainHasEntities = (domain: Domain): boolean => {
  return (domain.data.entities && domain.data.entities.length > 0) || false;
};
