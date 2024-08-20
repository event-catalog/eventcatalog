import { getVersionForCollectionItem } from '@utils/collections/util';
import { getVersionFromCollection } from '@utils/versions/versions';
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';

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

  const allMessages = [...events, ...commands];

  // @ts-ignore // TODO: Fix this type
  return services.map((service) => {
    const { latestVersion, versions } = getVersionForCollectionItem(service, services);

    const sendsMessages = service.data.sends || [];
    const receivesMessages = service.data.receives || [];

    const sends = sendsMessages
      .map((message) => getVersionFromCollection(allMessages, message.id, message.version))
      .flat()
      .filter((e) => e !== undefined);

    const receives = receivesMessages
      .map((message) => getVersionFromCollection(allMessages, message.id, message.version))
      .flat()
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
        absoluteFilePath: path.join(PROJECT_DIR, service.collection, service.id.replace('/index.mdx', '/index.md')),
        filePath: path.join(process.cwd(), 'src', 'catalog-files', service.collection, service.id.replace('/index.mdx', '')),
        publicPath: path.join('/generated', service.collection, service.id.replace('/index.mdx', '')),
        type: 'service',
      },
    };
  });
};
