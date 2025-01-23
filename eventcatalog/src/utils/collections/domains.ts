import { getItemsFromCollectionByIdAndSemverOrLatest, getVersionForCollectionItem } from '@utils/collections/util';
import { posixifyPath, removeBase, removeLeadingForwardSlash } from '@utils/path';
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'node:path';

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
    return (getAllVersions || !domain.data?.pathToFile?.includes('versioned')) && domain.data.hidden !== true;
  });

  // Get all the services that are not versioned
  const servicesCollection = await getCollection('services');

  // @ts-ignore // TODO: Fix this type
  cachedDomains[cacheKey] = domains.map((domain) => {
    const { latestVersion, versions } = getVersionForCollectionItem(domain, domains);

    // const receives = service.data.receives || [];
    const servicesInDomain = domain.data.services || [];

    const services = servicesInDomain
      .map((_service: { id: string; version: string | undefined }) =>
        getItemsFromCollectionByIdAndSemverOrLatest(servicesCollection, _service.id, _service.version)
      )
      .flat();

    return {
      ...domain,
      data: {
        ...domain.data,
        services,
        latestVersion,
        versions,
      },
      catalog: {
        path: path.join(domain.collection, domain.id.replace('/index.mdx', '')),
        absoluteFilePath: path.join(PROJECT_DIR, domain.collection, domain.id.replace('/index.mdx', '/index.md')),
        astroContentFilePath: path.join(process.cwd(), 'src', 'content', domain.collection, domain.id),
        filePath: path.join(process.cwd(), 'src', 'catalog-files', domain.collection, domain.id.replace('/index.mdx', '')),
        publicPath: path.join('/generated', domain.collection, domain.id.replace('/index.mdx', '')),
        type: 'service',
      },
    };
  });

  // order them by the name of the domain
  cachedDomains[cacheKey].sort((a, b) => {
    return (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id);
  });

  return cachedDomains[cacheKey];
};

export const getUbiquitousLanguage = async (domain: Domain): Promise<UbiquitousLanguage[]> => {
  const ubiquitousLanguages = await getCollection('ubiquitousLanguages', (ubiquitousLanguage: UbiquitousLanguage) => {
    return ubiquitousLanguage.slug.startsWith(`${domain.collection}/${domain.slug}`);
  });

  return ubiquitousLanguages;
};

/**
 * Extracts the domain reference ID from a given file path.
 *
 * This function processes a file path to identify the domain and versioning structure
 * of the file within the project directory. It generates a reference ID for the domain,
 * which points to the corresponding `index.mdx` file.
 *
 * ### Examples:
 * - Input: `/domains/Orders/services/InventoryService/events/PaymentProcessed/index.md`
 *   Output: `Orders/index.mdx`
 *
 * - Input: `/domains/Orders/versioned/0.1.0/services/InventoryService/events/PaymentProcessed/index.md`
 *   Output: `Orders/versioned/0.1.0/index.mdx`
 *
 * @param pathToFile - The file path to process. This can be absolute or relative.
 * @returns A string representing the domain reference ID (`<domain>/index.mdx`
 *          or `<domain>/versioned/<version>/index.mdx`), or `null` if the path
 *          does not belong to a valid domain structure.
 */
export function getDomainRefIdFromPathToFile(pathToFile: string) {
  const projectDir = path.resolve(PROJECT_DIR);
  const absolutePathToFile = path.isAbsolute(pathToFile) ? pathToFile : path.resolve(pathToFile);

  const filePath = removeBase(posixifyPath(absolutePathToFile), posixifyPath(projectDir));

  const parts = removeLeadingForwardSlash(filePath).split('/');

  if (parts[0] !== 'domains') {
    // Not in nested folders; Unable to identify the domain
    return null;
  }

  const domain = parts[1]; // The domain is always the second part.
  const isDomainVersioned = parts[2] === 'versioned';

  if (isDomainVersioned) {
    const version = parts[3];
    return `${domain}/versioned/${version}/index.mdx`;
  }

  return `${domain}/index.mdx`;
}
