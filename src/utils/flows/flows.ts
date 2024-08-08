import { getVersionForCollectionItem, getVersions } from '@utils/collections/util';
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';

const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd();

export type Flow = CollectionEntry<'flows'>;

// export const getVersion = (collection: CollectionEntry<'events' | 'commands'>[], id: string, version?: string) => {
//   const data = collection;
//   if (version) {
//     return data.find((event) => event.data.version === version && event.data.id === id);
//   }

//   const filteredEvents = data.filter((event) => event.data.id === id);

//   // Order by version
//   const sorted = filteredEvents.sort((a, b) => {
//     return a.data.version.localeCompare(b.data.version);
//   });

//   // latest version
//   return sorted[sorted.length - 1];
// };

interface Props {
  getAllVersions?: boolean;
}

export const getFlows = async ({ getAllVersions = true }: Props = {}): Promise<Flow[]> => {
  // Get flows that are not versioned
  const flows = await getCollection('flows', (flow) => {
    return (getAllVersions || !flow.slug.includes('versioned')) && flow.data.hidden !== true;
  });


  // const events = await getCollection('events');
  // const commands = await getCollection('commands');

  // const allMessages = [...events, ...commands];

  // @ts-ignore // TODO: Fix this type
  return flows.map((flow) => {
    // @ts-ignore
    const { latestVersion, versions } = getVersionForCollectionItem(flow, flows);

    // // const receives = service.data.receives || [];
    // const sendsMessages = service.data.sends || [];
    // const receivesMessages = service.data.receives || [];

    // const sends = sendsMessages
    //   .map((message) => {
    //     const event = getVersion(allMessages, message.id, message.version);
    //     // const event = allMessages.find((_message) => _message.data.id === message.id && _message.data.version === message.version);
    //     return event;
    //   })
    //   .filter((e) => e !== undefined);

    // const receives = receivesMessages
    //   .map((message) => {
    //     const event = getVersion(allMessages, message.id, message.version);
    //     // const event = allMessages.find((_message) => _message.data.id === message.id && _message.data.version === message.version);
    //     return event;
    //   })
    //   .filter((e) => e !== undefined);

    return {
      ...flow,
      data: {
        ...flow.data,
        versions,
        latestVersion,
      },
      catalog: {
        path: path.join(flow.collection, flow.id.replace('/index.mdx', '')),
        absoluteFilePath: path.join(PROJECT_DIR, flow.collection, flow.id.replace('/index.mdx', '/index.md')),
        filePath: path.join(process.cwd(), 'src', 'catalog-files', flow.collection, flow.id.replace('/index.mdx', '')),
        publicPath: path.join('/generated', flow.collection, flow.id.replace('/index.mdx', '')),
        type: 'flow',
      },
    };
  });
};
