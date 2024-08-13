import { getVersionForCollectionItem } from '@utils/collections/util';
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';
import { validRange, satisfies } from 'semver';

const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd();

export type Domain = CollectionEntry<'domains'>;

interface Props {
  getAllVersions?: boolean;
}

/**
 * Get the services from the collection with the same id that satisfies the
 * semver range (if version is defind) or the latest version (if version is not defined).
 */
export const getVersion = (
  collection: CollectionEntry<'services'>[],
  id: string,
  version?: string
): CollectionEntry<'services'>[] => {
  const semverRange = validRange(version);

  const filteredCollection = collection.filter((c) => c.data.id == id);

  if (semverRange) {
    return filteredCollection.filter((c) => satisfies(c.data.version, semverRange));
  }

  // Order by version
  const sorted = filteredCollection.sort((a, b) => {
    return a.data.version.localeCompare(b.data.version);
  });

  // latest version
  return sorted.length > 0 ? [sorted[sorted.length - 1]] : [];
};

export const getDomains = async ({ getAllVersions = true }: Props = {}): Promise<Domain[]> => {
  // Get all the domains that are not versioned
  const domains = await getCollection('domains', (domain) => {
    return (getAllVersions || !domain.slug.includes('versioned')) && domain.data.hidden !== true;
  });

  // Get all the services that are not versioned
  const servicesCollection = await getCollection('services');

  // @ts-ignore // TODO: Fix this type
  return domains.map((domain) => {
    const { latestVersion, versions } = getVersionForCollectionItem(domain, domains);

    // const receives = service.data.receives || [];
    const servicesInDomain = domain.data.services || [];

    const services = servicesInDomain.map((_service) => getVersion(servicesCollection, _service.id, _service.version)).flat();

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
        filePath: path.join(process.cwd(), 'src', 'catalog-files', domain.collection, domain.id.replace('/index.mdx', '')),
        publicPath: path.join('/generated', domain.collection, domain.id.replace('/index.mdx', '')),
        type: 'service',
      },
    };
  });
};
