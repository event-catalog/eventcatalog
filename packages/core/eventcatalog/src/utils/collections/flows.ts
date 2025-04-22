import { getItemsFromCollectionByIdAndSemverOrLatest, getVersionForCollectionItem } from '@utils/collections/util';
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';

const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd();

export type Flow = CollectionEntry<'flows'>;

interface Props {
  getAllVersions?: boolean;
}

// Cache for build time
let cachedFlows: Record<string, Flow[]> = {
  allVersions: [],
  currentVersions: [],
};

export const getFlows = async ({ getAllVersions = true }: Props = {}): Promise<Flow[]> => {
  const cacheKey = getAllVersions ? 'allVersions' : 'currentVersions';

  if (cachedFlows[cacheKey].length > 0) {
    return cachedFlows[cacheKey];
  }

  // Get flows that are not versioned
  const flows = await getCollection('flows', (flow) => {
    return (getAllVersions || !flow.filePath?.includes('versioned')) && flow.data.hidden !== true;
  });

  const events = await getCollection('events');
  const commands = await getCollection('commands');

  const allMessages = [...events, ...commands];

  // @ts-ignore // TODO: Fix this type
  cachedFlows[cacheKey] = flows.map((flow) => {
    // @ts-ignore
    const { latestVersion, versions } = getVersionForCollectionItem(flow, flows);
    const steps = flow.data.steps || [];

    const hydrateSteps = steps.map((step) => {
      if (!step.message) return { ...flow, data: { ...flow.data, type: 'node' } };
      const message = getItemsFromCollectionByIdAndSemverOrLatest(allMessages, step.message.id, step.message.version);
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
        astroContentFilePath: path.join(process.cwd(), 'src', 'content', flow.collection, flow.id),
        filePath: path.join(process.cwd(), 'src', 'catalog-files', flow.collection, flow.id.replace('/index.mdx', '')),
        publicPath: path.join('/generated', flow.collection),
        type: 'flow',
      },
    };
  });

  // order them by the name of the flow
  cachedFlows[cacheKey].sort((a, b) => {
    return (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id);
  });

  return cachedFlows[cacheKey];
};
