import type { CollectionTypes, PageTypes } from '@types';
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

export const pageDataLoader: Record<PageTypes, () => Promise<CollectionEntry<CollectionTypes>[]>> = {
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
