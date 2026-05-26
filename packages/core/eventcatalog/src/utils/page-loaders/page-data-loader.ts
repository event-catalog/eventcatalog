import type { CollectionTypes, PageTypes } from '@types';
import { getAgents } from '@utils/collections/agents';
import { getChannels } from '@utils/collections/channels';
import { getDomains } from '@utils/collections/domains';
import { getCommands, getEvents } from '@utils/collections/messages';
import { getQueries } from '@utils/collections/queries';
import { getServices } from '@utils/collections/services';
import { getFlows } from '@utils/collections/flows';
import { getEntities } from '@utils/collections/entities';
import { getContainers } from '@utils/collections/containers';
import { getDiagrams } from '@utils/collections/diagrams';
import type { CollectionEntry } from 'astro:content';
import { getDataProducts } from '@utils/collections/data-products';
import { getAdrs } from '@utils/collections/adrs';

type PageDataLoaderOptions = { getAllVersions?: boolean };

export const pageDataLoader: Record<PageTypes, (options?: PageDataLoaderOptions) => Promise<CollectionEntry<CollectionTypes>[]>> =
  {
    agents: getAgents,
    adrs: getAdrs,
    events: getEvents,
    commands: getCommands,
    queries: getQueries,
    services: getServices,
    domains: getDomains,
    channels: getChannels,
    flows: getFlows,
    entities: getEntities,
    containers: getContainers,
    diagrams: getDiagrams,
    'data-products': getDataProducts,
  };
