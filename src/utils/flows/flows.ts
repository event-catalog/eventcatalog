import { getVersionForCollectionItem, getVersions } from '@utils/collections/util';
import { getVersion } from '@utils/services/services';
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';

const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd();

export type Flow = CollectionEntry<'flows'>;

interface Props {
  getAllVersions?: boolean;
}

export const getFlows = async ({ getAllVersions = true }: Props = {}): Promise<Flow[]> => {
  // Get flows that are not versioned
  const flows = await getCollection('flows', (flow) => {
    return (getAllVersions || !flow.slug.includes('versioned')) && flow.data.hidden !== true;
  });

  const events = await getCollection('events');
  const commands = await getCollection('commands');

  const allMessages = [...events, ...commands];

  // @ts-ignore // TODO: Fix this type
  return flows.map((flow) => {
    // @ts-ignore
    const { latestVersion, versions } = getVersionForCollectionItem(flow, flows);
    const steps = flow.data.steps || [];

    const hydrateSteps = steps.map((step) => {
      if (!step.message) return { ...flow, data: { ...flow.data, type: 'node' } };
      const message = getVersion(allMessages, step.message.id, step.message.version);
      return {
        ...step,
        type: 'message',
        message: message,
      };
    });

    return {
      ...flow,
      data: {
        ...flow.data,
        steps: hydrateSteps,
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
