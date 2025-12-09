import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';
import { createVersionedMap, findInMap } from '@utils/collections/util';
import { getDomains } from './domains';
import { getServices } from './services';

const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd();
const CACHE_ENABLED = process.env.DISABLE_EVENTCATALOG_CACHE !== 'true';
export type Flow = CollectionEntry<'flows'>;

interface Props {
  getAllVersions?: boolean;
}

// Cache for build time
let memoryCache: Record<string, Flow[]> = {};

export const getFlows = async ({ getAllVersions = true }: Props = {}): Promise<Flow[]> => {
  // console.time('✅ New getFlows');
  const cacheKey = getAllVersions ? 'allVersions' : 'currentVersions';

  if (memoryCache[cacheKey] && memoryCache[cacheKey].length > 0 && CACHE_ENABLED) {
    // console.timeEnd('✅ New getFlows');
    return memoryCache[cacheKey];
  }

  // 1. Fetch collections in parallel
  const [allFlows, allEvents, allCommands] = await Promise.all([
    getCollection('flows'),
    getCollection('events'),
    getCollection('commands'),
  ]);

  const allMessages = [...allEvents, ...allCommands];

  // 2. Build optimized maps
  const flowMap = createVersionedMap(allFlows);
  const messageMap = createVersionedMap(allMessages);

  // 3. Filter flows
  const targetFlows = allFlows.filter((flow) => {
    if (flow.data.hidden === true) return false;
    if (!getAllVersions && flow.filePath?.includes('versioned')) return false;
    return true;
  });

  // 4. Enrich flows
  const processedFlows = targetFlows.map((flow) => {
    // Version info
    const flowVersions = flowMap.get(flow.data.id) || [];
    const latestVersion = flowVersions[0]?.data.version || flow.data.version;
    const versions = flowVersions.map((f) => f.data.version);

    const steps = flow.data.steps || [];

    const hydrateSteps = steps.map((step) => {
      if (!step.message) return { ...step, type: 'node' }; // Preserve existing step data for non-messages

      const message = findInMap(messageMap, step.message.id, step.message.version);

      return {
        ...step,
        type: 'message',
        message: message ? [message] : [], // Keep array structure for compatibility
      };
    });

    return {
      ...flow,
      data: {
        ...flow.data,
        steps: hydrateSteps as any, // Cast to match expected Flow step type
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
  processedFlows.sort((a, b) => {
    return (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id);
  });

  memoryCache[cacheKey] = processedFlows;
  // console.timeEnd('✅ New getFlows');

  return processedFlows;
};

export const getFlowsNotInAnyResource = async (): Promise<Flow[]> => {
  const [flows, domains, services] = await Promise.all([
    getFlows({ getAllVersions: false }),
    getDomains({ getAllVersions: false }),
    getServices({ getAllVersions: false }),
  ]);

  const flowsNotInAnyResource = flows.filter((flow) => {
    const domainsForFlow = domains.filter((domain) => domain.data.flows?.some((f: any) => f.id === flow.id));
    const servicesForFlow = services.filter((service) => service.data.flows?.some((f: any) => f.id === flow.id));
    return domainsForFlow.length === 0 && servicesForFlow.length === 0;
  });
  return flowsNotInAnyResource;
};
