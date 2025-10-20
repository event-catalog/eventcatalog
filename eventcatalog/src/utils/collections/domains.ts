import { getItemsFromCollectionByIdAndSemverOrLatest, getVersionForCollectionItem } from '@utils/collections/util';
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';
import type { CollectionMessageTypes } from '@types';
import type { Service } from './services';
import utils from '@eventcatalog/sdk';

const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd();

export type Domain = CollectionEntry<'domains'>;
export type UbiquitousLanguage = CollectionEntry<'ubiquitousLanguages'>;
interface Props {
  getAllVersions?: boolean;
}

// Update cache to store both versions
let cachedDomains: Record<string, Domain[]> = {
  allVersions: [],
  currentVersions: [],
};

export const getDomains = async ({ getAllVersions = true }: Props = {}): Promise<Domain[]> => {
  const cacheKey = getAllVersions ? 'allVersions' : 'currentVersions';

  // Check if we have cached domains for this specific getAllVersions value
  if (cachedDomains[cacheKey].length > 0) {
    return cachedDomains[cacheKey];
  }

  // Get all the domains that are not versioned
  const domains = await getCollection('domains', (domain) => {
    return (getAllVersions || !domain.filePath?.includes('versioned')) && domain.data.hidden !== true;
  });

  // Get all the services that are not versioned
  const servicesCollection = await getCollection('services');
  const entitiesCollection = await getCollection('entities');

  // @ts-ignore // TODO: Fix this type
  cachedDomains[cacheKey] = await Promise.all(
    domains.map(async (domain) => {
      const { latestVersion, versions } = getVersionForCollectionItem(domain, domains);

      // const receives = service.data.receives || [];
      const servicesInDomain = domain.data.services || [];
      const subDomainsInDomain = domain.data.domains || [];
      const entitiesInDomain = domain.data.entities || [];
      const subDomains = subDomainsInDomain
        .map((_subDomain: { id: string; version: string | undefined }) =>
          getItemsFromCollectionByIdAndSemverOrLatest(domains, _subDomain.id, _subDomain.version)
        )
        .flat()
        // Stop circular references
        .filter((subDomain) => subDomain.data.id !== domain.data.id);

      // Services in the sub domains
      const subdomainServices = subDomains.flatMap((subDomain) => subDomain.data.services || []);

      const services = [...servicesInDomain, ...subdomainServices]
        .map((_service: { id: string; version: string | undefined }) =>
          getItemsFromCollectionByIdAndSemverOrLatest(servicesCollection, _service.id, _service.version)
        )
        .flat();

      const entities = [...entitiesInDomain]
        .map((_entity: { id: string; version: string | undefined }) =>
          getItemsFromCollectionByIdAndSemverOrLatest(entitiesCollection, _entity.id, _entity.version)
        )
        .flat();

      const { getResourceFolderName } = utils(process.env.PROJECT_DIR ?? '');
      const folderName = await getResourceFolderName(
        process.env.PROJECT_DIR ?? '',
        domain.data.id,
        domain.data.version.toString()
      );
      const domainFolderName = folderName ?? domain.id.replace(`-${domain.data.version}`, '');

      return {
        ...domain,
        data: {
          ...domain.data,
          services: services,
          domains: subDomains,
          entities: entities,
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

  // order them by the name of the domain
  cachedDomains[cacheKey].sort((a, b) => {
    return (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id);
  });

  return cachedDomains[cacheKey];
};

export const getMessagesForDomain = async (
  domain: Domain
): Promise<{ sends: CollectionEntry<CollectionMessageTypes>[]; receives: CollectionEntry<CollectionMessageTypes>[] }> => {
  // We already have the services from the domain
  const services = domain.data.services as unknown as CollectionEntry<'services'>[];

  const events = await getCollection('events');
  const commands = await getCollection('commands');
  const queries = await getCollection('queries');

  const allMessages = [...events, ...commands, ...queries];

  const sends = services.flatMap((service) => service.data.sends || []);
  const receives = services.flatMap((service) => service.data.receives || []);

  const sendsMessages = sends.map((send) => getItemsFromCollectionByIdAndSemverOrLatest(allMessages, send.id, send.version));
  const receivesMessages = receives.map((receive) =>
    getItemsFromCollectionByIdAndSemverOrLatest(allMessages, receive.id, receive.version)
  );

  return {
    sends: sendsMessages.flat(),
    receives: receivesMessages.flat(),
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
