import { getItemsFromCollectionByIdAndSemverOrLatest, getVersionForCollectionItem } from '@utils/collections/util';
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';

const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd();

export type Domain = CollectionEntry<'domains'>;
export type UbiquitousLanguage = CollectionEntry<'ubiquitousLanguages'>;
interface Props {
  getAllVersions?: boolean;
}

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

    const services = servicesInDomain
      .map((_service: { id: string; version: string | undefined; }) => getItemsFromCollectionByIdAndSemverOrLatest(servicesCollection, _service.id, _service.version))
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
};

export const getUbiquitousLanguage = async (domain: Domain): Promise<UbiquitousLanguage[]> => {
  const { collection, data, slug } = domain;

  const allUbiquitousLanguages = await getCollection('ubiquitousLanguages');
  console.log('allUbiquitousLanguages', allUbiquitousLanguages, collection, slug, data.name);

  const ubiquitousLanguages = await getCollection('ubiquitousLanguages', (ubiquitousLanguage) => {
    return ubiquitousLanguage.id.includes(`${collection}/${data.name}`);
  });

  return ubiquitousLanguages;
};
